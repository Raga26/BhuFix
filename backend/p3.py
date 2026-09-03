"""P3 Client delivery: publish queue, client portal, exact-version approve, invoices."""
from __future__ import annotations

import html
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from zoneinfo import ZoneInfo

import rbac
from p2 import normalize_cal_status

IST = ZoneInfo("Asia/Kolkata")
CLIENT_CAL = ("approved", "scheduled", "published", "postponed")
QUEUE_STATUSES = ("approved", "scheduled")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class PresentBody(BaseModel):
    type: str
    resource_id: str


class ClientDecide(BaseModel):
    action: str  # approve | changes_requested
    notes: str = ""


class QueueAction(BaseModel):
    action: str  # schedule | publish | postpone
    time: Optional[str] = None


class InvoiceSend(BaseModel):
    client_memo: str = ""


class InvoicePayment(BaseModel):
    amount: float = Field(..., gt=0)
    method: str = "bank"
    note: str = ""


def resource_snapshot(kind: str, resource: dict) -> dict:
    if kind == "clip":
        return {
            "title": resource.get("title") or "",
            "hook": resource.get("hook") or "",
            "body": resource.get("body") or "",
            "cta": resource.get("cta") or "",
            "category": resource.get("category") or "",
        }
    return {
        "filename": resource.get("filename") or "",
        "label": resource.get("label") or f"v{resource.get('version') or 1}",
        "content_type": resource.get("content_type") or "",
        "asset_id": resource.get("id"),
    }


def client_invoice(inv: dict) -> dict:
    d = dict(inv)
    d.pop("_id", None)
    d.pop("internal_notes", None)
    d.pop("created_by", None)
    d.pop("notes", None)
    pays = []
    for p in d.get("payments") or []:
        pays.append({
            "id": p.get("id"),
            "amount": p.get("amount"),
            "method": p.get("method"),
            "note": p.get("note"),
            "created_at": p.get("created_at"),
        })
    d["payments"] = pays
    return d


def client_approval(row: dict) -> dict:
    notes = []
    for n in row.get("client_notes") or []:
        notes.append({"text": n.get("text") or "", "created_at": n.get("created_at")})
    return {
        "id": row.get("id"),
        "type": row.get("type"),
        "resource_id": row.get("resource_id"),
        "client_id": row.get("client_id"),
        "version": row.get("version"),
        "version_label": row.get("version_label"),
        "status": row.get("status"),
        "submitted_at": row.get("submitted_at"),
        "decided_at": row.get("decided_at"),
        "snapshot": row.get("snapshot") or {},
        "audience": "client",
        "client_notes": notes,
    }


def _rupee(n) -> str:
    return f"₹{float(n or 0):,.2f}"


def invoice_html(inv: dict) -> str:
    esc = html.escape
    services = inv.get("services") or []
    rows = "".join(
        f"<tr><td>{esc(str(s.get('name') or ''))}</td>"
        f"<td class='r'>{s.get('quantity') or 0}</td>"
        f"<td class='r'>{_rupee(s.get('unit_price'))}</td>"
        f"<td class='r'>{_rupee(float(s.get('quantity') or 0) * float(s.get('unit_price') or 0))}</td></tr>"
        for s in services
    ) or "<tr><td colspan='4'>No line items.</td></tr>"
    payments = inv.get("payments") or []
    paid = sum(float(p.get("amount") or 0) for p in payments)
    due_left = max(float(inv.get("total") or 0) - paid, 0)
    pay_rows = "".join(
        f"<tr><td>{esc(str(p.get('created_at') or '')[:10])}</td>"
        f"<td>{esc(p.get('method') or '')}</td>"
        f"<td class='r'>{_rupee(p.get('amount'))}</td>"
        f"<td>{esc(p.get('note') or '')}</td></tr>"
        for p in payments
    )
    memo = esc(inv.get("client_memo") or inv.get("notes") or "")
    bill_to = esc(inv.get("bill_to") or inv.get("client_name") or "")
    gstin = esc(inv.get("gstin") or "")
    bank_bits = []
    if inv.get("account_name"):
        bank_bits.append(f"<div><span>Account name</span>{esc(inv.get('account_name'))}</div>")
    if inv.get("bank_name"):
        bank_bits.append(f"<div><span>Bank</span>{esc(inv.get('bank_name'))}</div>")
    if inv.get("account_number"):
        bank_bits.append(f"<div><span>Account no.</span>{esc(inv.get('account_number'))}</div>")
    if inv.get("ifsc"):
        bank_bits.append(f"<div><span>IFSC</span>{esc(inv.get('ifsc'))}</div>")
    if inv.get("upi"):
        bank_bits.append(f"<div><span>UPI</span>{esc(inv.get('upi'))}</div>")
    bank_html = "".join(bank_bits)
    terms = esc(inv.get("terms") or (
        "This invoice covers the billing period shown above — the month (or dates) of studio work being billed. "
        "Payment is due by the date listed. For questions: bhufix@gmail.com / +91 93423 43690."
    ))
    status = esc((inv.get("status") or "draft").upper())
    pkg = esc(inv.get("package_name") or "")
    pver = esc(str(inv.get("package_version") or ""))
    period = esc(inv.get("billing_period") or "—")
    due = esc(inv.get("due_date") or "—")
    number = esc(inv.get("number") or "Invoice")
    issued = esc(str(inv.get("created_at") or "")[:10])
    logo = """<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#E8734A"/>
      <text x="32" y="44" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="38" font-weight="800" fill="#ffffff">B</text>
    </svg>"""
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice {number} · BhuFix</title>
<style>
  :root {{ --navy:#0B1224; --coral:#E8734A; --ink:#1B2233; --muted:#5C6578; --line:#E6E9F0; --paper:#F7F8FC; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#e8eaf1; color:var(--ink); font-family: Arial, Helvetica, sans-serif; }}
  .sheet {{ max-width:800px; margin:28px auto; background:#fff; padding:40px 44px 36px; box-shadow:0 8px 32px rgba(11,18,36,.08); }}
  .top {{ display:flex; justify-content:space-between; gap:24px; align-items:flex-start; border-bottom:3px solid var(--navy); padding-bottom:20px; }}
  .brand {{ display:flex; gap:12px; align-items:center; }}
  .word {{ font-size:26px; font-weight:800; letter-spacing:-.03em; color:var(--navy); }}
  .word span {{ color:var(--coral); }}
  .tag {{ font-size:11px; color:var(--muted); letter-spacing:.12em; text-transform:uppercase; margin-top:2px; }}
  .inv-meta {{ text-align:right; }}
  .inv-meta h1 {{ margin:0; font-size:22px; color:var(--navy); letter-spacing:.08em; }}
  .stamp {{ display:inline-block; margin-top:8px; font-size:11px; font-weight:700; letter-spacing:.08em; padding:4px 8px; border:1px solid var(--coral); color:var(--coral); }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:22px 0 8px; }}
  .box h3 {{ margin:0 0 6px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--coral); }}
  .box p {{ margin:0; font-size:13px; line-height:1.55; color:var(--ink); }}
  .muted {{ color:var(--muted); }}
  table {{ width:100%; border-collapse:collapse; margin-top:18px; font-size:13px; }}
  th {{ text-align:left; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#fff; background:var(--navy); padding:10px 8px; }}
  th.r, td.r {{ text-align:right; }}
  td {{ padding:10px 8px; border-bottom:1px solid var(--line); }}
  .totals {{ width:280px; margin-left:auto; margin-top:12px; font-size:13px; }}
  .totals div {{ display:flex; justify-content:space-between; padding:4px 0; color:var(--muted); }}
  .totals .grand {{ color:var(--navy); font-size:16px; font-weight:800; border-top:2px solid var(--navy); margin-top:6px; padding-top:8px; }}
  .pay {{ margin-top:28px; background:var(--paper); padding:16px 18px; }}
  .pay h3 {{ margin:0 0 10px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--navy); }}
  .foot {{ display:grid; grid-template-columns:1.2fr .8fr; gap:20px; margin-top:28px; font-size:12px; color:var(--muted); }}
  .foot span {{ color:var(--muted); display:inline-block; min-width:96px; }}
  .note {{ margin-top:16px; font-size:13px; line-height:1.5; }}
  @media print {{
    body {{ background:#fff; }}
    .sheet {{ margin:0; box-shadow:none; max-width:none; padding:18mm; }}
  }}
  @media (max-width:640px) {{
    .sheet {{ margin:0; padding:22px 16px; }}
    .top, .grid, .foot {{ grid-template-columns:1fr; display:grid; }}
    .inv-meta {{ text-align:left; }}
    .totals {{ width:100%; }}
  }}
</style></head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        {logo}
        <div>
          <div class="word">Bhu<span>Fix</span></div>
          <div class="tag">Digital marketing studio</div>
        </div>
      </div>
      <div class="inv-meta">
        <h1>INVOICE</h1>
        <div style="margin-top:6px;font-size:14px;font-weight:700;color:var(--navy)">{number}</div>
        <div class="stamp">{status}</div>
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <h3>From</h3>
        <p><b>BhuFix</b><br>
        Udumalpet · Coimbatore · Tirupur<br>
        Tamil Nadu, India<br>
        +91 93423 43690<br>
        bhufix@gmail.com<br>
        bhufix.com
        {f"<br>GSTIN {gstin}" if gstin else ""}</p>
      </div>
      <div class="box">
        <h3>Bill to</h3>
        <p><b>{bill_to}</b>
        {f"<br>Package {pkg}" if pkg else ""}{f" v{pver}" if pver else ""}</p>
        <h3 style="margin-top:12px">Billing period</h3>
        <p>The work this invoice covers: <b>{period}</b><br>
        <span class="muted">Issued {issued} · Due {due}</span></p>
      </div>
    </div>
    <table>
      <thead><tr><th>Service / description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>{_rupee(inv.get("subtotal"))}</span></div>
      <div><span>Discount</span><span>− {_rupee(inv.get("discount"))}</span></div>
      <div><span>Tax{f" ({float(inv.get('tax_rate') or 0):g}%)" if inv.get("tax_rate") else ""}</span><span>{_rupee(inv.get("tax"))}</span></div>
      <div class="grand"><span>Total</span><span>{_rupee(inv.get("total"))}</span></div>
      <div><span>Paid</span><span>{_rupee(paid)}</span></div>
      <div><span>Balance</span><span>{_rupee(due_left)}</span></div>
    </div>
    {f'<div class="note">{memo}</div>' if memo else ""}
    {f'<div class="pay"><h3>Pay BhuFix</h3>{bank_html}</div>' if bank_html else ""}
    {f'<div class="pay"><h3>Payments received</h3><table><thead><tr><th>Date</th><th>Method</th><th class="r">Amount</th><th>Note</th></tr></thead><tbody>{pay_rows}</tbody></table></div>' if pay_rows else ""}
    <div class="foot">
      <div><b style="color:var(--navy)">Terms</b><br>{terms}</div>
      <div>Udumalpet · Coimbatore · Tirupur<br>Thank you for working with BhuFix.</div>
    </div>
  </div>
</body></html>"""


def create_p3_router(db, *, get_current_user, sanitize_input, logger) -> APIRouter:
    router = APIRouter()

    async def _load(kind: str, resource_id: str) -> dict:
        col = db.clips if kind == "clip" else db.assets
        doc = await col.find_one({"id": resource_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Resource not found")
        return doc

    @router.get("/portal/home")
    async def portal_home(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "dashboard", "read")
        q: dict = {}
        rbac.apply_client_query(q, current_user)
        pending = await db.approvals.find(
            {**q, "audience": "client", "status": "pending"}, {"_id": 0}
        ).sort("submitted_at", -1).to_list(20)
        today = datetime.now(IST).date().isoformat()
        cal_q = dict(q)
        if current_user.get("role") == "client":
            cal_q["status"] = {"$in": list(CLIENT_CAL) + ["completed", "postpone"]}
        cal_rows = await db.calendar_events.find(cal_q, {"_id": 0}).sort("date", 1).to_list(400)
        future, past = [], []
        for ev in cal_rows:
            st = normalize_cal_status(ev.get("status"))
            if current_user.get("role") == "client" and st not in CLIENT_CAL:
                continue
            ev["status"] = st
            if (ev.get("date") or "") >= today:
                future.append(ev)
            else:
                past.append(ev)
        upcoming = future[:8]
        if len(upcoming) < 8:
            upcoming.extend(reversed(past[-(8 - len(upcoming)):]))
        inv_q = {**q, "status": {"$in": ["sent", "paid"]}} if current_user.get("role") == "client" else dict(q)
        invoices = await db.invoices.find(inv_q, {"_id": 0}).sort("created_at", -1).to_list(8)
        unpaid = await db.invoices.count_documents({**q, "status": "sent"})
        files_q = dict(q)
        if current_user.get("role") == "client":
            files_q["bucket"] = {"$in": list(rbac.CLIENT_ASSET_BUCKETS)}
        files = await db.assets.find(files_q, {"_id": 0, "id": 1, "filename": 1, "label": 1, "bucket": 1, "locked": 1}).sort("created_at", -1).to_list(8)
        ads = await db.ads_campaigns.find(q, {"_id": 0, "id": 1, "platform": 1, "budget": 1, "spent": 1, "month": 1, "year": 1, "client_id": 1}).sort("year", -1).to_list(6)
        if current_user.get("role") == "client":
            pending = [client_approval(p) for p in pending]
            invoices = [client_invoice(i) for i in invoices]
            upcoming = [{k: ev.get(k) for k in ("id", "title", "date", "time", "type", "status", "client_id")} for ev in upcoming]
        return {
            "pending_approvals": pending,
            "upcoming": upcoming,
            "invoices": invoices,
            "files": files,
            "campaigns": ads,
            "unpaid": unpaid,
        }

    @router.post("/approvals/present")
    async def present_to_client(data: PresentBody, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "approvals", "write")
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="Staff present work to the client")
        if data.type not in ("asset", "clip"):
            raise HTTPException(status_code=400, detail="type must be asset or clip")
        resource = await _load(data.type, data.resource_id)
        rbac.assert_client_access(current_user, resource.get("client_id"))
        if not resource.get("locked"):
            raise HTTPException(status_code=400, detail="Internally approve and lock this version first")
        if resource.get("client_approved"):
            raise HTTPException(status_code=400, detail="Client already approved this version. Make a new version first.")
        existing = await db.approvals.find_one(
            {"type": data.type, "resource_id": data.resource_id, "audience": "client", "status": "pending"},
            {"_id": 0},
        )
        if existing:
            return existing
        already = await db.approvals.find_one(
            {
                "type": data.type,
                "resource_id": data.resource_id,
                "audience": "client",
                "status": "approved",
                "version": resource.get("version") or 1,
            },
            {"_id": 0},
        )
        if already:
            raise HTTPException(status_code=400, detail="Client already approved this version. Make a new version first.")
        parent_rows = await db.approvals.find(
            {"type": data.type, "resource_id": data.resource_id, "status": "approved", "audience": {"$ne": "client"}},
            {"_id": 0},
        ).sort("decided_at", -1).to_list(1)
        parent = parent_rows[0] if parent_rows else {}
        doc = {
            "id": str(uuid.uuid4()),
            "type": data.type,
            "resource_id": data.resource_id,
            "client_id": resource.get("client_id"),
            "task_id": resource.get("task_id"),
            "version": resource.get("version") or 1,
            "version_label": resource.get("label") or f"v{resource.get('version') or 1}",
            "status": "pending",
            "audience": "client",
            "parent_id": parent.get("id"),
            "snapshot": resource_snapshot(data.type, resource),
            "submitted_by": current_user["id"],
            "submitted_at": _now(),
            "client_notes": [],
            "notes": [],
            "locked": True,
        }
        await db.approvals.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.post("/approvals/{approval_id}/client-decide")
    async def client_decide(approval_id: str, data: ClientDecide, current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != "client":
            raise HTTPException(status_code=403, detail="Only the client can decide this version")
        row = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
        if not row:
            raise HTTPException(status_code=404, detail="Approval not found")
        rbac.assert_client_access(current_user, row.get("client_id"))
        if row.get("audience") != "client":
            raise HTTPException(status_code=403, detail="This is an internal review")
        if row.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Already decided")
        if data.action not in ("approve", "changes_requested"):
            raise HTTPException(status_code=400, detail="action must be approve or changes_requested")
        notes = list(row.get("client_notes") or [])
        if data.notes:
            notes.append({"text": sanitize_input(data.notes), "created_at": _now()})
        patch = {
            "status": "approved" if data.action == "approve" else "changes_requested",
            "decided_at": _now(),
            "client_notes": notes,
        }
        await db.approvals.update_one({"id": approval_id}, {"$set": patch})
        kind = row.get("type")
        rid = row.get("resource_id")
        if data.action == "approve":
            if kind == "clip":
                await db.clips.update_one({"id": rid}, {"$set": {"client_approved": True, "updated_at": _now()}})
            else:
                await db.assets.update_one({"id": rid}, {"$set": {"client_approved": True, "client_status": "approved", "bucket": "approved"}})
        else:
            if kind == "clip":
                await db.clips.update_one({"id": rid}, {"$set": {"client_status": "changes_requested", "updated_at": _now()}})
            else:
                await db.assets.update_one({"id": rid}, {"$set": {"client_status": "changes_requested"}})
        out = await db.approvals.find_one({"id": approval_id}, {"_id": 0})
        try:
            from p5 import write_audit, on_client_asset_approved, notify
            await write_audit(db, current_user, data.action, "approvals", approval_id, kind or "")
            if data.action == "approve":
                await on_client_asset_approved(db, {**row, **patch})
            else:
                await notify(
                    db, row.get("submitted_by"), "action",
                    "Client requested changes",
                    row.get("version_label") or "",
                    "/dashboard/approvals",
                    f"changes:{approval_id}",
                )
        except Exception:
            pass
        return client_approval(out)

    @router.get("/publish-queue")
    async def publish_queue(current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "calendar", "read")
        if current_user.get("role") == "client":
            raise HTTPException(status_code=403, detail="Publish queue is internal")
        query = {"status": {"$in": list(QUEUE_STATUSES)}}
        rbac.apply_client_query(query, current_user)
        rows = await db.calendar_events.find(query, {"_id": 0}).sort("date", 1).to_list(400)
        out = []
        clients = {c["id"]: c.get("name") for c in await db.clients.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(200)}
        today = datetime.now(IST).date().isoformat()
        for ev in rows:
            st = normalize_cal_status(ev.get("status"))
            if st not in QUEUE_STATUSES:
                continue
            ev["status"] = st
            ev["client_name"] = clients.get(ev.get("client_id")) or ev.get("client_id")
            ev["overdue"] = (ev.get("date") or "") < today and st == "approved"
            out.append(ev)
        return out

    @router.post("/publish-queue/{event_id}")
    async def publish_queue_act(event_id: str, data: QueueAction, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "calendar", "write")
        ev = await db.calendar_events.find_one({"id": event_id}, {"_id": 0})
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        rbac.assert_client_access(current_user, ev.get("client_id"))
        if data.action not in ("schedule", "publish", "postpone"):
            raise HTTPException(status_code=400, detail="action must be schedule, publish, or postpone")
        nxt = {"schedule": "scheduled", "publish": "published", "postpone": "postponed"}[data.action]
        patch = {"status": nxt, "updated_at": _now()}
        if data.time:
            patch["time"] = data.time
        if nxt == "published":
            patch["published_at"] = ev.get("published_at") or _now()
            patch["published_by"] = current_user["id"]
        else:
            patch["published_at"] = None
        await db.calendar_events.update_one({"id": event_id}, {"$set": patch})
        return await db.calendar_events.find_one({"id": event_id}, {"_id": 0})

    @router.post("/invoices/{invoice_id}/send")
    async def send_invoice(invoice_id: str, data: InvoiceSend, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "write")
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        if inv.get("status") not in ("draft", "sent"):
            raise HTTPException(status_code=400, detail="Only a draft or sent invoice can be sent")
        patch = {
            "status": "sent",
            "sent_at": _now(),
            "updated_at": _now(),
        }
        if data.client_memo:
            patch["client_memo"] = sanitize_input(data.client_memo)
        await db.invoices.update_one({"id": invoice_id}, {"$set": patch})
        return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

    @router.post("/invoices/{invoice_id}/payments")
    async def add_payment(invoice_id: str, data: InvoicePayment, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "write")
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        payments = list(inv.get("payments") or [])
        payments.append({
            "id": str(uuid.uuid4()),
            "amount": round(float(data.amount), 2),
            "method": sanitize_input(data.method)[:40],
            "note": sanitize_input(data.note)[:200],
            "created_by": current_user["id"],
            "created_at": _now(),
        })
        paid = sum(float(p.get("amount") or 0) for p in payments)
        total = float(inv.get("total") or 0)
        patch = {"payments": payments, "updated_at": _now()}
        if paid + 0.01 >= total:
            patch["status"] = "paid"
            patch["paid_at"] = _now()
        elif inv.get("status") == "draft":
            patch["status"] = "sent"
        await db.invoices.update_one({"id": invoice_id}, {"$set": patch})
        return await db.invoices.find_one({"id": invoice_id}, {"_id": 0})

    @router.get("/invoices/{invoice_id}/document")
    async def invoice_document(invoice_id: str, current_user: dict = Depends(get_current_user)):
        rbac.assert_can(current_user, "invoices", "read")
        inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rbac.assert_client_access(current_user, inv.get("client_id"))
        if current_user.get("role") == "client" and inv.get("status") not in ("sent", "paid"):
            raise HTTPException(status_code=403, detail="This invoice is not shared yet")
        try:
            from p5 import write_audit
            await write_audit(db, current_user, "export", "invoices", invoice_id, inv.get("number") or "")
        except Exception:
            pass
        return HTMLResponse(invoice_html(inv))

    async def seed_indexes():
        await db.approvals.create_index("audience")
        await db.calendar_events.create_index("status")

    router.seed_indexes = seed_indexes  # type: ignore
    return router
