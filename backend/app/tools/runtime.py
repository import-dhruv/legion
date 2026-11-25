"""Real, permission-gated tools available to agents (files, shell, git, tests, browser)."""
from __future__ import annotations

import fnmatch
import json
from typing import Any

from app.agents.definitions import AgentDefinition
from app.core.config import settings
from app.execution.workspace import ExecutionEnvironment
from app.observability.events import audit, logger
from app.security.guards import UntrustedContent, scan_for_secrets

def _tool(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {"type": "function", "function": {
        "name": name, "description": description,
        "parameters": {"type": "object", "properties": properties, "required": required},
    }}


S = {"type": "string"}
TOOL_SCHEMAS = [
    _tool("file_write", "Create or overwrite a file in the project workspace",
          {"path": S, "content": S}, ["path", "content"]),
    _tool("file_read", "Read a file from the project workspace", {"path": S}, ["path"]),
    _tool("file_list", "List workspace files", {"path": S}, []),
    _tool("shell_run", "Run an allowlisted shell command in the sandbox", {"command": S}, ["command"]),
    _tool("git_commit", "Commit workspace changes", {"message": S}, ["message"]),
    _tool("run_tests", "Run the project test suite", {"command": S}, []),
    _tool("browser_screenshot", "Capture a screenshot of a local URL", {"url": S, "path": S}, ["url"]),
]


class ToolRuntime:
    def __init__(self, env: ExecutionEnvironment | None = None):
        self.env = env or ExecutionEnvironment()

    @staticmethod
    def _permitted(agent: AgentDefinition, name: str, path: str | None = None) -> str | None:
        perms = agent.tools or {}
        if name in {"file_write", "git_commit"} and not perms.get("write"):
            return f"Agent {agent.id} has no write permission"
        if name in {"shell_run", "run_tests", "git_commit"} and not perms.get("shell"):
            return f"Agent {agent.id} has no shell permission"
        if name == "browser_screenshot" and not perms.get("browser"):
            return f"Agent {agent.id} has no browser permission"
        if path and name in {"file_read", "file_write"}:
            patterns = perms.get("files") or []
            if not any(fnmatch.fnmatch(path, p) or fnmatch.fnmatch(path, p.rstrip("/**") + "/**")
                       for p in patterns):
                return f"Path {path} is outside agent {agent.id} file scope {patterns}"
        return None

    async def execute(self, agent: AgentDefinition, project_id: str, name: str,
                      arguments: dict[str, Any]) -> dict:
        reason = self._permitted(agent, name, arguments.get("path"))
        if reason:
            audit(agent.id, "tool_denied", name, {"reason": reason, "project": project_id})
            return {"ok": False, "error": reason}
        try:
            result = await self._dispatch(agent, project_id, name, arguments)
            audit(agent.id, "tool_call", name, {"project": project_id,
                  "args": {k: str(v)[:120] for k, v in arguments.items()}})
            return {"ok": True, **result}
        except Exception as exc:
            logger.exception("Tool %s failed", name)
            return {"ok": False, "error": str(exc)}

    async def _dispatch(self, agent, project_id, name, args) -> dict:
        ws = self.env.workspaces
        if name == "file_write":
            content = str(args.get("content", ""))
            hits = scan_for_secrets(content)
            if hits:
                return {"error": "Refusing to write file containing credential-like patterns"}
            return {"result": ws.write(project_id, args["path"], content)}
        if name == "file_read":
            return {"result": UntrustedContent(args["path"], ws.read(project_id, args["path"])).render()}
        if name == "file_list":
            return {"result": "\n".join(ws.list_files(project_id, args.get("path", "."))) or "(empty)"}
        if name == "shell_run":
            return {"result": await self.env.run(project_id, args["command"])}
        if name == "run_tests":
            command = args.get("command") or "python -m pytest -q"
            return {"result": await self.env.run(project_id, command)}
        if name == "git_commit":
            return {"result": ws.snapshot(project_id, args.get("message", "agent changes"))}
        if name == "browser_screenshot":
            if not settings.enable_browser:
                return {"error": "Browser automation is disabled"}
            return {"result": await self._screenshot(project_id, args["url"], args.get("path", "screenshots/page.png"))}
        return {"error": f"Unknown tool {name}"}

    async def _screenshot(self, project_id: str, url: str, path: str) -> dict:
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            return {"error": "Playwright is not installed"}
        ws = self.env.workspaces.ensure(project_id)
        target = ws / path
        target.parent.mkdir(parents=True, exist_ok=True)
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, timeout=15000)
            await page.screenshot(path=str(target), full_page=True)
            await browser.close()
        return {"result": f"Screenshot saved to {path}"}


def parse_tool_calls(content: str) -> list[dict]:
    """Agents may emit a JSON tool-call envelope; parse it defensively."""
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return []
    if isinstance(data, dict) and isinstance(data.get("tool_calls"), list):
        return [{"name": c.get("name"), "arguments": c.get("arguments", {})} for c in data["tool_calls"] if c.get("name")]
    return []
