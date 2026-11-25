"""Human-in-the-loop approval gates with persistent decisions and audit trail."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import Approval, new_id
from app.observability.events import audit, hub


class ApprovalManager:
    async def request(self, project_id: str, request_type: str, requester: str,
                      description: str, payload: dict | None = None) -> dict:
        with SessionLocal() as db:
            approval = Approval(id=new_id("apv_"), project_id=project_id, request_type=request_type,
                                requester=requester, description=description, payload=payload or {},
                                status="pending")
            db.add(approval)
            db.commit()
            out = self.to_dict(approval)
        await hub.publish(project_id, "approval_requested", f"Approval required: {description}",
                          requester, data={"approval_id": out["id"], "type": request_type})
        audit(requester, "approval_requested", out["id"], {"type": request_type})
        return out

    @staticmethod
    def to_dict(a: Approval) -> dict:
        return {"id": a.id, "project_id": a.project_id, "request_type": a.request_type,
                "requester": a.requester, "description": a.description, "payload": a.payload,
                "status": a.status, "decided_by": a.decided_by,
                "decided_at": a.decided_at.isoformat() if a.decided_at else None,
                "created_at": a.created_at.isoformat()}

    def list(self, project_id: str | None = None, status: str | None = None) -> list[dict]:
        with SessionLocal() as db:
            q = db.query(Approval)
            if project_id:
                q = q.filter(Approval.project_id == project_id)
            if status:
                q = q.filter(Approval.status == status)
            return [self.to_dict(a) for a in q.order_by(Approval.created_at.desc()).limit(100).all()]

    def get(self, approval_id: str) -> dict | None:
        with SessionLocal() as db:
            a = db.get(Approval, approval_id)
            return self.to_dict(a) if a else None

    async def decide(self, approval_id: str, approved: bool, decided_by: str = "human") -> dict:
        with SessionLocal() as db:
            a = db.get(Approval, approval_id)
            if not a:
                raise KeyError(approval_id)
            if a.status != "pending":
                return self.to_dict(a)
            a.status = "approved" if approved else "rejected"
            a.decided_by = decided_by
            a.decided_at = datetime.now(timezone.utc)
            db.commit()
            out = self.to_dict(a)
        await hub.publish(a.project_id, "approval_decided",
                          f"Approval {out['status']}: {a.description}", decided_by,
                          data={"approval_id": approval_id, "approved": approved})
        audit(decided_by, "approval_decided", approval_id, {"approved": approved})
        return out

    async def wait_decision(self, approval_id: str, timeout: int | None = None) -> bool | None:
        """Wait for a human decision. None means timeout (project becomes resumable)."""
        timeout = timeout or settings.approval_timeout_seconds
        for _ in range(int(timeout * 2)):
            item = self.get(approval_id)
            if item and item["status"] != "pending":
                return item["status"] == "approved"
            await asyncio.sleep(0.5)
        return None
