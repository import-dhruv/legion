"""Isolated per-project workspaces and sandboxed command execution."""
from __future__ import annotations

import asyncio
import json
import os
import resource
import shutil
import subprocess
from pathlib import Path

from app.core.config import settings
from app.observability.events import logger
from app.security.guards import clean_environment, safe_path, validate_command


class WorkspaceManager:
    def __init__(self, root: Path | None = None):
        self.root = Path(root or settings.workspace_root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def path_for(self, project_id: str) -> Path:
        p = (self.root / project_id).resolve()
        if self.root not in p.parents:
            raise ValueError("Invalid project id")
        return p

    def ensure(self, project_id: str) -> Path:
        p = self.path_for(project_id)
        p.mkdir(parents=True, exist_ok=True)
        git_dir = p / ".git"
        if not git_dir.exists():
            subprocess.run(["git", "init", "-q"], cwd=p, check=False, capture_output=True)
            subprocess.run(["git", "config", "user.email", "agent@aise.local"], cwd=p, check=False, capture_output=True)
            subprocess.run(["git", "config", "user.name", "AI-SE Agent"], cwd=p, check=False, capture_output=True)
        return p

    def read(self, project_id: str, relative: str) -> str:
        path = safe_path(self.path_for(project_id), relative)
        return path.read_text(errors="replace")[: settings.max_command_output_chars]

    def write(self, project_id: str, relative: str, content: str) -> str:
        path = safe_path(self.path_for(project_id), relative)
        if path.exists() and path.is_dir():
            raise ValueError("Target is a directory")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return f"Wrote {relative} ({len(content)} chars)"

    def list_files(self, project_id: str, relative: str = ".") -> list[str]:
        base = safe_path(self.path_for(project_id), relative)
        if not base.exists():
            return []
        out = []
        for p in base.rglob("*"):
            if ".git" in p.parts or "__pycache__" in p.parts or "node_modules" in p.parts:
                continue
            out.append(str(p.relative_to(self.path_for(project_id))))
        return sorted(out)[:1000]

    def snapshot(self, project_id: str, message: str) -> str:
        ws = self.ensure(project_id)
        subprocess.run(["git", "add", "-A"], cwd=ws, check=False, capture_output=True)
        r = subprocess.run(["git", "commit", "-q", "-m", message], cwd=ws, capture_output=True, text=True)
        return "committed" if r.returncode == 0 else (r.stderr.strip() or "nothing to commit")

    def history(self, project_id: str, limit: int = 20) -> list[str]:
        ws = self.path_for(project_id)
        if not (ws / ".git").exists():
            return []
        r = subprocess.run(["git", "log", "--oneline", f"-n{limit}"], cwd=ws, capture_output=True, text=True)
        return r.stdout.strip().splitlines()

    def remove_workspace(self, project_id: str) -> None:
        shutil.rmtree(self.path_for(project_id), ignore_errors=True)


class ShellExecutor:
    """Allowlisted subprocess execution with timeout, output caps and secret-free env."""

    def __init__(self, workspaces: WorkspaceManager):
        self.workspaces = workspaces

    async def run(self, project_id: str, command: str, timeout: int | None = None) -> dict:
        ws = self.workspaces.ensure(project_id)
        ok, reason = validate_command(command, ws)
        if not ok:
            return {"exit_code": 126, "stdout": "", "stderr": reason, "command": command}
        timeout = min(timeout or settings.command_timeout_seconds, settings.command_timeout_seconds)
        logger.info("shell[%s]: %s", project_id[:8], command[:200])
        try:
            proc = await asyncio.create_subprocess_shell(
                command, cwd=ws, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
                env=clean_environment(),
                preexec_fn=self._limits,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"exit_code": 124, "stdout": "", "stderr": f"Command timed out after {timeout}s", "command": command}
        except Exception as exc:
            return {"exit_code": 127, "stdout": "", "stderr": str(exc), "command": command}
        cap = settings.max_command_output_chars
        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode(errors="replace")[:cap],
            "stderr": stderr.decode(errors="replace")[:cap],
            "command": command,
        }

    @staticmethod
    def _limits():
        try:
            cpu = settings.command_timeout_seconds + 5
            resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu))
            mem = settings.sandbox_memory_mb * 1024 * 1024 * 2
            resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
        except (ValueError, OSError):
            pass


class DockerSandbox:
    """Optional stronger isolation. Used when SANDBOX_MODE=docker and the daemon is reachable."""

    def __init__(self, workspaces: WorkspaceManager):
        self.workspaces = workspaces

    async def available(self) -> bool:
        if settings.sandbox_mode == "local":
            return False
        try:
            p = await asyncio.create_subprocess_exec("docker", "info", stdout=asyncio.subprocess.DEVNULL,
                                                      stderr=asyncio.subprocess.DEVNULL)
            return await p.wait() == 0
        except FileNotFoundError:
            return False

    async def run(self, project_id: str, command: str, timeout: int | None = None) -> dict:
        ok, reason = validate_command(command, self.workspaces.path_for(project_id))
        if not ok:
            return {"exit_code": 126, "stdout": "", "stderr": reason, "command": command}
        ws = self.workspaces.ensure(project_id)
        timeout = min(timeout or settings.command_timeout_seconds, settings.command_timeout_seconds)
        cmd = [
            "docker", "run", "--rm", "--network", "none", "--init",
            "--memory", f"{settings.sandbox_memory_mb}m",
            "--cpus", str(settings.sandbox_cpu_quota),
            "-v", f"{ws}:/workspace", "-w", "/workspace",
            settings.sandbox_image, "sh", "-c", command,
        ]
        try:
            proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE,
                                                         stderr=asyncio.subprocess.PIPE)
            out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            return {"exit_code": 124, "stdout": "", "stderr": "Sandbox command timed out", "command": command}
        cap = settings.max_command_output_chars
        return {"exit_code": proc.returncode, "stdout": out.decode(errors="replace")[:cap],
                "stderr": err.decode(errors="replace")[:cap], "command": command, "sandbox": "docker"}


class ExecutionEnvironment:
    def __init__(self):
        self.workspaces = WorkspaceManager()
        self.local = ShellExecutor(self.workspaces)
        self.docker = DockerSandbox(self.workspaces)
        self._docker_ok: bool | None = None

    async def run(self, project_id: str, command: str, timeout: int | None = None) -> dict:
        if self._docker_ok is None:
            self._docker_ok = await self.docker.available()
        if self._docker_ok:
            return await self.docker.run(project_id, command, timeout)
        return await self.local.run(project_id, command, timeout)
