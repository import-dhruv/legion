"""Structured agent-to-agent message protocol and scoped context retrieval."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import or_

from app.core.db import SessionLocal
from app.core.models import Message, new_id
from app.observability.events import hub


class MessageBus:
    async def send(self, project_id: str, from_agent: str, to_agent: str, message_type: str,
                   content: dict[str, Any], task_id: str = "") -> dict:
        with SessionLocal() as db:
            msg = Message(id=new_id("msg_"), project_id=project_id, from_agent=from_agent,
                          to_agent=to_agent, message_type=message_type, task_id=task_id, content=content,
                          timestamp=datetime.now(timezone.utc))
            db.add(msg)
            db.commit()
            payload = self.to_dict(msg)
        await hub.publish(project_id, "message", f"{from_agent} → {to_agent}: {message_type}",
                          agent_id=from_agent, task_id=task_id, data={"content": content})
        return payload

    @staticmethod
    def to_dict(msg: Message) -> dict:
        return {"message_id": msg.id, "project_id": msg.project_id, "from_agent": msg.from_agent,
                "to_agent": msg.to_agent, "message_type": msg.message_type, "task_id": msg.task_id,
                "content": msg.content, "timestamp": msg.timestamp.isoformat()}

    def list_messages(self, project_id: str, limit: int = 200) -> list[dict]:
        with SessionLocal() as db:
            rows = db.query(Message).filter(Message.project_id == project_id).order_by(
                Message.timestamp.desc()).limit(limit).all()
            return [self.to_dict(r) for r in reversed(rows)]

    def relevant_for(self, project_id: str, agent_id: str, task_id: str = "", limit: int = 8) -> list[dict]:
        """Return only messages relevant to this agent/task -- not the whole history."""
        with SessionLocal() as db:
            q = db.query(Message).filter(Message.project_id == project_id)
            q = q.filter(or_(Message.to_agent == agent_id, Message.to_agent == "*",
                             Message.from_agent == agent_id))
            if task_id:
                q = q.filter(or_(Message.task_id == task_id, Message.task_id == ""))
            cutoff = datetime.now(timezone.utc) - timedelta(days=2)
            rows = q.filter(Message.timestamp >= cutoff).order_by(Message.timestamp.desc()).limit(limit).all()
            return [self.to_dict(r) for r in reversed(rows)]

    async def request(self, project_id: str, from_agent: str, to_agent: str, task_id: str,
                      question: str) -> dict:
        return await self.send(project_id, from_agent, to_agent, "technical_request",
                               {"question": question}, task_id)

    async def respond(self, project_id: str, from_agent: str, to_agent: str, task_id: str,
                      answer: str) -> dict:
        return await self.send(project_id, from_agent, to_agent, "response", {"answer": answer}, task_id)

    async def report_failure(self, project_id: str, from_agent: str, task_id: str, error: str) -> dict:
        return await self.send(project_id, from_agent, "engineering_manager", "failure_notification",
                               {"error": error[:2000]}, task_id)
