"""P2 Strategy-to-execution: strategy documents, implement → tasks, calendar workflow, tracker."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from zoneinfo import ZoneInfo

import rbac

IST = ZoneInfo("Asia/Kolkata")

STRATEGY_STATUSES = ("draft", "in_review", "changes_requested", "approved", "implemented")
CAL_WORKFLOW = (
    "idea", "writing", "editing", "review", "approved", "scheduled", "published", "postponed",
)
CAL_LEGACY = {
    "not_started": "idea",
    "in_progress": "writing",
    "completed": "published",
    "postpone": "postponed",
}

SECTIONS = (
    ("business_analysis", "Business analysis"),
    ("audience", "Audience"),
    ("competitors", "Competitors"),
    ("positioning", "Positioning"),
    ("offer", "Offer"),
    ("content_pillars", "Content pillars"),
    ("paid_plan", "Paid plan"),
    ("seo_plan", "SEO plan"),
    ("web_plan", "Web plan"),
    ("kpis", "KPIs"),
    ("budget", "Budget"),
    ("roadmap_30", "30-day roadmap"),
    ("roadmap_60", "60-day roadmap"),
    ("roadmap_90", "90-day roadmap"),
)

TASK_TEMPLATES = (
    {
        "department": "marketing",
        "job_roles": ("digital_marketer", "smm"),
        "title": "Build 30-day content calendar from strategy",
        "days": 7,
        "need_any": ("content_pillars", "roadmap_30", "audience", "offer"),
    },
    {
        "department": "creative",
        "job_roles": ("content_writer",),
        "title": "Write clips from content pillars",
        "days": 10,
        "need_any": ("content_pillars", "offer", "positioning"),
    },
    {
        "department": "creative",
        "job_roles": ("senior_editor", "junior_editor", "cinematographer", "designer"),
        "title": "Produce first content batch",
        "days": 21,
        "need_any": ("content_pillars", "roadmap_30"),
    },
    {
        "department": "marketing",
        "job_roles": ("digital_marketer",),
        "title": "Set up paid work from the plan",
        "days": 14,
        "need_any": ("paid_plan",),
    },
    {
        "department": "marketing",
        "job_roles": ("seo", "digital_marketer"),
        "title": "Set up SEO work from the plan",
        "days": 14,
        "need_any": ("seo_plan",),
    },
    {
        "department": "technology",
        "job_roles": ("web_developer",),
        "title": "Web / landing updates from the plan",
        "days": 21,
        "need_any": ("web_plan",),
    },
    {
        "department": "operations",
        "job_roles": ("operations_staff",),
        "title": "30-day roadmap check-in",
        "days": 30,
        "need_any": ("roadmap_30", "roadmap_60", "roadmap_90"),
    },
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _empty_sections() -> dict:
    return {key: "" for key, _ in SECTIONS}


class StrategyCreate(BaseModel):
    client_id: str
    title: str = Field(..., min_length=1, max_length=200)


class StrategyUpdate(BaseModel):
    title: Optional[str] = None
    sections: Optional[dict] = None


class StrategyDecide(BaseModel):
    action: str  # approve | changes_requested
    notes: str = ""


def normalize_cal_status(status: Optional[str]) -> str:
    raw = (status or "idea").strip()
    return CAL_LEGACY.get(raw, raw if raw in CAL_WORKFLOW else "idea")


def _filled(sections: Optional[dict], keys: tuple) -> bool:
    blob = sections or {}
    return any(str(blob.get(k) or "").strip() for k in keys)


def _any_section(sections: Optional[dict]) -> bool:
    blob = sections or {}
    return any(str(blob.get(k) or "").strip() for k, _ in SECTIONS)


def _excerpt(sections: Optional[dict], keys: tuple, limit: int = 500) -> str:
    blob = sections or {}
    labels = dict(SECTIONS)
    parts = []
    for k in keys:
        text = str(blob.get(k) or "").strip()
        if text:
            parts.append(f"{labels.get(k, k)}:\n{text}")
    out = "\n\n".join(parts)
    return out if len(out) <= limit else out[: limit - 1] + "…"


def _ist_date(iso_str: Optional[str]) -> Optional[str]:
    if not iso_str:
        return None
    raw = str(iso_str).strip()
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(IST).date().isoformat()
    except ValueError:
        return raw[:10] if len(raw) >= 10 else None


def create_p2_router(db, *, get_current_user, sanitize_input, logger) -> APIRouter:
    router = APIRouter()

    def _public(doc: dict) -> dict:
        d = dict(doc)
        d.pop("_id", None)
        return d

    async def _staff_for_client(client_id: str) -> list:
        return await db.users.find(
            {
                "is_active": True,
                "role": {"$in": list(rbac.AGENCY_ROLES)},
                "$or": [
                    {"assigned_client_ids": client_id},
                    {"role": {"$in": list(rbac.LEADERSHIP_ROLES)}},
                ],
            },
            {"_id": 0, "id": 1, "name": 1, "role": 1, "job_role": 1, "department": 1},
        ).to_list(200)

    def _pick_owner(staff: list, job_roles: tuple, fallback_id: str) -> tuple:
        """Match job role on this client. Never dump work on a random employee."""
        for role in job_roles:
            for u in staff:
                if u.get("job_role") == role and u.get("role") == "employee":
                    return u["id"], False
        return fallback_id, True

    @router.get("/strategies")
    async def list_strategies(
        client_id: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "strategy", "read")
        query: dict = {}
        rbac.apply_client_query(query, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            query["client_id"] = client_id
        if current_user.get("role") == "client":
            query["status"] = {"$in": ["approved", "implemented"]}
        rows = await db.strategies.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
        return rows

    @router.post("/strategies")
    async def create_strategy(data: StrategyCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "write")
        rbac.assert_client_access(current_user, data.client_id)
        doc = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "title": sanitize_input(data.title),
            "status": "draft",
            "version": 1,
            "sections": _empty_sections(),
            "notes": [],
            "created_by": current_user["id"],
            "submitted_by": None,
            "decided_by": None,
            "implemented_at": None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.strategies.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("/strategies/{strategy_id}")
    async def get_strategy(strategy_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "read")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if current_user.get("role") == "client" and doc.get("status") not in ("approved", "implemented"):
            raise HTTPException(status_code=403, detail="This plan is not shared yet")
        return doc

    @router.patch("/strategies/{strategy_id}")
    async def update_strategy(strategy_id: str, data: StrategyUpdate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "write")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("status") in ("in_review", "approved", "implemented"):
            raise HTTPException(status_code=400, detail="Withdraw the plan to edit, or duplicate an approved one.")
        patch = {"updated_at": _now()}
        if data.title is not None:
            patch["title"] = sanitize_input(data.title)
        if data.sections is not None:
            merged = {**_empty_sections(), **(doc.get("sections") or {})}
            for key, _ in SECTIONS:
                if key in data.sections:
                    merged[key] = sanitize_input(str(data.sections.get(key) or ""))
            patch["sections"] = merged
        await db.strategies.update_one({"id": strategy_id}, {"$set": patch})
        return await db.strategies.find_one({"id": strategy_id}, {"_id": 0})

    @router.post("/strategies/{strategy_id}/submit")
    async def submit_strategy(strategy_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "write")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("status") not in ("draft", "changes_requested"):
            raise HTTPException(status_code=400, detail="Only a draft or a plan with requested changes can be submitted")
        await db.strategies.update_one({"id": strategy_id}, {"$set": {
            "status": "in_review",
            "submitted_by": current_user["id"],
            "updated_at": _now(),
        }})
        return await db.strategies.find_one({"id": strategy_id}, {"_id": 0})

    @router.post("/strategies/{strategy_id}/withdraw")
    async def withdraw_strategy(strategy_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "write")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("status") != "in_review":
            raise HTTPException(status_code=400, detail="Only a plan in review can be withdrawn")
        allowed = (
            rbac.is_leadership(current_user)
            or doc.get("submitted_by") == current_user["id"]
            or doc.get("created_by") == current_user["id"]
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="Only the author or leadership can withdraw this plan")
        await db.strategies.update_one({"id": strategy_id}, {"$set": {
            "status": "draft",
            "updated_at": _now(),
        }})
        return await db.strategies.find_one({"id": strategy_id}, {"_id": 0})

    @router.post("/strategies/{strategy_id}/decide")
    async def decide_strategy(strategy_id: str, data: StrategyDecide, current_user: dict = Depends(get_current_user)):
        if not rbac.is_leadership(current_user):
            raise HTTPException(status_code=403, detail="Owner / Admin / Ops approves strategy")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("status") != "in_review":
            raise HTTPException(status_code=400, detail="Nothing waiting for review")
        if data.action not in ("approve", "changes_requested"):
            raise HTTPException(status_code=400, detail="action must be approve or changes_requested")
        notes = list(doc.get("notes") or [])
        if data.notes:
            notes.append({"user_id": current_user["id"], "text": sanitize_input(data.notes), "created_at": _now()})
        await db.strategies.update_one({"id": strategy_id}, {"$set": {
            "status": "approved" if data.action == "approve" else "changes_requested",
            "decided_by": current_user["id"],
            "notes": notes,
            "updated_at": _now(),
        }})
        return await db.strategies.find_one({"id": strategy_id}, {"_id": 0})

    @router.post("/strategies/{strategy_id}/implement")
    async def implement_strategy(strategy_id: str, current_user: dict = Depends(get_current_user)):
        if not rbac.is_leadership(current_user):
            raise HTTPException(status_code=403, detail="Only leadership can implement a strategy")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("status") != "approved":
            raise HTTPException(status_code=400, detail="Approve the strategy first")
        if doc.get("implemented_at"):
            raise HTTPException(status_code=400, detail="Already implemented")
        sections = doc.get("sections") or {}
        if not _any_section(sections):
            raise HTTPException(status_code=400, detail="Fill the plan before implementing")
        staff = await _staff_for_client(doc["client_id"])
        client = await db.clients.find_one({"id": doc["client_id"]}, {"_id": 0, "name": 1}) or {}
        created = []
        today = datetime.now(IST).date()
        client_name = client.get("name") or "client"

        def _make_task(tmpl: dict, owner_id: str, unmatched: bool, extra_brief: str) -> dict:
            need = tmpl.get("need_any") or ()
            excerpt = _excerpt(sections, need)
            unmatched_note = ""
            if unmatched:
                want = ", ".join(tmpl["job_roles"])
                unmatched_note = f"No {want} assigned to this client — owned by the person who implemented.\n\n"
            brief = (
                f"From strategy: {doc.get('title')} ({client_name}).\n"
                f"{unmatched_note}"
                f"{extra_brief}"
                f"{excerpt or 'See the approved plan in Strategy Hub.'}"
            )
            return {
                "id": str(uuid.uuid4()),
                "client_id": doc["client_id"],
                "owner_id": owner_id,
                "title": tmpl["title"],
                "brief": brief[:4000],
                "deadline": (today + timedelta(days=tmpl["days"])).isoformat(),
                "status": "todo",
                "department": tmpl["department"],
                "job_role": tmpl["job_roles"][0],
                "campaign_id": None,
                "calendar_event_id": None,
                "strategy_id": doc["id"],
                "unmatched_role": unmatched,
                "evidence": [],
                "created_by": current_user["id"],
                "created_at": _now(),
                "updated_at": _now(),
            }

        for tmpl in TASK_TEMPLATES:
            if not _filled(sections, tmpl["need_any"]):
                continue
            owner_id, unmatched = _pick_owner(staff, tmpl["job_roles"], current_user["id"])
            task = _make_task(tmpl, owner_id, unmatched, "")
            await db.tasks.insert_one(task)
            task.pop("_id", None)
            created.append(task)

        if not created:
            fallback = {
                "department": "operations",
                "job_roles": ("operations_staff",),
                "title": "Run the approved strategy",
                "days": 14,
                "need_any": tuple(k for k, _ in SECTIONS),
            }
            owner_id, unmatched = _pick_owner(staff, fallback["job_roles"], current_user["id"])
            task = _make_task(fallback, owner_id, unmatched, "No department section matched a template. Use the full plan.\n\n")
            await db.tasks.insert_one(task)
            task.pop("_id", None)
            created.append(task)

        await db.strategies.update_one({"id": strategy_id}, {"$set": {
            "status": "implemented",
            "implemented_at": _now(),
            "updated_at": _now(),
        }})
        out = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        out["created_tasks"] = created
        return out

    @router.post("/strategies/{strategy_id}/duplicate")
    async def duplicate_strategy(strategy_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "strategy", "write")
        doc = await db.strategies.find_one({"id": strategy_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Strategy not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        copy = {
            "id": str(uuid.uuid4()),
            "client_id": doc["client_id"],
            "title": sanitize_input(f"{doc.get('title') or 'Strategy'} (v{(doc.get('version') or 1) + 1})"),
            "status": "draft",
            "version": int(doc.get("version") or 1) + 1,
            "sections": doc.get("sections") or _empty_sections(),
            "notes": [],
            "created_by": current_user["id"],
            "submitted_by": None,
            "decided_by": None,
            "implemented_at": None,
            "source_id": doc["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.strategies.insert_one(copy)
        copy.pop("_id", None)
        return copy

    @router.get("/tracker/month")
    async def month_tracker(
        month: Optional[int] = Query(None),
        year: Optional[int] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "dashboard", "read")
        now = datetime.now(IST)
        month = month or now.month
        year = year or now.year
        prefix = f"{year:04d}-{month:02d}"
        cal_q: dict = {"date": {"$regex": f"^{prefix}"}}
        rbac.apply_client_query(cal_q, current_user)
        events = await db.calendar_events.find(cal_q, {"_id": 0}).to_list(2000)
        counts = {k: 0 for k in CAL_WORKFLOW}
        counts["planned"] = len(events)
        by_client: dict = {}
        by_dept = {"marketing": 0, "creative": 0, "technology": 0, "operations": 0}
        on_time = 0
        late = 0
        published_n = 0
        for ev in events:
            st = normalize_cal_status(ev.get("status"))
            counts[st] = counts.get(st, 0) + 1
            cid = ev.get("client_id") or "—"
            by_client[cid] = by_client.get(cid, 0) + 1
            if st == "published":
                published_n += 1
                planned = ev.get("date") or ""
                done_on = _ist_date(ev.get("published_at"))
                # Legacy rows with no stamp are not counted late.
                if not done_on or not planned or done_on <= planned:
                    on_time += 1
                else:
                    late += 1
        task_q: dict = {}
        rbac.apply_client_query(task_q, current_user)
        tasks = await db.tasks.find(task_q, {"_id": 0, "status": 1, "department": 1, "deadline": 1}).to_list(2000)
        task_open = sum(1 for t in tasks if t.get("status") not in ("done", "cancelled"))
        task_done = sum(1 for t in tasks if t.get("status") == "done")
        for t in tasks:
            dept = t.get("department") or "operations"
            if dept in by_dept:
                by_dept[dept] += 1
        approvals_q: dict = {}
        rbac.apply_client_query(approvals_q, current_user)
        pending_ap = await db.approvals.count_documents({**approvals_q, "status": "pending", "audience": "client" if current_user.get("role") == "client" else {"$ne": "client"}})
        approved_ap = await db.approvals.count_documents({**approvals_q, "status": "approved", "audience": "client" if current_user.get("role") == "client" else {"$ne": "client"}})
        clients = await db.clients.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(200)
        names = {c["id"]: c.get("name") for c in clients}
        calendar_out = {
            **counts,
            "in_production": counts["writing"] + counts["editing"] + counts["review"],
            "on_time": on_time,
            "late": late,
            "on_time_pct": round(100 * on_time / published_n) if published_n else None,
        }
        if current_user.get("role") == "client":
            kept = ("approved", "scheduled", "published", "postponed")
            calendar_out = {
                **{k: counts.get(k, 0) for k in kept},
                "planned": sum(counts.get(k, 0) for k in kept),
                "in_production": 0,
                "on_time": on_time,
                "late": late,
                "on_time_pct": round(100 * on_time / published_n) if published_n else None,
            }
        return {
            "month": prefix,
            "calendar": calendar_out,
            "tasks": {"open": 0, "done": 0} if current_user.get("role") == "client" else {"open": task_open, "done": task_done},
            "approvals": {"pending": pending_ap, "approved": approved_ap},
            "by_department": {} if current_user.get("role") == "client" else by_dept,
            "by_client": [] if current_user.get("role") == "client" else [{"id": k, "name": names.get(k) or k, "count": v} for k, v in sorted(by_client.items(), key=lambda x: -x[1])[:8]],
        }

    async def seed_indexes():
        await db.strategies.create_index("client_id")
        await db.strategies.create_index("status")
        await db.calendar_events.create_index("date")

    router.seed_indexes = seed_indexes  # type: ignore
    router.normalize_cal_status = staticmethod(normalize_cal_status)  # type: ignore
    return router
