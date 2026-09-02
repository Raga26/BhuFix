"""P5 Performance loop: calculators, lead funnel, Ad Health, notifications, automations, audit."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import rbac

IST = ZoneInfo("Asia/Kolkata")
TIERS = ("action", "important", "info", "completed")
OPEN_TASKS = ("todo", "in_progress", "in_review", "changes_requested")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _today() -> str:
    return datetime.now(IST).date().isoformat()


def _n(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _pct(part, whole) -> Optional[float]:
    w = _n(whole)
    if w <= 0:
        return None
    return round((_n(part) / w) * 100, 2)


def _div(a, b) -> Optional[float]:
    d = _n(b)
    if d <= 0:
        return None
    return round(_n(a) / d, 2)


def customers_of(row: dict) -> float:
    c = _n(row.get("customers"))
    if c > 0:
        return c
    return _n(row.get("conversions"))


def calc_metrics(row: dict, reach: float = 0) -> dict:
    impressions = _n(row.get("impressions"))
    clicks = _n(row.get("clicks"))
    spent = _n(row.get("spent"))
    leads = _n(row.get("leads"))
    landing = _n(row.get("landing"))
    whatsapp = _n(row.get("whatsapp"))
    qualified = _n(row.get("qualified"))
    appointments = _n(row.get("appointments"))
    customers = customers_of(row)
    revenue = _n(row.get("revenue"))
    budget = _n(row.get("budget"))
    rch = _n(reach) or _n(row.get("reach"))
    ctr = _pct(clicks, impressions)
    return {
        "impressions": impressions,
        "clicks": clicks,
        "landing": landing,
        "whatsapp": whatsapp,
        "leads": leads,
        "qualified": qualified,
        "appointments": appointments,
        "customers": customers,
        "revenue": revenue,
        "spent": spent,
        "budget": budget,
        "ctr": ctr,
        "cpc": _div(spent, clicks),
        "cpm": round((spent / impressions) * 1000, 2) if impressions else None,
        "frequency": _div(impressions, rch) if rch else None,
        "cpl": _div(spent, leads),
        "cpa": _div(spent, customers),
        "conversion_rate": _pct(customers, clicks),
        "roas": _div(revenue, spent),
        "break_even_roas": 1.0,
        "cac": _div(spent, customers),
    }


def ad_health(row: dict) -> dict:
    """Internal 0–100 score. Not a Meta Ads Manager score."""
    m = calc_metrics(row)
    if m["impressions"] <= 0 and m["spent"] <= 0:
        return {
            "score": None,
            "label": "No data",
            "name": "BhuFix Ad Health (internal)",
            "disclaimer": "This is a BhuFix internal diagnostic, not a Meta or Google score.",
            "reasons": ["Add impressions or spend to score this campaign."],
        }
    score = 50
    reasons = []
    ctr = m["ctr"]
    if m["impressions"] > 0:
        if ctr is not None and ctr >= 1.0:
            score += 15
            reasons.append("CTR at or above 1%")
        elif ctr is not None and ctr >= 0.5:
            score += 8
            reasons.append("CTR is acceptable")
        else:
            score -= 10
            reasons.append("CTR is below 0.5%")
    if m["spent"] > 0 and m["clicks"] == 0:
        score -= 20
        reasons.append("Spend with no clicks")
    if m["budget"] > 0:
        pace = m["spent"] / m["budget"]
        if pace <= 1.05:
            score += 10
            reasons.append("Spend is within budget")
        elif pace > 1.2:
            score -= 15
            reasons.append("Spend is more than 20% over budget")
        else:
            reasons.append("Spend is slightly over budget")
    if m["leads"] > 0:
        score += 8
        reasons.append("Campaign is generating leads")
    if m["customers"] > 0:
        score += 7
        reasons.append("Campaign has customers")
    if any((v.get("status") == "winner") for v in (row.get("variants") or [])):
        score += 10
        reasons.append("A variant is marked winner")
    score = max(0, min(100, int(round(score))))
    if score >= 75:
        label = "Healthy"
    elif score >= 50:
        label = "Watch"
    else:
        label = "Needs work"
    return {
        "score": score,
        "label": label,
        "name": "BhuFix Ad Health (internal)",
        "disclaimer": "This is a BhuFix internal diagnostic, not a Meta or Google score.",
        "reasons": reasons[:6],
    }


def funnel_of(rows: list) -> dict:
    keys = (
        "impressions", "clicks", "landing", "whatsapp", "leads",
        "qualified", "appointments", "customers", "revenue",
    )
    out = {k: 0.0 for k in keys}
    for row in rows:
        m = calc_metrics(row)
        for k in keys:
            out[k] += m[k]
    steps = [
        {"key": "impressions", "label": "Impressions", "value": out["impressions"]},
        {"key": "clicks", "label": "Clicks", "value": out["clicks"]},
        {"key": "landing", "label": "Landing / WhatsApp", "value": out["landing"] + out["whatsapp"]},
        {"key": "leads", "label": "Leads", "value": out["leads"]},
        {"key": "qualified", "label": "Qualified", "value": out["qualified"]},
        {"key": "appointments", "label": "Appointments", "value": out["appointments"]},
        {"key": "customers", "label": "Customers", "value": out["customers"]},
        {"key": "revenue", "label": "Revenue", "value": out["revenue"]},
    ]
    return {"totals": out, "steps": steps}


async def write_audit(db, user: dict, action: str, resource: str, resource_id: str = "", detail: str = ""):
    doc = {
        "id": str(uuid.uuid4()),
        "at": _now(),
        "actor_id": (user or {}).get("id") or "",
        "actor_name": (user or {}).get("name") or "",
        "actor_role": (user or {}).get("role") or "",
        "action": action[:80],
        "resource": resource[:80],
        "resource_id": (resource_id or "")[:80],
        "detail": (detail or "")[:500],
    }
    await db.audit_log.insert_one(doc)


async def notify(db, user_id: str, tier: str, title: str, body: str = "", link: str = "", dedupe_key: Optional[str] = None):
    if not user_id:
        return
    if tier not in TIERS:
        tier = "info"
    if dedupe_key:
        existing = await db.notifications.find_one({"user_id": user_id, "dedupe_key": dedupe_key}, {"_id": 1})
        if existing:
            return
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tier": tier,
        "title": title[:160],
        "body": (body or "")[:400],
        "link": (link or "")[:200],
        "dedupe_key": dedupe_key,
        "read": False,
        "created_at": _now(),
    }
    await db.notifications.insert_one(doc)


async def notify_many(db, user_ids, tier: str, title: str, body: str = "", link: str = "", dedupe_key: Optional[str] = None):
    seen = set()
    for uid in user_ids or []:
        if not uid or uid in seen:
            continue
        seen.add(uid)
        key = f"{dedupe_key}:{uid}" if dedupe_key else None
        await notify(db, uid, tier, title, body, link, key)


async def leadership_ids(db) -> list:
    rows = await db.users.find(
        {"is_active": True, "role": {"$in": ["owner", "admin", "operations_manager"]}},
        {"_id": 0, "id": 1},
    ).to_list(80)
    return [r["id"] for r in rows]


async def assigned_staff_ids(db, client_id: str) -> list:
    if not client_id:
        return []
    rows = await db.users.find(
        {"is_active": True, "role": {"$in": list(rbac.AGENCY_ROLES)}, "assigned_client_ids": client_id},
        {"_id": 0, "id": 1},
    ).to_list(80)
    return [r["id"] for r in rows]


async def offboard_user(db, target_id: str, fallback_id: str):
    """Reassign open work. Sessions die because is_active is already False."""
    if not target_id or not fallback_id:
        return
    await db.tasks.update_many(
        {"owner_id": target_id, "status": {"$in": list(OPEN_TASKS)}},
        {"$set": {"owner_id": fallback_id, "updated_at": _now(), "reassigned_from": target_id}},
    )


async def on_client_asset_approved(db, approval: dict):
    """Lock stays; notify the person who presented and staff on that client."""
    rid = approval.get("resource_id")
    kind = approval.get("type")
    if kind == "clip":
        await db.clips.update_one({"id": rid}, {"$set": {"locked": True, "updated_at": _now()}})
    else:
        await db.assets.update_one({"id": rid}, {"$set": {"locked": True, "bucket": "approved"}})
    title = f"Client approved {approval.get('version_label') or 'a version'}"
    body = "Lock stays. Publish from the queue when ready."
    ids = [approval.get("submitted_by")]
    ids.extend(await assigned_staff_ids(db, approval.get("client_id")))
    ids.extend(await leadership_ids(db))
    await notify_many(db, ids, "action", title, body, "/dashboard/publish", f"approve:{approval.get('id')}")


async def run_tick(db) -> dict:
    today = _today()
    created = 0
    leads = await leadership_ids(db)

    tasks = await db.tasks.find(
        {"status": {"$in": list(OPEN_TASKS)}, "deadline": {"$nin": [None, ""]}},
        {"_id": 0, "id": 1, "title": 1, "owner_id": 1, "deadline": 1, "client_id": 1},
    ).to_list(400)
    for t in tasks:
        due = str(t.get("deadline") or "")[:10]
        if not due or due >= today:
            continue
        ids = [t.get("owner_id")] + leads
        await notify_many(
            db, ids, "action",
            f"Overdue: {t.get('title') or 'Task'}",
            f"Due {due}",
            "/dashboard/tasks",
            f"task-overdue:{t['id']}:{due}",
        )
        created += 1

    events = await db.calendar_events.find(
        {"status": "approved", "date": {"$lt": today}},
        {"_id": 0, "id": 1, "title": 1, "owner_id": 1, "date": 1, "client_id": 1},
    ).to_list(300)
    for ev in events:
        ids = [ev.get("owner_id")] + leads
        ids.extend(await assigned_staff_ids(db, ev.get("client_id")))
        await notify_many(
            db, ids, "action",
            f"Approved content is overdue: {ev.get('title') or 'Post'}",
            f"Planned {ev.get('date')}",
            "/dashboard/publish",
            f"cal-overdue:{ev['id']}",
        )
        created += 1

    invoices = await db.invoices.find(
        {"status": "sent", "due_date": {"$nin": [None, ""]}},
        {"_id": 0, "id": 1, "number": 1, "due_date": 1, "client_id": 1},
    ).to_list(200)
    for inv in invoices:
        due = str(inv.get("due_date") or "")[:10]
        if not due or due >= today:
            continue
        await notify_many(
            db, leads, "important",
            f"Invoice {inv.get('number') or ''} is overdue",
            f"Due {due}",
            "/dashboard/invoices",
            f"inv-overdue:{inv['id']}",
        )
        clients = await db.users.find(
            {"role": "client", "is_active": True, "client_id": inv.get("client_id")},
            {"_id": 0, "id": 1},
        ).to_list(20)
        await notify_many(
            db, [c["id"] for c in clients], "important",
            f"Invoice {inv.get('number') or ''} is due",
            f"Due {due}",
            "/dashboard/invoices",
            f"inv-overdue-client:{inv['id']}",
        )
        created += 1

    return {"ok": True, "scanned": created, "at": _now()}


class ExportBody(BaseModel):
    resource: str
    resource_id: str = ""
    detail: str = ""


def client_campaign_metrics(row: dict, metrics: dict, health: dict) -> dict:
    return {
        "id": row.get("id"),
        "name": row.get("name") or "",
        "platform": row.get("platform"),
        "month": row.get("month"),
        "year": row.get("year"),
        "metrics": {k: metrics[k] for k in (
            "impressions", "clicks", "landing", "whatsapp", "leads", "qualified",
            "appointments", "customers", "revenue", "spent", "budget", "ctr",
            "cpc", "cpm", "frequency", "cpl", "cpa", "conversion_rate", "roas",
            "break_even_roas", "cac",
        )},
        "health": {
            "score": health["score"],
            "label": health["label"],
            "name": health["name"],
            "disclaimer": health["disclaimer"],
            "reasons": health.get("reasons") or [],
        },
    }


def create_p5_router(db, *, get_current_user, sanitize_input, logger) -> APIRouter:
    router = APIRouter()

    @router.get("/performance/summary")
    async def performance_summary(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "performance", "read")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        ads = await db.ads_campaigns.find(q, {"_id": 0}).to_list(500)
        kpis = await db.kpis.find(q, {"_id": 0}).to_list(500)
        reach_by = {}
        for k in kpis:
            key = (k.get("client_id"), int(k.get("month") or 0), int(k.get("year") or 0))
            reach_by[key] = reach_by.get(key, 0) + _n(k.get("reach"))
        campaigns = []
        for row in ads:
            reach = reach_by.get((row.get("client_id"), int(row.get("month") or 0), int(row.get("year") or 0)), 0)
            metrics = calc_metrics(row, reach)
            health = ad_health(row)
            if current_user.get("role") == "client":
                campaigns.append(client_campaign_metrics(row, metrics, health))
            else:
                campaigns.append({
                    "id": row.get("id"),
                    "client_id": row.get("client_id"),
                    "name": row.get("name") or "",
                    "platform": row.get("platform"),
                    "month": row.get("month"),
                    "year": row.get("year"),
                    "objective": row.get("objective") or "",
                    "metrics": metrics,
                    "health": health,
                })
        funnel = funnel_of(ads)
        scores = [c["health"]["score"] for c in campaigns if c.get("health") and c["health"].get("score") is not None]
        overall = int(round(sum(scores) / len(scores))) if scores else None
        return {
            "funnel": funnel,
            "campaigns": campaigns,
            "overall_health": overall,
            "disclaimer": "BhuFix Ad Health is an internal diagnostic, not a Meta or Google score. Numbers come from what the team typed in Ads.",
        }

    @router.get("/notifications")
    async def list_notifications(
        unread: bool = Query(False),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "notifications", "read")
        q = {"user_id": current_user["id"]}
        if unread:
            q["read"] = False
        rows = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(80)
        unread_count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
        groups = {t: [] for t in TIERS}
        for r in rows:
            if r.get("read"):
                groups["completed"].append(r)
            else:
                groups.setdefault(r.get("tier") or "info", []).append(r)
        return {"items": rows, "groups": groups, "unread": unread_count}

    @router.post("/notifications/{note_id}/read")
    async def read_one(note_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "notifications", "write")
        await db.notifications.update_one(
            {"id": note_id, "user_id": current_user["id"]},
            {"$set": {"read": True, "read_at": _now()}},
        )
        return {"ok": True}

    @router.post("/notifications/read-all")
    async def read_all(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "notifications", "write")
        await db.notifications.update_many(
            {"user_id": current_user["id"], "read": False},
            {"$set": {"read": True, "read_at": _now()}},
        )
        return {"ok": True}

    @router.post("/automations/tick")
    async def automations_tick(current_user: dict = Depends(get_current_user)):
        return await run_tick(db)

    @router.get("/audit")
    async def list_audit(
        limit: int = Query(80, ge=1, le=200),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "audit", "read")
        return await db.audit_log.find({}, {"_id": 0}).sort("at", -1).to_list(limit)

    @router.post("/audit/export")
    async def audit_export(data: ExportBody, current_user: dict = Depends(get_current_user)):
        await write_audit(
            db, current_user, "export",
            sanitize_input(data.resource)[:80],
            sanitize_input(data.resource_id)[:80],
            sanitize_input(data.detail)[:500],
        )
        return {"ok": True}

    async def seed_indexes():
        await db.notifications.create_index("user_id")
        await db.notifications.create_index([("user_id", 1), ("dedupe_key", 1)])
        await db.audit_log.create_index("at")

    router.seed_indexes = seed_indexes  # type: ignore
    return router
