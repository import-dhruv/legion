"""Database bootstrap and agent registry seeding."""
from __future__ import annotations

from app.agents.definitions import AGENTS
from app.core.db import engine, SessionLocal
from app.core.models import AgentRecord, Base


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        for a in AGENTS:
            row = db.get(AgentRecord, a.id)
            if not row:
                row = AgentRecord(id=a.id)
                db.add(row)
            row.name = a.name
            row.role = a.role
            row.department = a.department
            row.reports_to = a.reports_to
            row.level = a.level
            row.model_tier = a.model_tier
            row.permissions = a.tools
            row.system_prompt = a.prompt()
        db.commit()
