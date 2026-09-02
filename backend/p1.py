"""P1 Creative Ops: approvals, BhuFix Clip, editor studio, ClockIN hours."""
from __future__ import annotations

import calendar
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from zoneinfo import ZoneInfo

import rbac
from clockin.attendance import summarize_day
from p3 import resource_snapshot

IST = ZoneInfo("Asia/Kolkata")

CLIP_CATEGORIES = (
    "educational", "lead_gen", "montage", "testimonial",
    "reveal", "bts", "collab", "other",
)
CLIP_STATUSES = ("draft", "in_review", "changes_requested", "approved", "handed_off")
APPROVAL_TYPES = ("asset", "clip")
APPROVAL_STATUSES = ("pending", "approved", "changes_requested", "cancelled")
HANDOFF_TO = ("editor", "smm")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _month_bounds():
    now = datetime.now(IST)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last = calendar.monthrange(now.year, now.month)[1]
    end = start.replace(day=last, hour=23, minute=59, second=59)
    return now, start, end, last


class ClipCreate(BaseModel):
    client_id: str
    title: str = Field(..., min_length=1, max_length=200)
    hook: str = ""
    body: str = ""
    cta: str = ""
    seo_keywords: str = ""
    category: str = "educational"
    task_id: Optional[str] = None
    calendar_event_id: Optional[str] = None


class ClipUpdate(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    body: Optional[str] = None
    cta: Optional[str] = None
    seo_keywords: Optional[str] = None
    category: Optional[str] = None
    handed_to: Optional[str] = None


class ApprovalCreate(BaseModel):
    type: str
    resource_id: str
    notes: str = ""


class ApprovalDecide(BaseModel):
    action: str  # approve | changes_requested | cancel
    notes: str = ""


class AssetMark(BaseModel):
    label: str = "final"


class ClockinLink(BaseModel):
    employee_id: str


def _norm_name(value: Optional[str]) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def create_p1_router(db, *, get_current_user, sanitize_input, logger) -> APIRouter:
    router = APIRouter()

    def _task_ok(status: str):
        from p0 import TASK_STATUSES
        if status not in TASK_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid task status")

    async def _public(doc: dict) -> dict:
        d = dict(doc)
        d.pop("_id", None)
        return d

    async def _lock_resource(kind: str, resource_id: str, client_id: str):
        if kind == "asset":
            await db.assets.update_one(
                {"id": resource_id},
                {"$set": {"locked": True, "bucket": "approved", "label": "final"}},
            )
        elif kind == "clip":
            await db.clips.update_one(
                {"id": resource_id},
                {"$set": {"locked": True, "status": "approved", "updated_at": _now()}},
            )

    async def _touch_task(task_id: Optional[str], status: Optional[str]):
        if not task_id or not status:
            return
        _task_ok(status)
        await db.tasks.update_one({"id": task_id}, {"$set": {"status": status, "updated_at": _now()}})

    async def clockin_hours_for(user: dict) -> dict:
        now, start, end, last = _month_bounds()
        empty = {
            "linked": False,
            "month": now.strftime("%Y-%m"),
            "worked_hours": 0,
            "days_present": 0,
            "employee_name": None,
            "employee_id": None,
            "hint": "Pick your ClockIN name once. After that, hours show here.",
            "candidates": [],
        }
        people = await db.clockin_employees.find(
            {"is_active": {"$ne": False}},
            {"_id": 0, "id": 1, "name": 1, "employee_code": 1, "email": 1, "phone": 1, "company_id": 1},
        ).to_list(200)

        emp = None
        linked_id = user.get("clockin_employee_id")
        if linked_id:
            emp = next((p for p in people if p.get("id") == linked_id), None)
            if not emp:
                emp = await db.clockin_employees.find_one(
                    {"id": linked_id, "is_active": {"$ne": False}},
                    {"_id": 0},
                )

        email = (user.get("email") or "").strip().lower()
        uname = _norm_name(user.get("name"))
        if not emp and email:
            emp = next((p for p in people if (p.get("email") or "").strip().lower() == email), None)
        if not emp and uname:
            exact = [p for p in people if _norm_name(p.get("name")) == uname]
            if len(exact) == 1:
                emp = exact[0]
        if not emp and uname:
            first = uname.split(" ")[0]
            if len(first) >= 3:
                firsts = [p for p in people if (_norm_name(p.get("name")).split(" ") or [""])[0] == first]
                if len(firsts) == 1:
                    emp = firsts[0]

        if emp and emp.get("id") and emp.get("id") != linked_id:
            await db.users.update_one({"id": user["id"]}, {"$set": {"clockin_employee_id": emp["id"]}})

        if not emp:
            empty["candidates"] = [
                {"id": p["id"], "name": p.get("name"), "employee_code": p.get("employee_code")}
                for p in people
            ]
            return empty

        company = await db.clockin_companies.find_one({"id": emp.get("company_id")}, {"_id": 0}) or {}
        punches = await db.clockin_punches.find(
            {
                "employee_id": emp["id"],
                "punched_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
            },
            {"_id": 0},
        ).to_list(4000)
        hours = 0.0
        present = 0
        for day in range(1, last + 1):
            day_s = f"{now.year:04d}-{now.month:02d}-{day:02d}"
            summary = summarize_day(punches, company, emp, day_s)
            h = float(summary.get("worked_hours") or 0)
            hours += h
            if summary.get("status") not in ("absent", None) and (h > 0 or summary.get("status") == "present"):
                present += 1
        return {
            "linked": True,
            "month": now.strftime("%Y-%m"),
            "worked_hours": round(hours, 2),
            "days_present": present,
            "employee_name": emp.get("name"),
            "employee_id": emp.get("id"),
            "hint": None,
            "candidates": [],
        }

    # ── Studio home ───────────────────────────────────────────────
    @router.get("/studio/home")
    async def studio_home(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "dashboard", "read")
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="Studio is internal")
        ids = rbac.accessible_client_ids(current_user)
        client_q = {} if ids is None else {"id": {"$in": ids or ["__none__"]}}
        clients = await db.clients.find(client_q, {"_id": 0, "id": 1, "name": 1, "industry": 1, "level": 1, "logo_url": 1, "logo_asset_id": 1}).sort("name", 1).to_list(100)
        task_q = {}
        rbac.apply_client_query(task_q, current_user)
        my_open = {**task_q, "owner_id": current_user["id"], "status": {"$nin": ["done", "cancelled"]}}
        deadlines = await db.tasks.find(my_open, {"_id": 0}).sort("deadline", 1).to_list(40)
        now, start, *_ = _month_bounds()
        done_q = {**task_q, "owner_id": current_user["id"], "status": "done", "updated_at": {"$gte": start.isoformat()}}
        completed = await db.tasks.find(done_q, {"_id": 0}).sort("updated_at", -1).to_list(40)
        all_mine = await db.tasks.find({**task_q, "owner_id": current_user["id"], "status": {"$in": ["done", "cancelled"]}}, {"_id": 0, "deadline": 1, "updated_at": 1, "status": 1}).to_list(400)
        on_time = 0
        timed = 0
        for t in all_mine:
            if t.get("status") != "done" or not t.get("deadline"):
                continue
            timed += 1
            if (t.get("updated_at") or "")[:10] <= t["deadline"]:
                on_time += 1
        asset_q = {}
        rbac.apply_client_query(asset_q, current_user)
        videos = await db.assets.find(
            {**asset_q, "uploaded_by": current_user["id"], "content_type": {"$regex": "^video/"}},
            {"_id": 0},
        ).sort("created_at", -1).to_list(20)
        review_q = {"status": "pending"}
        rbac.apply_client_query(review_q, current_user)
        if not rbac.can_internal_review(current_user, None) and not rbac.is_leadership(current_user):
            review_q["submitted_by"] = current_user["id"]
        queue = await db.approvals.find(review_q, {"_id": 0}).sort("submitted_at", 1).to_list(40)
        week_start = now.strftime("%Y-%m-%d")
        cal_q = {"date": {"$gte": week_start}}
        rbac.apply_client_query(cal_q, current_user)
        calendar_rows = await db.calendar_events.find(cal_q, {"_id": 0}).sort("date", 1).to_list(30)
        approved_n = await db.approvals.count_documents(
            {**({} if ids is None else {"client_id": {"$in": ids or ["__none__"]}}), "status": "approved", "submitted_by": current_user["id"]}
        )
        hours = await clockin_hours_for(current_user)
        return {
            "clients": clients,
            "deadlines": deadlines,
            "completed": completed,
            "videos": videos,
            "review_queue": queue,
            "calendar": calendar_rows,
            "hours": hours,
            "performance": {
                "completed_month": len(completed),
                "on_time_pct": round(100 * on_time / timed) if timed else None,
                "approved_versions": approved_n,
            },
            "can_review": rbac.can_internal_review(current_user, None) or rbac.is_leadership(current_user),
        }

    @router.post("/studio/clockin-link")
    async def link_clockin(data: ClockinLink, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="ClockIN is internal")
        emp = await db.clockin_employees.find_one(
            {"id": data.employee_id, "is_active": {"$ne": False}},
            {"_id": 0},
        )
        if not emp:
            raise HTTPException(status_code=404, detail="ClockIN person not found")
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"clockin_employee_id": emp["id"]}},
        )
        current_user["clockin_employee_id"] = emp["id"]
        return await clockin_hours_for(current_user)

    # ── Clips ─────────────────────────────────────────────────────
    @router.get("/clips")
    async def list_clips(
        client_id: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "clips", "read")
        query: dict = {}
        rbac.apply_client_query(query, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            query["client_id"] = client_id
        rows = await db.clips.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
        return rows

    @router.post("/clips")
    async def create_clip(data: ClipCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "clips", "write")
        rbac.assert_client_access(current_user, data.client_id)
        if data.category not in CLIP_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        clip = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "task_id": data.task_id,
            "calendar_event_id": data.calendar_event_id,
            "title": sanitize_input(data.title),
            "hook": sanitize_input(data.hook or ""),
            "body": sanitize_input(data.body or ""),
            "cta": sanitize_input(data.cta or ""),
            "seo_keywords": sanitize_input(data.seo_keywords or ""),
            "category": data.category,
            "status": "draft",
            "version": 1,
            "locked": False,
            "handed_to": None,
            "created_by": current_user["id"],
            "updated_at": _now(),
            "created_at": _now(),
        }
        await db.clips.insert_one(clip)
        await db.clip_versions.insert_one({
            "id": str(uuid.uuid4()),
            "clip_id": clip["id"],
            "version": 1,
            "title": clip["title"],
            "hook": clip["hook"],
            "body": clip["body"],
            "cta": clip["cta"],
            "seo_keywords": clip["seo_keywords"],
            "category": clip["category"],
            "created_by": current_user["id"],
            "created_at": clip["created_at"],
        })
        clip.pop("_id", None)
        return clip

    @router.get("/clips/{clip_id}")
    async def get_clip(clip_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "clips", "read")
        clip = await db.clips.find_one({"id": clip_id}, {"_id": 0})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        rbac.assert_client_access(current_user, clip.get("client_id"))
        versions = await db.clip_versions.find({"clip_id": clip_id}, {"_id": 0}).sort("version", -1).to_list(50)
        return {**clip, "versions": versions}

    @router.patch("/clips/{clip_id}")
    async def update_clip(clip_id: str, data: ClipUpdate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "clips", "write")
        clip = await db.clips.find_one({"id": clip_id}, {"_id": 0})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        rbac.assert_client_access(current_user, clip.get("client_id"))
        if clip.get("locked") and data.handed_to is None:
            raise HTTPException(status_code=400, detail="Approved clip is locked. Create a new version via submit after unlock, or start a new clip.")
        patch = {k: sanitize_input(v) if isinstance(v, str) else v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if "category" in patch and patch["category"] not in CLIP_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        if "handed_to" in patch:
            if not clip.get("locked"):
                raise HTTPException(status_code=400, detail="Handoff only after approval")
            if patch["handed_to"] not in HANDOFF_TO:
                raise HTTPException(status_code=400, detail="handed_to must be editor or smm")
            patch["status"] = "handed_off"
        if clip.get("locked") and set(patch.keys()) - {"handed_to", "status"}:
            raise HTTPException(status_code=400, detail="Approved clip is locked")
        patch["updated_at"] = _now()
        await db.clips.update_one({"id": clip_id}, {"$set": patch})
        return await db.clips.find_one({"id": clip_id}, {"_id": 0})

    @router.post("/clips/{clip_id}/snapshot")
    async def snapshot_clip(clip_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "clips", "write")
        clip = await db.clips.find_one({"id": clip_id}, {"_id": 0})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        rbac.assert_client_access(current_user, clip.get("client_id"))
        if clip.get("locked"):
            raise HTTPException(status_code=400, detail="Approved clip is locked")
        nxt = int(clip.get("version") or 1) + 1
        await db.clip_versions.insert_one({
            "id": str(uuid.uuid4()),
            "clip_id": clip_id,
            "version": nxt,
            "title": clip.get("title"),
            "hook": clip.get("hook"),
            "body": clip.get("body"),
            "cta": clip.get("cta"),
            "seo_keywords": clip.get("seo_keywords"),
            "category": clip.get("category"),
            "created_by": current_user["id"],
            "created_at": _now(),
        })
        await db.clips.update_one({"id": clip_id}, {"$set": {"version": nxt, "updated_at": _now()}})
        return await get_clip(clip_id, current_user)

    @router.post("/clips/{clip_id}/revise")
    async def revise_clip(clip_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "clips", "write")
        clip = await db.clips.find_one({"id": clip_id}, {"_id": 0})
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")
        rbac.assert_client_access(current_user, clip.get("client_id"))
        if not clip.get("locked"):
            raise HTTPException(status_code=400, detail="Only an approved clip needs a new version")
        nxt = int(clip.get("version") or 1) + 1
        await db.clip_versions.insert_one({
            "id": str(uuid.uuid4()),
            "clip_id": clip_id,
            "version": nxt,
            "title": clip.get("title"),
            "hook": clip.get("hook"),
            "body": clip.get("body"),
            "cta": clip.get("cta"),
            "seo_keywords": clip.get("seo_keywords"),
            "category": clip.get("category"),
            "created_by": current_user["id"],
            "created_at": _now(),
        })
        await db.clips.update_one({"id": clip_id}, {"$set": {
            "version": nxt,
            "locked": False,
            "status": "draft",
            "handed_to": None,
            "updated_at": _now(),
        }})
        return await get_clip(clip_id, current_user)

    # ── Approvals ─────────────────────────────────────────────────
    async def _load_resource(kind: str, resource_id: str):
        if kind == "asset":
            doc = await db.assets.find_one({"id": resource_id}, {"_id": 0})
        elif kind == "clip":
            doc = await db.clips.find_one({"id": resource_id}, {"_id": 0})
        else:
            raise HTTPException(status_code=400, detail="type must be asset or clip")
        if not doc:
            raise HTTPException(status_code=404, detail="Resource not found")
        return doc

    @router.get("/approvals")
    async def list_approvals(
        status: Optional[str] = Query(None),
        audience: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "approvals", "read")
        query: dict = {}
        rbac.apply_client_query(query, current_user)
        if status:
            query["status"] = status
        if current_user.get("role") == "client":
            query["audience"] = "client"
            rows = await db.approvals.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(200)
            from p3 import client_approval
            return [client_approval(r) for r in rows]
        if audience == "client":
            query["audience"] = "client"
        else:
            query["audience"] = {"$ne": "client"}
        if current_user.get("role") == "employee" and not rbac.can_internal_review(current_user, None):
            query["$or"] = [
                {"submitted_by": current_user["id"]},
                {"reviewer_id": current_user["id"]},
            ]
        rows = await db.approvals.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(200)
        if status == "approved" and audience != "client":
            rids = list({r.get("resource_id") for r in rows if r.get("resource_id")})
            if rids:
                presented = await db.approvals.find(
                    {
                        "audience": "client",
                        "status": {"$in": ["pending", "approved"]},
                        "resource_id": {"$in": rids},
                    },
                    {"_id": 0, "resource_id": 1, "version": 1},
                ).to_list(500)
                keys = {(p.get("resource_id"), p.get("version")) for p in presented}
                rows = [r for r in rows if (r.get("resource_id"), r.get("version")) not in keys]
        return rows

    @router.post("/approvals")
    async def submit_approval(data: ApprovalCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "approvals", "write")
        if data.type not in APPROVAL_TYPES:
            raise HTTPException(status_code=400, detail="type must be asset or clip")
        resource = await _load_resource(data.type, data.resource_id)
        client_id = resource.get("client_id")
        rbac.assert_client_access(current_user, client_id)
        if resource.get("locked"):
            raise HTTPException(status_code=400, detail="This version is locked. Upload or write a new version.")
        existing = await db.approvals.find_one(
            {"type": data.type, "resource_id": data.resource_id, "status": "pending", "audience": {"$ne": "client"}},
            {"_id": 0},
        )
        if existing:
            return existing
        version = resource.get("version") or 1
        approval = {
            "id": str(uuid.uuid4()),
            "type": data.type,
            "resource_id": data.resource_id,
            "client_id": client_id,
            "task_id": resource.get("task_id"),
            "version": version,
            "version_label": resource.get("label") or f"v{version}",
            "status": "pending",
            "submitted_by": current_user["id"],
            "submitted_at": _now(),
            "reviewer_id": None,
            "decided_by": None,
            "decided_at": None,
            "notes": [{"user_id": current_user["id"], "text": sanitize_input(data.notes), "created_at": _now()}] if data.notes else [],
            "locked": False,
            "audience": "internal",
        }
        await db.approvals.insert_one(approval)
        if data.type == "asset":
            await db.assets.update_one({"id": data.resource_id}, {"$set": {"bucket": "review"}})
        elif data.type == "clip":
            await db.clips.update_one({"id": data.resource_id}, {"$set": {"status": "in_review", "updated_at": _now()}})
        await _touch_task(resource.get("task_id"), "in_review")
        approval.pop("_id", None)
        return approval

    @router.post("/approvals/{approval_id}/decide")
    async def decide_approval(
        approval_id: str,
        data: ApprovalDecide,
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "approvals", "write")
        row = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Approval not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        if row.get("status") != "pending":
            raise HTTPException(status_code=400, detail="This review is already closed")
        if row.get("audience") == "client":
            raise HTTPException(status_code=400, detail="The client decides this version")
        if not rbac.can_internal_review(current_user, row.get("client_id")):
            raise HTTPException(status_code=403, detail="You can only review work for clients you are on")
        action = data.action
        if action not in ("approve", "changes_requested", "cancel"):
            raise HTTPException(status_code=400, detail="action must be approve, changes_requested, or cancel")
        status = "approved" if action == "approve" else action
        notes = list(row.get("notes") or [])
        if data.notes:
            notes.append({"user_id": current_user["id"], "text": sanitize_input(data.notes), "created_at": _now()})
        patch = {
            "status": status,
            "decided_by": current_user["id"],
            "decided_at": _now(),
            "reviewer_id": current_user["id"],
            "notes": notes,
            "locked": action == "approve",
        }
        if action == "approve":
            resource = await _load_resource(row["type"], row["resource_id"])
            patch["snapshot"] = resource_snapshot(row["type"], resource)
        await db.approvals.update_one({"id": approval_id}, {"$set": patch})
        if action == "approve":
            await _lock_resource(row["type"], row["resource_id"], row["client_id"])
        elif action == "changes_requested":
            if row["type"] == "clip":
                await db.clips.update_one({"id": row["resource_id"]}, {"$set": {"status": "changes_requested", "updated_at": _now()}})
            await _touch_task(row.get("task_id"), "changes_requested")
        return await db.approvals.find_one({"id": approval_id}, {"_id": 0})

    @router.post("/assets/{asset_id}/final")
    async def mark_asset_final(asset_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "assets", "write")
        doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Asset not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("locked"):
            raise HTTPException(status_code=400, detail="Locked version cannot be relabelled")
        await db.assets.update_one({"id": asset_id}, {"$set": {"label": "final"}})
        return await db.assets.find_one({"id": asset_id}, {"_id": 0})

    async def seed_indexes():
        await db.approvals.create_index("client_id")
        await db.approvals.create_index("status")
        await db.clips.create_index("client_id")
        await db.clip_versions.create_index("clip_id")
        await db.chat_connection_requests.create_index([("from_id", 1), ("to_id", 1)])

    router.seed_indexes = seed_indexes  # type: ignore
    return router
