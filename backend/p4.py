"""P4 Growth operations: ads funnel/A-B, SEO pipeline, web pipeline, competitor DB."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

import rbac

SEO_KINDS = ("keyword", "page", "audit")
SEO_STATUSES = ("research", "tracking", "improving", "done")
WEB_STAGES = (
    "requirement", "sitemap", "wireframe", "ui", "dev",
    "staging", "qa", "client_review", "deployed", "maintenance",
)
BUG_ENV = ("staging", "production")
BUG_STATUSES = ("open", "in_progress", "fixed", "verified")
VARIANT_STATUSES = ("running", "winner", "paused")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def client_ad(row: dict) -> dict:
    variants = []
    for v in row.get("variants") or []:
        variants.append({
            "id": v.get("id"),
            "name": v.get("name") or "",
            "status": v.get("status") or "running",
            "impressions": v.get("impressions") or 0,
            "clicks": v.get("clicks") or 0,
            "spent": v.get("spent") or 0,
        })
    return {
        "id": row.get("id"),
        "client_id": row.get("client_id"),
        "platform": row.get("platform"),
        "name": row.get("name") or "",
        "budget": row.get("budget") or 0,
        "spent": row.get("spent") or 0,
        "impressions": row.get("impressions") or 0,
        "clicks": row.get("clicks") or 0,
        "leads": row.get("leads") or 0,
        "conversions": row.get("conversions") or 0,
        "landing": row.get("landing") or 0,
        "whatsapp": row.get("whatsapp") or 0,
        "qualified": row.get("qualified") or 0,
        "appointments": row.get("appointments") or 0,
        "customers": row.get("customers") or 0,
        "revenue": row.get("revenue") or 0,
        "objective": row.get("objective") or "",
        "month": row.get("month"),
        "year": row.get("year"),
        "variants": variants,
    }


def client_seo(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "client_id": row.get("client_id"),
        "kind": row.get("kind"),
        "url": row.get("url") or "",
        "keyword": row.get("keyword") or "",
        "current_rank": row.get("current_rank"),
        "target_rank": row.get("target_rank"),
        "status": row.get("status"),
        "updated_at": row.get("updated_at"),
    }


def client_site(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "client_id": row.get("client_id"),
        "name": row.get("name") or "",
        "production_url": row.get("production_url") or "",
        "staging_url": row.get("staging_url") or "",
        "stage": row.get("stage"),
        "client_decision": row.get("client_decision") or "",
        "updated_at": row.get("updated_at"),
    }


class SeoCreate(BaseModel):
    client_id: str
    kind: str = "keyword"
    url: str = ""
    keyword: str = ""
    current_rank: Optional[int] = None
    target_rank: Optional[int] = None
    current_state: str = ""
    target_state: str = ""
    owner_id: Optional[str] = None
    status: str = "research"
    notes: str = ""


class SeoPatch(BaseModel):
    kind: Optional[str] = None
    url: Optional[str] = None
    keyword: Optional[str] = None
    current_rank: Optional[int] = None
    target_rank: Optional[int] = None
    current_state: Optional[str] = None
    target_state: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class EvidenceBody(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class SiteCreate(BaseModel):
    client_id: str
    name: str
    production_url: str = ""
    staging_url: str = ""
    stage: str = "requirement"
    notes: str = ""


class SitePatch(BaseModel):
    name: Optional[str] = None
    production_url: Optional[str] = None
    staging_url: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None


class ClientSiteDecide(BaseModel):
    action: str  # approve | changes
    notes: str = ""


class BugCreate(BaseModel):
    site_id: str
    title: str
    environment: str = "staging"
    notes: str = ""


class BugPatch(BaseModel):
    title: Optional[str] = None
    environment: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CompetitorCreate(BaseModel):
    client_id: str
    name: str
    url: str = ""
    instagram: str = ""
    strengths: str = ""
    weaknesses: str = ""
    notes: str = ""


class CompetitorPatch(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    instagram: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    notes: Optional[str] = None


def create_p4_router(db, *, get_current_user, sanitize_input, logger) -> APIRouter:
    router = APIRouter()

    async def _seo_or_404(item_id: str, user: dict) -> dict:
        row = await db.seo_items.find_one({"id": item_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="SEO item not found")
        rbac.assert_client_access(user, row.get("client_id"))
        return row

    async def _site_or_404(site_id: str, user: dict) -> dict:
        row = await db.web_sites.find_one({"id": site_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Site not found")
        rbac.assert_client_access(user, row.get("client_id"))
        return row

    # ── SEO ───────────────────────────────────────────────────────
    @router.get("/seo")
    async def list_seo(
        client_id: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "seo", "read")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            q["client_id"] = client_id
        rows = await db.seo_items.find(q, {"_id": 0}).sort("updated_at", -1).to_list(400)
        if current_user.get("role") == "client":
            return [client_seo(r) for r in rows]
        return rows

    @router.post("/seo")
    async def create_seo(data: SeoCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "seo", "write")
        rbac.assert_client_access(current_user, data.client_id)
        if data.kind not in SEO_KINDS:
            raise HTTPException(status_code=400, detail="kind must be keyword, page, or audit")
        if data.status not in SEO_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid SEO status")
        doc = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "kind": data.kind,
            "url": sanitize_input(data.url)[:400],
            "keyword": sanitize_input(data.keyword)[:120],
            "current_rank": data.current_rank,
            "target_rank": data.target_rank,
            "current_state": sanitize_input(data.current_state)[:2000],
            "target_state": sanitize_input(data.target_state)[:2000],
            "owner_id": data.owner_id or current_user["id"],
            "status": data.status,
            "notes": sanitize_input(data.notes)[:2000],
            "evidence": [],
            "task_id": None,
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.seo_items.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.patch("/seo/{item_id}")
    async def patch_seo(item_id: str, data: SeoPatch, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "seo", "write")
        await _seo_or_404(item_id, current_user)
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        if "kind" in patch and patch["kind"] not in SEO_KINDS:
            raise HTTPException(status_code=400, detail="kind must be keyword, page, or audit")
        if "status" in patch and patch["status"] not in SEO_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid SEO status")
        for key in ("url", "keyword", "current_state", "target_state", "notes"):
            if key in patch and patch[key] is not None:
                patch[key] = sanitize_input(str(patch[key]))
        patch["updated_at"] = _now()
        await db.seo_items.update_one({"id": item_id}, {"$set": patch})
        return await db.seo_items.find_one({"id": item_id}, {"_id": 0})

    @router.post("/seo/{item_id}/evidence")
    async def seo_evidence(item_id: str, data: EvidenceBody, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "seo", "write")
        row = await _seo_or_404(item_id, current_user)
        evidence = list(row.get("evidence") or [])
        evidence.append({
            "id": str(uuid.uuid4()),
            "text": sanitize_input(data.text)[:2000],
            "created_by": current_user["id"],
            "created_at": _now(),
        })
        await db.seo_items.update_one({"id": item_id}, {"$set": {"evidence": evidence, "updated_at": _now()}})
        return await db.seo_items.find_one({"id": item_id}, {"_id": 0})

    @router.post("/seo/{item_id}/task")
    async def seo_to_task(item_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "seo", "write")
        rbac.assert_can(current_user, "tasks", "write")
        row = await _seo_or_404(item_id, current_user)
        if row.get("task_id"):
            existing = await db.tasks.find_one({"id": row["task_id"]}, {"_id": 0})
            if existing:
                existing["already"] = True
                return existing
        owner_id = row.get("owner_id") or current_user["id"]
        owner = await db.users.find_one({"id": owner_id, "is_active": True}, {"_id": 0, "id": 1, "role": 1})
        if not owner or owner.get("role") == "client":
            owner_id = current_user["id"]
        label = row.get("keyword") or row.get("url") or "SEO"
        brief = (
            f"URL: {row.get('url') or '—'}\n"
            f"Keyword: {row.get('keyword') or '—'}\n"
            f"Rank now: {row.get('current_rank') if row.get('current_rank') is not None else '—'} "
            f"→ target {row.get('target_rank') if row.get('target_rank') is not None else '—'}\n"
            f"Now: {row.get('current_state') or '—'}\n"
            f"Target: {row.get('target_state') or '—'}"
        )
        task = {
            "id": str(uuid.uuid4()),
            "client_id": row["client_id"],
            "owner_id": owner_id,
            "title": sanitize_input(f"SEO: {label}")[:200],
            "brief": sanitize_input(brief)[:8000],
            "deadline": None,
            "status": "todo",
            "department": "marketing",
            "job_role": "seo",
            "campaign_id": None,
            "calendar_event_id": None,
            "seo_item_id": row["id"],
            "evidence": [],
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.tasks.insert_one(task)
        await db.seo_items.update_one({"id": item_id}, {"$set": {"task_id": task["id"], "updated_at": _now()}})
        task.pop("_id", None)
        return task

    @router.delete("/seo/{item_id}")
    async def delete_seo(item_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "seo", "write")
        await _seo_or_404(item_id, current_user)
        await db.seo_items.delete_one({"id": item_id})
        try:
            from p5 import write_audit
            await write_audit(db, current_user, "delete", "seo", item_id)
        except Exception:
            pass
        return {"ok": True}

    # ── Web ───────────────────────────────────────────────────────
    @router.get("/web/sites")
    async def list_sites(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "read")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        rows = await db.web_sites.find(q, {"_id": 0}).sort("updated_at", -1).to_list(200)
        if current_user.get("role") == "client":
            return [client_site(r) for r in rows]
        return rows

    @router.post("/web/sites")
    async def create_site(data: SiteCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        rbac.assert_client_access(current_user, data.client_id)
        if data.stage not in WEB_STAGES:
            raise HTTPException(status_code=400, detail="Invalid web stage")
        doc = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "name": sanitize_input(data.name)[:120],
            "production_url": sanitize_input(data.production_url)[:400],
            "staging_url": sanitize_input(data.staging_url)[:400],
            "stage": data.stage,
            "notes": sanitize_input(data.notes)[:4000],
            "client_notes": [],
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.web_sites.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.patch("/web/sites/{site_id}")
    async def patch_site(site_id: str, data: SitePatch, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        await _site_or_404(site_id, current_user)
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        if "stage" in patch and patch["stage"] not in WEB_STAGES:
            raise HTTPException(status_code=400, detail="Invalid web stage")
        if patch.get("stage") == "client_review":
            patch["client_decision"] = ""
        for key in ("name", "production_url", "staging_url", "notes"):
            if key in patch and patch[key] is not None:
                patch[key] = sanitize_input(str(patch[key]))
        patch["updated_at"] = _now()
        await db.web_sites.update_one({"id": site_id}, {"$set": patch})
        return await db.web_sites.find_one({"id": site_id}, {"_id": 0})

    @router.post("/web/sites/{site_id}/client-decide")
    async def client_site_decide(site_id: str, data: ClientSiteDecide, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != "client":
            raise HTTPException(status_code=403, detail="Only the client can decide this review")
        row = await _site_or_404(site_id, current_user)
        if row.get("stage") != "client_review":
            raise HTTPException(status_code=400, detail="This site is not waiting for your review")
        if data.action not in ("approve", "changes"):
            raise HTTPException(status_code=400, detail="action must be approve or changes")
        notes = list(row.get("client_notes") or [])
        if data.notes:
            notes.append({"text": sanitize_input(data.notes), "created_at": _now()})
        if data.action == "approve":
            patch = {
                "client_decision": "approved",
                "client_notes": notes,
                "updated_at": _now(),
            }
        else:
            patch = {
                "stage": "qa",
                "client_decision": "changes",
                "client_notes": notes,
                "updated_at": _now(),
            }
        await db.web_sites.update_one({"id": site_id}, {"$set": patch})
        out = await db.web_sites.find_one({"id": site_id}, {"_id": 0})
        try:
            from p5 import write_audit, notify_many, assigned_staff_ids, leadership_ids
            await write_audit(db, current_user, data.action, "web", site_id, row.get("name") or "")
            ids = await assigned_staff_ids(db, row.get("client_id"))
            ids.extend(await leadership_ids(db))
            if data.action == "approve":
                await notify_many(db, ids, "action", "Client approved the site", "Deploy when ready.", "/dashboard/web", f"web-approve:{site_id}")
            else:
                await notify_many(db, ids, "action", "Client sent the site back to QA", row.get("name") or "", "/dashboard/web", f"web-changes:{site_id}")
        except Exception:
            pass
        return client_site(out)

    @router.delete("/web/sites/{site_id}")
    async def delete_site(site_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        await _site_or_404(site_id, current_user)
        await db.web_bugs.delete_many({"site_id": site_id})
        await db.web_sites.delete_one({"id": site_id})
        try:
            from p5 import write_audit
            await write_audit(db, current_user, "delete", "web", site_id)
        except Exception:
            pass
        return {"ok": True}

    @router.get("/web/bugs")
    async def list_bugs(
        site_id: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "web", "read")
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="Bug list is internal")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        if site_id:
            q["site_id"] = site_id
        return await db.web_bugs.find(q, {"_id": 0}).sort("created_at", -1).to_list(400)

    @router.post("/web/bugs")
    async def create_bug(data: BugCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        site = await _site_or_404(data.site_id, current_user)
        if data.environment not in BUG_ENV:
            raise HTTPException(status_code=400, detail="environment must be staging or production")
        doc = {
            "id": str(uuid.uuid4()),
            "site_id": data.site_id,
            "client_id": site.get("client_id"),
            "title": sanitize_input(data.title)[:200],
            "environment": data.environment,
            "status": "open",
            "notes": sanitize_input(data.notes)[:2000],
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.web_bugs.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.patch("/web/bugs/{bug_id}")
    async def patch_bug(bug_id: str, data: BugPatch, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        row = await db.web_bugs.find_one({"id": bug_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Bug not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        if "environment" in patch and patch["environment"] not in BUG_ENV:
            raise HTTPException(status_code=400, detail="environment must be staging or production")
        if "status" in patch and patch["status"] not in BUG_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid bug status")
        for key in ("title", "notes"):
            if key in patch and patch[key] is not None:
                patch[key] = sanitize_input(str(patch[key]))
        patch["updated_at"] = _now()
        await db.web_bugs.update_one({"id": bug_id}, {"$set": patch})
        return await db.web_bugs.find_one({"id": bug_id}, {"_id": 0})

    @router.delete("/web/bugs/{bug_id}")
    async def delete_bug(bug_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "web", "write")
        row = await db.web_bugs.find_one({"id": bug_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Bug not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        await db.web_bugs.delete_one({"id": bug_id})
        return {"ok": True}

    # ── Competitors ───────────────────────────────────────────────
    @router.get("/competitors")
    async def list_competitors(
        client_id: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "competitors", "read")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            q["client_id"] = client_id
        return await db.competitors.find(q, {"_id": 0}).sort("name", 1).to_list(300)

    @router.post("/competitors")
    async def create_competitor(data: CompetitorCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "competitors", "write")
        rbac.assert_client_access(current_user, data.client_id)
        doc = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "name": sanitize_input(data.name)[:120],
            "url": sanitize_input(data.url)[:400],
            "instagram": sanitize_input(data.instagram)[:120],
            "strengths": sanitize_input(data.strengths)[:2000],
            "weaknesses": sanitize_input(data.weaknesses)[:2000],
            "notes": sanitize_input(data.notes)[:2000],
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.competitors.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.patch("/competitors/{comp_id}")
    async def patch_competitor(comp_id: str, data: CompetitorPatch, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "competitors", "write")
        row = await db.competitors.find_one({"id": comp_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Competitor not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
        for key in ("name", "url", "instagram", "strengths", "weaknesses", "notes"):
            if key in patch and patch[key] is not None:
                patch[key] = sanitize_input(str(patch[key]))
        patch["updated_at"] = _now()
        await db.competitors.update_one({"id": comp_id}, {"$set": patch})
        return await db.competitors.find_one({"id": comp_id}, {"_id": 0})

    @router.delete("/competitors/{comp_id}")
    async def delete_competitor(comp_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "competitors", "write")
        row = await db.competitors.find_one({"id": comp_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Competitor not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        await db.competitors.delete_one({"id": comp_id})
        try:
            from p5 import write_audit
            await write_audit(db, current_user, "delete", "competitors", comp_id, row.get("name") or "")
        except Exception:
            pass
        return {"ok": True}

    async def seed_indexes():
        await db.seo_items.create_index("client_id")
        await db.web_sites.create_index("client_id")
        await db.web_bugs.create_index("site_id")
        await db.competitors.create_index("client_id")

    router.seed_indexes = seed_indexes  # type: ignore
    return router
