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
_WEEKDAYS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def _task_deadline(task: dict) -> str:
    raw = str(task.get("deadline") or "")[:10]
    return raw if re.match(r"^\d{4}-\d{2}-\d{2}$", raw) else ""


def task_closed_day(task: dict) -> Optional[str]:
    """IST calendar day the task was marked done. Falls back to updated_at."""
    raw = str(task.get("closed_at") or task.get("updated_at") or "").strip()
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return raw[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", raw) else None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).date().isoformat()


def task_on_time(task: dict) -> Optional[bool]:
    """True when Done landed on or before the deadline. None if it cannot be scored."""
    if task.get("status") != "done":
        return None
    deadline = _task_deadline(task)
    if not deadline:
        return None
    closed = task_closed_day(task)
    if not closed:
        return False
    return closed <= deadline


def score_task(task: dict, today: str) -> Optional[str]:
    """on_time, late, open, overdue, not_due — or None when the task has no deadline."""
    if task.get("status") == "cancelled":
        return None
    deadline = _task_deadline(task)
    if not deadline:
        return None
    if task.get("status") == "done":
        return "on_time" if task_on_time(task) else "late"
    if deadline < today:
        return "overdue"
    if deadline == today:
        return "open"
    return "not_due"


def _day_heading(iso_day: str) -> str:
    day = datetime.strptime(iso_day, "%Y-%m-%d")
    return f"{_WEEKDAYS[day.weekday()]} {day.day} {_MONTHS[day.month - 1]}"


def _owner_name(names: dict, owner_id: str) -> str:
    if not owner_id:
        return "Unassigned"
    return names.get(owner_id) or "Unassigned"


def _count_table(headers: list, rows: list) -> str:
    widths = []
    for index, header in enumerate(headers):
        widths.append(max([len(header)] + [len(str(row[index])) for row in rows]))

    def paint(cells: list, header_row: bool) -> str:
        parts = []
        for index, cell in enumerate(cells):
            text = str(cell)
            parts.append(text.ljust(widths[index]) if index == 0 or header_row else text.rjust(widths[index]))
        return "  ".join(parts).rstrip()

    body = [paint(headers, True), "  ".join("-" * width for width in widths)]
    body.extend(paint(row, False) for row in rows)
    return "```\n" + "\n".join(body) + "\n```"


def _open_lines(tasks: list, limit: int = 3) -> list:
    titles = [t.get("title") or "Task" for t in tasks]
    shown = titles[:limit]
    if len(titles) > limit:
        shown.append(f"+{len(titles) - limit} more")
    return [f"• {title}" for title in shown]


def _digest_text(today: str, people: list, on_time: int, late: int, open_count: int) -> str:
    due_people = [p for p in people if p["due"] > 0]
    earlier = [(p["name"], sum(1 for t in p["tasks"] if t["earlier"])) for p in people]
    earlier = [(name, count) for name, count in earlier if count]
    older = sum(count for _name, count in earlier)
    lines = [
        f"*BhuFix · {_day_heading(today)}*",
        f"On time {on_time} · Open {open_count} · Older {older}",
    ]
    if not due_people:
        lines += ["", "No tasks due this day."]
    else:
        lines += [
            "",
            _count_table(
                ["Person", "Done", "Open"],
                [[p["name"], f"{p['on_time']}/{p['due']}", str(p["open"])] for p in due_people],
            ),
        ]
        for person in due_people:
            pending = [t for t in person["tasks"] if not t["earlier"] and t["outcome"] == "open"]
            if not pending:
                continue
            lines += ["", f"*{person['name']}*"]
            lines.extend(_open_lines(pending))
    if earlier:
        lines += ["", "Older still open: " + " · ".join(f"{name} {count}" for name, count in earlier)]
    return "\n".join(lines)


def _month_heading(month: str) -> str:
    year, mon = month.split("-")
    full = (
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    )
    return f"{full[int(mon) - 1]} {year}"


def _month_digest_text(month: str, people: list, totals: dict) -> str:
    still_open = totals["open"] + totals["overdue"]
    lines = [
        f"*BhuFix · {_month_heading(month)}*",
        "",
        f"On time {totals['on_time']}    Late {totals['late']}    Still open {still_open}    Later {totals['not_due']}",
    ]
    if not people:
        lines += ["", "No tasks with a deadline this month."]
        return "\n".join(lines)
    lines += [
        "",
        _count_table(
            ["Person", "Done", "Late", "Open", "Later"],
            [[p["name"], str(p["on_time"]), str(p["late"]), str(p["open"] + p["overdue"]), str(p["not_due"])] for p in people],
        ),
    ]
    for person in people:
        pending = [t for t in person.get("tasks") or [] if t["outcome"] in ("open", "overdue", "late")]
        if not pending:
            continue
        lines += ["", f"*{person['name']}*"]
        lines.extend(_open_lines(pending))
    return "\n".join(lines)


def build_task_productivity(tasks: list, users: list, clients: list, today: str, month: str) -> dict:
    names = {u.get("id"): (u.get("name") or "Unassigned") for u in users if u.get("id")}
    client_names = {c.get("id"): (c.get("name") or "Client") for c in clients if c.get("id")}
    scored = []
    for task in tasks:
        outcome = score_task(task, today)
        if outcome is None:
            continue
        deadline = _task_deadline(task)
        scored.append({
            "id": task.get("id"),
            "title": task.get("title") or "Task",
            "owner_id": task.get("owner_id") or "",
            "client_name": client_names.get(task.get("client_id")) or "Client",
            "status": task.get("status") or "todo",
            "deadline": deadline,
            "outcome": outcome,
            "in_month": deadline.startswith(month),
        })

    by_owner: dict = {}
    for row in scored:
        if row["deadline"] == today or row["outcome"] == "overdue":
            by_owner.setdefault(row["owner_id"], []).append(row)

    people = []
    due_n = on_time_n = late_n = open_n = 0
    for owner_id, rows in by_owner.items():
        due_rows = sorted((r for r in rows if r["deadline"] == today), key=lambda r: r["title"].lower())
        earlier_rows = sorted(
            (r for r in rows if r["outcome"] == "overdue"),
            key=lambda r: (r["deadline"], r["title"].lower()),
        )
        counts = {
            "due": len(due_rows),
            "on_time": sum(1 for r in due_rows if r["outcome"] == "on_time"),
            "late": sum(1 for r in due_rows if r["outcome"] == "late"),
            "open": sum(1 for r in due_rows if r["outcome"] == "open"),
        }
        due_n += counts["due"]
        on_time_n += counts["on_time"]
        late_n += counts["late"]
        open_n += counts["open"]
        tasks_out = []
        for row in due_rows:
            tasks_out.append({
                "id": row["id"],
                "title": row["title"],
                "client_name": row["client_name"],
                "status": row["status"],
                "outcome": row["outcome"],
                "deadline": row["deadline"],
                "earlier": False,
            })
        for row in earlier_rows:
            tasks_out.append({
                "id": row["id"],
                "title": row["title"],
                "client_name": row["client_name"],
                "status": row["status"],
                "outcome": "open",
                "deadline": row["deadline"],
                "earlier": True,
            })
        people.append({
            "owner_id": owner_id,
            "name": _owner_name(names, owner_id),
            **counts,
            "tasks": tasks_out,
        })
    people.sort(key=lambda p: (p["name"].lower(), p["owner_id"]))

    def _bucket(rows: list) -> dict:
        return {
            "on_time": sum(1 for r in rows if r["outcome"] == "on_time"),
            "late": sum(1 for r in rows if r["outcome"] == "late"),
            "open": sum(1 for r in rows if r["outcome"] == "open"),
            "overdue": sum(1 for r in rows if r["outcome"] == "overdue"),
            "not_due": sum(1 for r in rows if r["outcome"] == "not_due"),
        }

    month_rows = [r for r in scored if r["in_month"]]
    month_by_owner: dict = {}
    for row in month_rows:
        month_by_owner.setdefault(row["owner_id"], []).append(row)
    month_people = []
    for owner_id, rows in month_by_owner.items():
        month_people.append({
            "owner_id": owner_id,
            "name": _owner_name(names, owner_id),
            **_bucket(rows),
            "tasks": [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "client_name": row["client_name"],
                    "status": row["status"],
                    "outcome": row["outcome"],
                    "deadline": row["deadline"],
                }
                for row in rows
            ],
        })
    month_people.sort(key=lambda p: (p["name"].lower(), p["owner_id"]))

    return {
        "date": today,
        "today": {
            "label": _day_heading(today),
            "totals": {"due": due_n, "on_time": on_time_n, "late": late_n, "open": open_n},
            "people": people,
        },
        "month": {
            "key": month,
            "totals": _bucket(month_rows),
            "people": month_people,
        },
        "digest_text": _digest_text(today, people, on_time_n, late_n, open_n),
        "month_digest_text": _month_digest_text(month, month_people, _bucket(month_rows)),
    }

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


class InvoiceLine(BaseModel):
    name: str = ""
    quantity: float = 1
    unit_price: float = 0


class InvoiceCreate(BaseModel):
    client_id: str
    billing_period: str = ""
    due_date: str = ""
    discount: float = 0
    tax_rate: float = 0
    notes: str = ""
    client_memo: str = ""
    services: Optional[List[InvoiceLine]] = None
    gstin: str = ""
    bank_name: str = ""
    account_name: str = ""
    account_number: str = ""
    ifsc: str = ""
    upi: str = ""
    terms: str = ""
    bill_to: str = ""


class InvoiceStatusUpdate(BaseModel):
    status: Optional[str] = None
    paid_at: Optional[str] = None
    billing_period: Optional[str] = None
    due_date: Optional[str] = None
    discount: Optional[float] = None
    tax_rate: Optional[float] = None
    notes: Optional[str] = None
    client_memo: Optional[str] = None
    services: Optional[List[InvoiceLine]] = None
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    upi: Optional[str] = None
    terms: Optional[str] = None
    bill_to: Optional[str] = None


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
            if hasattr(s, "model_dump"):
                s = s.model_dump()
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

    def _invoice_lines(services, sanitize_input):
        out = []
        for s in services or []:
            if hasattr(s, "model_dump"):
                s = s.model_dump()
            name = sanitize_input(str(s.get("name") or ""))[:200]
            if not name:
                continue
            out.append({
                "name": name,
                "quantity": float(s.get("quantity") or 0),
                "unit_price": float(s.get("unit_price") or 0),
            })
        return out

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
        if data.services is not None:
            services = _invoice_lines(data.services, sanitize_input)
            if not services:
                services = list((ver or {}).get("services") or [])
        else:
            services = list((ver or {}).get("services") or [])
        period = sanitize_input(data.billing_period or "") or datetime.now(IST).strftime("%B %Y")
        totals = _invoice_totals(services, data.discount, data.tax_rate)
        number = await next_invoice_number()
        inv = {
            "id": str(uuid.uuid4()),
            "number": number,
            "client_id": data.client_id,
            "client_name": client.get("name"),
            "bill_to": sanitize_input(data.bill_to or "") or client.get("name"),
            "package_id": (pkg or {}).get("id"),
            "package_version_id": (ver or {}).get("id"),
            "package_name": (ver or {}).get("name") or (pkg or {}).get("name"),
            "package_version": (ver or {}).get("version"),
            "services": services,
            **totals,
            "billing_period": period,
            "due_date": data.due_date or "",
            "notes": sanitize_input(data.notes or ""),
            "client_memo": sanitize_input(data.client_memo or ""),
            "gstin": sanitize_input(data.gstin or ""),
            "bank_name": sanitize_input(data.bank_name or ""),
            "account_name": sanitize_input(data.account_name or ""),
            "account_number": sanitize_input(data.account_number or ""),
            "ifsc": sanitize_input(data.ifsc or ""),
            "upi": sanitize_input(data.upi or ""),
            "terms": sanitize_input(data.terms or ""),
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
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        body = data.model_dump(exclude_unset=True)
        patch = {"updated_at": _now()}
        if body.get("status"):
            if body["status"] not in INVOICE_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid invoice status")
            patch["status"] = body["status"]
            if body["status"] == "paid":
                patch["paid_at"] = body.get("paid_at") or _now()
        money_keys = (
            "services", "discount", "tax_rate", "billing_period", "due_date", "notes",
            "client_memo", "gstin", "bank_name", "account_name", "account_number",
            "ifsc", "upi", "terms", "bill_to",
        )
        editing = any(k in body for k in money_keys)
        if editing and inv.get("status") in ("paid", "void"):
            raise HTTPException(
                status_code=400,
                detail="Paid or void invoices cannot be edited. Create a new draft if you need a correction.",
            )
        if "services" in body and body["services"] is not None:
            patch["services"] = _invoice_lines(body["services"], sanitize_input)
        for key in (
            "billing_period", "due_date", "notes", "client_memo", "gstin", "bank_name",
            "account_name", "account_number", "ifsc", "upi", "terms", "bill_to",
        ):
            if key in body and body[key] is not None:
                patch[key] = body[key] if key == "due_date" else sanitize_input(str(body[key]))
        if "discount" in body or "tax_rate" in body or "services" in body:
            services = patch.get("services", inv.get("services") or [])
            discount = body["discount"] if body.get("discount") is not None else inv.get("discount") or 0
            tax_rate = body["tax_rate"] if body.get("tax_rate") is not None else inv.get("tax_rate") or 0
            patch.update(_invoice_totals(services, discount, tax_rate))
        await db.invoices.update_one({"id": invoice_id}, {"$set": patch})
        return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

    @router.delete("/invoices/{invoice_id}")
    async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "write")
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        if inv.get("status") == "paid":
            raise HTTPException(
                status_code=400,
                detail="Paid invoices are kept as a record. They cannot be deleted.",
            )
        if inv.get("status") == "sent" and (inv.get("payments") or []):
            raise HTTPException(
                status_code=400,
                detail="This invoice has payments. Mark it paid or void instead of deleting.",
            )
        await db.invoices.delete_one({"id": invoice_id})
        try:
            from p5 import write_audit
            await write_audit(db, current_user, "delete", "invoices", invoice_id, inv.get("number") or "")
        except Exception:
            pass
        return {"ok": True, "id": invoice_id}

    # ── Tasks ─────────────────────────────────────────────────────
    def _task_ok(status: str):
        if status not in TASK_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid task status")

    def _task_client_guard(user: dict, client_id, *, allow_empty: bool = False):
        # Tasks are a shared internal workspace (JIRA-style): every internal
        # member can see and act on any client's tasks. Only client users
        # stay scoped to their own client.
        if user.get("role") == "client":
            rbac.assert_client_access(user, client_id, allow_empty=allow_empty)

    @router.get("/tasks")
    async def list_tasks(
        client_id: Optional[str] = Query(None),
        owner_id: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        month: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "tasks", "read")
        query: dict = {}
        # Tasks are a shared workspace (JIRA-style): every internal member
        # (owner/admin/ops/employee) sees all tasks across all clients.
        # Only client users stay scoped to their own client.
        if current_user.get("role") == "client":
            rbac.apply_client_query(query, current_user)
        if client_id:
            _task_client_guard(current_user, client_id)
            query["client_id"] = client_id
        if owner_id:
            query["owner_id"] = owner_id
        if status:
            query["status"] = status
        if month:
            if not re.match(r"^\d{4}-\d{2}$", month):
                raise HTTPException(status_code=400, detail="month must be YYYY-MM")
            query["$or"] = [
                {"deadline": {"$regex": f"^{month}"}},
                {
                    "$and": [
                        {"$or": [{"deadline": None}, {"deadline": ""}, {"deadline": {"$exists": False}}]},
                        {"created_at": {"$regex": f"^{month}"}},
                    ]
                },
            ]
        rows = await db.tasks.find(query, {"_id": 0}).sort("deadline", 1).to_list(1000)
        if current_user.get("role") == "client":
            for t in rows:
                t.pop("brief", None)
                t.pop("owner_id", None)
                t.pop("unmatched_role", None)
        return rows

    @router.get("/tasks/productivity")
    async def task_productivity(
        month: Optional[str] = Query(None),
        date: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user),
    ):
        rbac.assert_can(current_user, "tasks", "read")
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="Productivity is internal")
        today = datetime.now(IST).date().isoformat()
        if date:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
                raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")
            today = date
        if not month:
            month = today[:7]
        elif not re.match(r"^\d{4}-\d{2}$", month):
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
        rows = await db.tasks.find(
            {"status": {"$ne": "cancelled"}, "deadline": {"$nin": [None, ""]}},
            {
                "_id": 0, "id": 1, "title": 1, "owner_id": 1, "client_id": 1,
                "deadline": 1, "status": 1, "closed_at": 1, "updated_at": 1,
            },
        ).to_list(2000)
        users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
        clients = await db.clients.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
        return build_task_productivity(rows, users, clients, today, month)

    @router.post("/tasks")
    async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "write")
        _task_client_guard(current_user, data.client_id)
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
            "closed_at": None,
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
        _task_client_guard(current_user, task.get("client_id"))
        return task

    @router.put("/tasks/{task_id}")
    async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "tasks", "write")
        task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        _task_client_guard(current_user, task.get("client_id"))
        patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
        if "title" in patch:
            patch["title"] = sanitize_input(patch["title"])
        if "brief" in patch:
            patch["brief"] = sanitize_input(patch["brief"])
        if "status" in patch:
            _task_ok(patch["status"])
            if patch["status"] == "done" and task.get("status") != "done":
                patch["closed_at"] = _now()
            elif patch["status"] != "done":
                patch["closed_at"] = None
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
        _task_client_guard(current_user, task.get("client_id"))
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
        _task_client_guard(current_user, task.get("client_id"))
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
