"""P0 OS modules: packages (versioned), invoices, tasks, assets with signed URLs."""
from __future__ import annotations

import hashlib
import hmac
import mimetypes
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pymongo import ReturnDocument
from pydantic import BaseModel, Field

import rbac

IST = ZoneInfo("Asia/Kolkata")
ASSET_BUCKETS = (
    "brand", "raw", "reference", "working", "review",
    "approved", "published", "reports", "invoices",
)
TASK_STATUSES = (
    "todo", "in_progress", "in_review", "changes_requested", "done", "cancelled",
)
INVOICE_STATUSES = ("draft", "sent", "paid", "void")
LOGO_TTL = 3600
FILE_TTL = 900
MAX_ASSET_BYTES = 40 * 1024 * 1024
MAX_LOGO_BYTES = 3 * 1024 * 1024
ALLOWED_PREFIXES = (
    "image/", "video/", "application/pdf", "application/zip",
    "application/x-zip-compressed", "text/plain",
)

DEFAULT_PACKAGES = [
    {
        "slug": "silver",
        "name": "Silver",
        "services": [
            {"name": "Reels / short videos", "quantity": 8, "unit_price": 0},
            {"name": "Static posts", "quantity": 8, "unit_price": 0},
        ],
    },
    {
        "slug": "gold",
        "name": "Gold",
        "services": [
            {"name": "Reels / short videos", "quantity": 12, "unit_price": 0},
            {"name": "Static posts", "quantity": 12, "unit_price": 0},
            {"name": "Ads management", "quantity": 1, "unit_price": 0},
        ],
    },
    {
        "slug": "diamond",
        "name": "Diamond",
        "services": [
            {"name": "Reels / short videos", "quantity": 20, "unit_price": 0},
            {"name": "Static posts", "quantity": 20, "unit_price": 0},
            {"name": "Ads management", "quantity": 1, "unit_price": 0},
            {"name": "SEO retainer", "quantity": 1, "unit_price": 0},
        ],
    },
    {
        "slug": "customised",
        "name": "Customised",
        "services": [
            {"name": "Custom scope", "quantity": 1, "unit_price": 0},
        ],
    },
]


class PackageService(BaseModel):
    name: str
    quantity: float = 1
    unit_price: float = 0


class PackageVersionCreate(BaseModel):
    services: List[PackageService]
    name: Optional[str] = None


class InvoiceCreate(BaseModel):
    client_id: str
    billing_period: str = ""
    due_date: str = ""
    discount: float = 0
    tax_rate: float = 0
    notes: str = ""


class InvoiceStatusUpdate(BaseModel):
    status: str
    paid_at: Optional[str] = None


class TaskCreate(BaseModel):
    client_id: str
    owner_id: str
    title: str = Field(..., min_length=1, max_length=200)
    brief: str = Field(default="", max_length=8000)
    deadline: Optional[str] = None
    status: str = "todo"
    department: Optional[str] = None
    job_role: Optional[str] = None
    campaign_id: Optional[str] = None
    calendar_event_id: Optional[str] = None


class TaskUpdate(BaseModel):
    owner_id: Optional[str] = None
    title: Optional[str] = None
    brief: Optional[str] = None
    deadline: Optional[str] = None
    status: Optional[str] = None
    department: Optional[str] = None
    job_role: Optional[str] = None
    campaign_id: Optional[str] = None
    calendar_event_id: Optional[str] = None


class TaskEvidenceCreate(BaseModel):
    type: str = "note"  # note | url | asset
    value: str = ""
    asset_id: Optional[str] = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_name(name: str) -> str:
    base = Path(name or "file").name
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._") or "file"
    return base[:180]


def create_p0_router(
    db,
    *,
    get_current_user,
    secret_key: str,
    sanitize_input,
    assets_dir: Path,
    logger,
):
    router = APIRouter()
    assets_dir.mkdir(parents=True, exist_ok=True)

    def _sign(asset_id: str, ttl: int) -> dict:
        exp = int(datetime.now(timezone.utc).timestamp()) + ttl
        msg = f"{asset_id}:{exp}".encode()
        sig = hmac.new(secret_key.encode(), msg, hashlib.sha256).hexdigest()
        return {"exp": exp, "sig": sig, "url": f"/api/assets/{asset_id}/file?exp={exp}&sig={sig}"}

    def _verify_sig(asset_id: str, exp: int, sig: str):
        try:
            exp_i = int(exp)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid signature")
        if exp_i < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(status_code=401, detail="Signed URL expired")
        expected = hmac.new(
            secret_key.encode(),
            f"{asset_id}:{exp_i}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig or ""):
            raise HTTPException(status_code=403, detail="Invalid signature")

    def _with_logo(client: Optional[dict]) -> Optional[dict]:
        if not client:
            return client
        aid = client.get("logo_asset_id")
        if aid:
            client["logo_url"] = _sign(aid, LOGO_TTL)["url"]
        return client

    async def _client_or_404(client_id: str) -> dict:
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return client

    def _invoice_totals(services, discount=0, tax_rate=0):
        subtotal = 0.0
        for s in services or []:
            subtotal += float(s.get("quantity") or 0) * float(s.get("unit_price") or 0)
        discount = float(discount or 0)
        tax_rate = float(tax_rate or 0)
        after = max(subtotal - discount, 0)
        tax = after * (tax_rate / 100.0)
        return {
            "subtotal": round(subtotal, 2),
            "discount": round(discount, 2),
            "tax_rate": tax_rate,
            "tax": round(tax, 2),
            "total": round(after + tax, 2),
        }

    async def next_invoice_number() -> str:
        year = datetime.now(IST).year
        doc = await db.invoice_counters.find_one_and_update(
            {"year": year},
            {"$inc": {"last": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        n = int((doc or {}).get("last") or 1)
        return f"BF-{year}-{n:04d}"

    async def seed_packages():
        for spec in DEFAULT_PACKAGES:
            existing = await db.packages.find_one({"slug": spec["slug"]})
            if existing:
                continue
            pid = str(uuid.uuid4())
            vid = str(uuid.uuid4())
            now = _now()
            pkg = {
                "id": pid,
                "slug": spec["slug"],
                "name": spec["name"],
                "current_version_id": vid,
                "current_version": 1,
                "is_active": True,
                "created_at": now,
            }
            ver = {
                "id": vid,
                "package_id": pid,
                "version": 1,
                "name": spec["name"],
                "services": spec["services"],
                "created_at": now,
                "created_by": None,
            }
            await db.packages.insert_one(pkg)
            await db.package_versions.insert_one(ver)
            logger.info("Seeded package %s v1", spec["name"])

    router.seed_packages = seed_packages  # type: ignore

    # ── Packages ──────────────────────────────────────────────────
    @router.get("/packages")
    async def list_packages(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "packages", "read")
        pkgs = await db.packages.find({}, {"_id": 0}).sort("name", 1).to_list(50)
        out = []
        for p in pkgs:
            ver = await db.package_versions.find_one(
                {"id": p.get("current_version_id")}, {"_id": 0}
            )
            out.append({**p, "current": ver})
        return out

    @router.get("/packages/{package_id}")
    async def get_package(package_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "packages", "read")
        pkg = await db.packages.find_one({"id": package_id}, {"_id": 0})
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
        versions = await db.package_versions.find(
            {"package_id": package_id}, {"_id": 0}
        ).sort("version", -1).to_list(100)
        return {**pkg, "versions": versions}

    @router.post("/packages/{package_id}/versions")
    async def create_package_version(
        package_id: str,
        data: PackageVersionCreate,
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "packages", "write")
        pkg = await db.packages.find_one({"id": package_id}, {"_id": 0})
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
        nxt = int(pkg.get("current_version") or 1) + 1
        vid = str(uuid.uuid4())
        ver = {
            "id": vid,
            "package_id": package_id,
            "version": nxt,
            "name": sanitize_input(data.name or pkg["name"]),
            "services": [s.model_dump() for s in data.services],
            "created_at": _now(),
            "created_by": current_user["id"],
        }
        await db.package_versions.insert_one(ver)
        await db.packages.update_one(
            {"id": package_id},
            {"$set": {"current_version_id": vid, "current_version": nxt, "updated_at": _now()}},
        )
        ver.pop("_id", None)
        return ver

    # ── Invoices ──────────────────────────────────────────────────
    @router.get("/invoices")
    async def list_invoices(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "read")
        query = {}
        rbac.apply_client_query(query, current_user)
        if current_user.get("role") == "client":
            query["status"] = {"$in": ["sent", "paid"]}
        rows = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        if current_user.get("role") == "client":
            from p3 import client_invoice
            return [client_invoice(r) for r in rows]
        return rows

    @router.post("/invoices")
    async def create_invoice(data: InvoiceCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "write")
        rbac.assert_client_access(current_user, data.client_id)
        client = await _client_or_404(data.client_id)
        pkg = None
        ver = None
        if client.get("package_id"):
            pkg = await db.packages.find_one({"id": client["package_id"]}, {"_id": 0})
            vid = client.get("package_version_id") or (pkg or {}).get("current_version_id")
            if vid:
                ver = await db.package_versions.find_one({"id": vid}, {"_id": 0})
        services = list((ver or {}).get("services") or [])
        totals = _invoice_totals(services, data.discount, data.tax_rate)
        number = await next_invoice_number()
        inv = {
            "id": str(uuid.uuid4()),
            "number": number,
            "client_id": data.client_id,
            "client_name": client.get("name"),
            "package_id": (pkg or {}).get("id"),
            "package_version_id": (ver or {}).get("id"),
            "package_name": (ver or {}).get("name") or (pkg or {}).get("name"),
            "package_version": (ver or {}).get("version"),
            "services": services,
            **totals,
            "billing_period": sanitize_input(data.billing_period or ""),
            "due_date": data.due_date or "",
            "notes": sanitize_input(data.notes or ""),
            "status": "draft",
            "created_by": current_user["id"],
            "created_at": _now(),
        }
        await db.invoices.insert_one(inv)
        inv.pop("_id", None)
        return inv

    @router.patch("/invoices/{invoice_id}")
    async def update_invoice_status(
        invoice_id: str,
        data: InvoiceStatusUpdate,
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "invoices", "write")
        if data.status not in INVOICE_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid invoice status")
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        patch = {"status": data.status, "updated_at": _now()}
        if data.status == "paid":
            patch["paid_at"] = data.paid_at or _now()
        await db.invoices.update_one({"id": invoice_id}, {"$set": patch})
        return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

    # ── Tasks ─────────────────────────────────────────────────────
    def _task_ok(status: str):
        if status not in TASK_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid task status")

    @router.get("/tasks")
    async def list_tasks(
        client_id: Optional[str] = Query(None),
        owner_id: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "tasks", "read")
        query: dict = {}
        rbac.apply_client_query(query, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            query["client_id"] = client_id
        if owner_id:
            query["owner_id"] = owner_id
        if status:
            query["status"] = status
        rows = await db.tasks.find(query, {"_id": 0}).sort("deadline", 1).to_list(1000)
        if current_user.get("role") == "client":
            for t in rows:
                t.pop("brief", None)
                t.pop("owner_id", None)
                t.pop("unmatched_role", None)
        return rows

    @router.post("/tasks")
    async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "write")
        rbac.assert_client_access(current_user, data.client_id)
        _task_ok(data.status)
        owner = await db.users.find_one({"id": data.owner_id, "is_active": True}, {"_id": 0, "id": 1, "name": 1, "role": 1})
        if not owner:
            raise HTTPException(status_code=400, detail="Task owner not found")
        if owner.get("role") == "client":
            raise HTTPException(status_code=400, detail="A client cannot own an internal task")
        task = {
            "id": str(uuid.uuid4()),
            "client_id": data.client_id,
            "owner_id": data.owner_id,
            "title": sanitize_input(data.title),
            "brief": sanitize_input(data.brief or ""),
            "deadline": data.deadline,
            "status": data.status,
            "department": data.department,
            "job_role": data.job_role,
            "campaign_id": data.campaign_id,
            "calendar_event_id": data.calendar_event_id,
            "evidence": [],
            "created_by": current_user["id"],
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.tasks.insert_one(task)
        task.pop("_id", None)
        return task

    @router.get("/tasks/{task_id}")
    async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "read")
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        rbac.assert_client_access(current_user, task.get("client_id"))
        return task

    @router.put("/tasks/{task_id}")
    async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "write")
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        rbac.assert_client_access(current_user, task.get("client_id"))
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if "title" in patch:
            patch["title"] = sanitize_input(patch["title"])
        if "brief" in patch:
            patch["brief"] = sanitize_input(patch["brief"])
        if "status" in patch:
            _task_ok(patch["status"])
        if "owner_id" in patch:
            owner = await db.users.find_one({"id": patch["owner_id"], "is_active": True}, {"_id": 0, "role": 1})
            if not owner or owner.get("role") == "client":
                raise HTTPException(status_code=400, detail="Invalid task owner")
        patch["updated_at"] = _now()
        await db.tasks.update_one({"id": task_id}, {"$set": patch})
        return await db.tasks.find_one({"id": task_id}, {"_id": 0})

    @router.post("/tasks/{task_id}/evidence")
    async def add_task_evidence(
        task_id: str,
        data: TaskEvidenceCreate,
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "tasks", "write")
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        rbac.assert_client_access(current_user, task.get("client_id"))
        if data.type not in ("note", "url", "asset"):
            raise HTTPException(status_code=400, detail="Evidence type must be note, url, or asset")
        item = {
            "id": str(uuid.uuid4()),
            "type": data.type,
            "value": sanitize_input(data.value or ""),
            "asset_id": data.asset_id,
            "created_by": current_user["id"],
            "created_at": _now(),
        }
        await db.tasks.update_one(
            {"id": task_id},
            {"$push": {"evidence": item}, "$set": {"updated_at": _now()}},
        )
        return item

    @router.delete("/tasks/{task_id}")
    async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "write")
        if not rbac.is_leadership(current_user) and current_user.get("role") != "employee":
            raise HTTPException(status_code=403, detail="Cannot delete this task")
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        rbac.assert_client_access(current_user, task.get("client_id"))
        if current_user.get("role") == "employee" and task.get("created_by") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete tasks you created")
        await db.tasks.delete_one({"id": task_id})
        return {"message": "Task deleted"}

    # ── Assets ────────────────────────────────────────────────────
    def _group_key(client_id: str, bucket: str, filename: str) -> str:
        stem = Path(filename).stem.lower()
        raw = f"{client_id}:{bucket}:{stem}"
        return hashlib.sha256(raw.encode()).hexdigest()[:24]

    def _serialize_asset(doc: dict, ttl: int = FILE_TTL) -> dict:
        doc = dict(doc)
        doc.pop("_id", None)
        signed = _sign(doc["id"], ttl)
        doc["url"] = signed["url"]
        doc["url_expires_at"] = signed["exp"]
        return doc

    async def _store_upload(
        *,
        upload: UploadFile,
        current_user: dict,
        client_id: str,
        bucket: str,
        task_id: Optional[str],
        campaign_id: Optional[str],
        max_bytes: int,
        logo: bool = False,
    ) -> dict:
        rbac.assert_client_access(current_user, client_id)
        if bucket not in ASSET_BUCKETS:
            raise HTTPException(status_code=400, detail="Invalid asset bucket")
        if current_user.get("role") == "client" and bucket not in rbac.CLIENT_ASSET_BUCKETS:
            raise HTTPException(status_code=403, detail="Clients cannot upload to this folder")
        filename = _safe_name(upload.filename or "upload")
        content_type = upload.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        if not any(content_type.startswith(p.rstrip("*")) or content_type == p for p in ALLOWED_PREFIXES):
            if not content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="File type not allowed")
        data = await upload.read()
        if len(data) > max_bytes:
            raise HTTPException(status_code=400, detail="File is too large")
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")
        asset_id = str(uuid.uuid4())
        ext = Path(filename).suffix[:12]
        rel = f"{client_id}/{asset_id}{ext}"
        dest = assets_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        group = _group_key(client_id, bucket, filename)
        last = await db.assets.find({"version_group": group}).sort("version", -1).to_list(1)
        version = (last[0]["version"] + 1) if last else 1
        doc = {
            "id": asset_id,
            "client_id": client_id,
            "task_id": task_id,
            "campaign_id": campaign_id,
            "bucket": bucket,
            "version": version,
            "version_group": group,
            "label": "final" if logo else f"v{version}",
            "filename": filename,
            "content_type": content_type,
            "size": len(data),
            "storage_path": rel,
            "locked": False,
            "uploaded_by": current_user["id"],
            "created_at": _now(),
        }
        await db.assets.insert_one(doc)
        return _serialize_asset(doc, LOGO_TTL if logo else FILE_TTL)

    @router.get("/assets")
    async def list_assets(
        client_id: Optional[str] = Query(None),
        task_id: Optional[str] = Query(None),
        bucket: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "assets", "read")
        query: dict = {}
        rbac.apply_client_query(query, current_user)
        if client_id:
            rbac.assert_client_access(current_user, client_id)
            query["client_id"] = client_id
        if task_id:
            query["task_id"] = task_id
        if current_user.get("role") == "client":
            if bucket:
                if bucket not in rbac.CLIENT_ASSET_BUCKETS:
                    return []
                query["bucket"] = bucket
            else:
                query["bucket"] = {"$in": list(rbac.CLIENT_ASSET_BUCKETS)}
        elif bucket:
            query["bucket"] = bucket
        rows = await db.assets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [_serialize_asset(r) for r in rows]

    @router.post("/assets")
    async def upload_asset(
        client_id: str = Form(...),
        bucket: str = Form("working"),
        task_id: Optional[str] = Form(None),
        campaign_id: Optional[str] = Form(None),
        file: UploadFile = File(...),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "assets", "write")
        if task_id:
            task = await db.tasks.find_one({"id": task_id}, {"_id": 0, "client_id": 1})
            if not task:
                raise HTTPException(status_code=400, detail="Task not found")
            if task["client_id"] != client_id:
                raise HTTPException(status_code=400, detail="Task does not belong to this client")
        return await _store_upload(
            upload=file,
            current_user=current_user,
            client_id=client_id,
            bucket=bucket,
            task_id=task_id or None,
            campaign_id=campaign_id or None,
            max_bytes=MAX_ASSET_BYTES,
        )

    @router.get("/assets/{asset_id}/file")
    async def download_asset(
        asset_id: str,
        exp: int = Query(...),
        sig: str = Query(...),
    ):
        _verify_sig(asset_id, exp, sig)
        doc = await db.assets.find_one({"id": asset_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Asset not found")
        path = assets_dir / doc["storage_path"]
        if not path.is_file():
            raise HTTPException(status_code=404, detail="File missing")
        return FileResponse(
            path,
            media_type=doc.get("content_type") or "application/octet-stream",
            filename=doc.get("filename"),
        )

    @router.delete("/assets/{asset_id}")
    async def delete_asset(asset_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "assets", "write")
        doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Asset not found")
        rbac.assert_client_access(current_user, doc.get("client_id"))
        if doc.get("locked"):
            raise HTTPException(status_code=400, detail="Approved files cannot be deleted. Upload a new version.")
        if current_user.get("role") == "employee" and doc.get("uploaded_by") != current_user["id"]:
            if not rbac.is_leadership(current_user):
                raise HTTPException(status_code=403, detail="You can only delete files you uploaded")
        path = assets_dir / doc["storage_path"]
        try:
            if path.is_file():
                path.unlink()
        except OSError:
            pass
        await db.assets.delete_one({"id": asset_id})
        return {"message": "Asset deleted"}

    # used by server.py for client logos
    router._store_upload = _store_upload  # type: ignore
    router._with_logo = _with_logo  # type: ignore
    router._sign = _sign  # type: ignore
    return router
