"""BhuFix ClockIN API — separate product auth + secure presence punch + ADMS."""
from __future__ import annotations

import logging
import os
import secrets
import uuid
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from .adms import create_adms_router, ingest_attlog, parse_attlog_body
from .attendance import build_owner_digest, local_date_str, parse_iso, summarize_day
from .face import (
    decode_image_b64,
    pick_liveness,
    save_face_image,
    verify_against_enrollments,
)
from .models import (
    AdvanceCreate,
    ClockInLogin,
    ClockInRegister,
    CompanyUpsert,
    DeviceCreate,
    DeviceUpdate,
    EmployeeCreate,
    EmployeeUpdate,
    FaceEnrollRequest,
    ManualPunch,
    PayrollGenerate,
    PunchSessionStart,
    SecureSoftPunch,
)
from .payroll import generate_payslips, slips_whatsapp_summary
from .security import (
    QR_WINDOW_SEC,
    hash_pin,
    new_secret,
    rotating_qr_code,
    verify_pin,
    verify_rotating_qr,
    within_geofence,
)

logger = logging.getLogger(__name__)

clockin_oauth = OAuth2PasswordBearer(tokenUrl="/api/clockin/auth/login", auto_error=False)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _clean(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def _normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return "91" + digits
    return digits


def _send_whatsapp_text(to_phone: str, body: str) -> dict:
    """Send via Meta Cloud API. Returns {ok, detail}. Queues still work if unset."""
    token = (
        os.environ.get("WHATSAPP_TOKEN")
        or os.environ.get("WHATSAPP_ACCESS_TOKEN")
        or ""
    ).strip()
    phone_id = (os.environ.get("WHATSAPP_PHONE_NUMBER_ID") or "").strip()
    to = _normalize_phone(to_phone)
    if not token or not phone_id:
        return {"ok": False, "detail": "WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set"}
    if not to:
        return {"ok": False, "detail": "missing recipient"}
    try:
        import requests

        url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"preview_url": True, "body": body},
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            logger.warning("WhatsApp send failed %s: %s", resp.status_code, resp.text[:400])
            return {"ok": False, "detail": resp.text[:300]}
        return {"ok": True, "detail": "sent"}
    except Exception as exc:
        logger.exception("WhatsApp send error")
        return {"ok": False, "detail": str(exc)}


def _frontend_origin(request: Request) -> str:
    """Resolve public site origin for punch links (prod + local)."""
    # Browser Origin is most accurate for Test IN from owner console
    hdr = (request.headers.get("origin") or "").strip().rstrip("/")
    if hdr and "your-bhufix" not in hdr.lower():
        return hdr
    for key in ("FRONTEND_URL", "RENDER_EXTERNAL_URL"):
        raw = (os.environ.get(key) or "").strip().rstrip("/")
        if not raw:
            continue
        low = raw.lower()
        if "your-bhufix" in low or "example.com" in low or "placeholder" in low:
            continue
        return raw
    base = str(request.base_url).rstrip("/")
    if "localhost:8000" in base or "127.0.0.1:8000" in base:
        return "http://localhost:3000"
    return base


def create_clockin_router(
    db,
    *,
    secret_key: str,
    algorithm: str,
    verify_password: Callable,
    get_password_hash: Callable,
    create_access_token: Callable,
) -> APIRouter:
    router = APIRouter(prefix="/clockin", tags=["clockin"])

    async def get_clockin_owner(token: str = Depends(clockin_oauth)) -> dict:
        if not token:
            raise HTTPException(401, "Not authenticated")
        try:
            payload = jwt.decode(token, secret_key, algorithms=[algorithm])
            if payload.get("product") != "clockin":
                raise HTTPException(401, "Invalid ClockIN token")
            owner_id = payload.get("sub")
        except JWTError:
            raise HTTPException(401, "Invalid or expired token")
        owner = await db.clockin_owners.find_one(
            {"id": owner_id, "is_active": True}, {"_id": 0}
        )
        if not owner:
            raise HTTPException(401, "Owner not found")
        return owner

    async def _company_for(owner: dict) -> dict:
        company = await db.clockin_companies.find_one(
            {"owner_id": owner["id"]}, {"_id": 0}
        )
        if not company:
            raise HTTPException(404, "Company not found")
        return company

    # ── Auth (separate from agency dashboard) ────────────────────
    @router.post("/auth/register")
    async def register(data: ClockInRegister):
        email = data.email.lower().strip()
        if await db.clockin_owners.find_one({"email": email}):
            raise HTTPException(400, "Email already registered for ClockIN")
        owner = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": data.name.strip(),
            "password_hash": get_password_hash(data.password),
            "is_active": True,
            "created_at": _now_iso(),
        }
        await db.clockin_owners.insert_one(owner)
        owner.pop("_id", None)  # Motor mutates the dict with ObjectId
        company = {
            "id": str(uuid.uuid4()),
            "owner_id": owner["id"],
            "name": data.business_name.strip(),
            "owner_whatsapp": "",
            "bot_whatsapp": "",
            "shift_start": "09:00",
            "shift_end": "18:00",
            "grace_minutes": 15,
            "half_day_hours": 4.0,
            "timezone": "Asia/Kolkata",
            "office_lat": None,
            "office_lng": None,
            "geofence_radius_m": 120,
            "qr_secret": new_secret(),
            "display_token": secrets.token_urlsafe(16),
            "created_at": _now_iso(),
        }
        await db.clockin_companies.insert_one(company)
        company.pop("_id", None)
        token = create_access_token(
            {"sub": owner["id"], "role": "clockin_owner", "product": "clockin"}
        )
        return {
            "token": token,
            "owner": {k: v for k, v in owner.items() if k != "password_hash"},
            "company": company,
        }

    @router.post("/auth/login")
    async def login(data: ClockInLogin):
        owner = await db.clockin_owners.find_one(
            {"email": data.email.lower().strip(), "is_active": True}, {"_id": 0}
        )
        if not owner or not verify_password(data.password, owner["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        token = create_access_token(
            {"sub": owner["id"], "role": "clockin_owner", "product": "clockin"}
        )
        return {
            "token": token,
            "owner": {k: v for k, v in owner.items() if k != "password_hash"},
        }

    @router.get("/auth/me")
    async def me(owner: dict = Depends(get_clockin_owner)):
        return {k: v for k, v in owner.items() if k != "password_hash"}

    # ── Company ──────────────────────────────────────────────────
    @router.get("/company")
    async def get_company(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        return {
            **company,
            "qr_secret": None,  # never expose secret to client beyond display endpoints
            "adms_path": "/iclock",
            "display_path": f"/clockin/display/{company['display_token']}",
            "punch_path": "/clockin/punch",
            "presence_rules": {
                "server_time": True,
                "geofence_required": company.get("office_lat") is not None,
                "rotating_qr_seconds": QR_WINDOW_SEC,
                "employee_pin": True,
                "note": "Phone clock cannot cheat — punch time is always server time. Static QR photos expire every 30s.",
            },
        }

    @router.put("/company")
    async def update_company(data: CompanyUpsert, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        update = data.model_dump()
        await db.clockin_companies.update_one({"id": company["id"]}, {"$set": update})
        return await get_company(owner)

    @router.post("/company/rotate-display-token")
    async def rotate_display(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        token = secrets.token_urlsafe(16)
        secret = new_secret()
        await db.clockin_companies.update_one(
            {"id": company["id"]},
            {"$set": {"display_token": token, "qr_secret": secret}},
        )
        return {"display_token": token, "display_path": f"/clockin/display/{token}"}

    # ── Employees ────────────────────────────────────────────────
    @router.get("/employees")
    async def list_employees(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        rows = await db.clockin_employees.find(
            {"company_id": company["id"]}, {"_id": 0, "pin_hash": 0}
        ).to_list(500)
        for row in rows:
            if "face_enrolled" not in row:
                n = await db.clockin_face_enrollments.count_documents(
                    {"employee_id": row["id"], "company_id": company["id"]}
                )
                row["face_enrolled"] = n > 0
        return rows

    @router.post("/employees")
    async def create_employee(data: EmployeeCreate, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        payload = data.model_dump()
        pin = payload.pop("pin")
        emp = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            **payload,
            "phone": _normalize_phone(data.phone) if data.phone else None,
            "pin_hash": hash_pin(pin),
            "is_active": True,
            "created_at": _now_iso(),
        }
        if not emp.get("employee_code"):
            emp["employee_code"] = f"E{str(uuid.uuid4())[:6].upper()}"
        await db.clockin_employees.insert_one(emp)
        emp.pop("pin_hash", None)
        return _clean(emp)

    @router.put("/employees/{employee_id}")
    async def update_employee(
        employee_id: str, data: EmployeeUpdate, owner: dict = Depends(get_clockin_owner)
    ):
        company = await _company_for(owner)
        update = {k: v for k, v in data.model_dump().items() if v is not None}
        if "pin" in update:
            update["pin_hash"] = hash_pin(update.pop("pin"))
        if "phone" in update and update["phone"]:
            update["phone"] = _normalize_phone(update["phone"])
        result = await db.clockin_employees.update_one(
            {"id": employee_id, "company_id": company["id"]}, {"$set": update}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Employee not found")
        return _clean(
            await db.clockin_employees.find_one(
                {"id": employee_id}, {"_id": 0, "pin_hash": 0}
            )
        )

    @router.delete("/employees/{employee_id}")
    async def delete_employee(employee_id: str, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        result = await db.clockin_employees.update_one(
            {"id": employee_id, "company_id": company["id"]},
            {"$set": {"is_active": False}},
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Employee not found")
        return {"message": "Employee deactivated"}

    # ── Face enrollment (1–3 photos per employee) ─────────────────
    @router.get("/employees/{employee_id}/faces")
    async def list_faces(employee_id: str, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        emp = await db.clockin_employees.find_one(
            {"id": employee_id, "company_id": company["id"]}, {"_id": 0}
        )
        if not emp:
            raise HTTPException(404, "Employee not found")
        faces = await db.clockin_face_enrollments.find(
            {"employee_id": employee_id, "company_id": company["id"]},
            {"_id": 0, "path": 0},
        ).to_list(10)
        return {
            "employee_id": employee_id,
            "count": len(faces),
            "faces": faces,
            "max": 3,
        }

    @router.post("/employees/{employee_id}/faces")
    async def enroll_face(
        employee_id: str, data: FaceEnrollRequest, owner: dict = Depends(get_clockin_owner)
    ):
        company = await _company_for(owner)
        emp = await db.clockin_employees.find_one(
            {"id": employee_id, "company_id": company["id"], "is_active": True}, {"_id": 0}
        )
        if not emp:
            raise HTTPException(404, "Employee not found")
        existing = await db.clockin_face_enrollments.count_documents(
            {"employee_id": employee_id, "company_id": company["id"]}
        )
        if existing >= 3:
            raise HTTPException(400, "Max 3 face photos per employee — delete one first")
        try:
            blob = decode_image_b64(data.image_base64)
            rel = save_face_image(company["id"], employee_id, blob, kind="enroll")
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
        row = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "employee_id": employee_id,
            "path": rel,
            "created_at": _now_iso(),
        }
        await db.clockin_face_enrollments.insert_one(row)
        await db.clockin_employees.update_one(
            {"id": employee_id}, {"$set": {"face_enrolled": True}}
        )
        return {"id": row["id"], "employee_id": employee_id, "created_at": row["created_at"]}

    @router.delete("/employees/{employee_id}/faces/{face_id}")
    async def delete_face(
        employee_id: str, face_id: str, owner: dict = Depends(get_clockin_owner)
    ):
        company = await _company_for(owner)
        face = await db.clockin_face_enrollments.find_one(
            {"id": face_id, "employee_id": employee_id, "company_id": company["id"]}
        )
        if not face:
            raise HTTPException(404, "Face enrollment not found")
        await db.clockin_face_enrollments.delete_one({"id": face_id})
        left = await db.clockin_face_enrollments.count_documents(
            {"employee_id": employee_id, "company_id": company["id"]}
        )
        await db.clockin_employees.update_one(
            {"id": employee_id}, {"$set": {"face_enrolled": left > 0}}
        )
        return {"message": "Face removed", "remaining": left}

    # ── Devices ──────────────────────────────────────────────────
    @router.get("/devices")
    async def list_devices(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        return await db.clockin_devices.find(
            {"company_id": company["id"]}, {"_id": 0}
        ).to_list(100)

    @router.post("/devices")
    async def create_device(data: DeviceCreate, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        sn = data.serial_number.strip()
        if await db.clockin_devices.find_one({"serial_number": sn}):
            raise HTTPException(400, "Device serial already registered")
        device = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "serial_number": sn,
            "name": data.name,
            "brand": data.brand,
            "is_active": True,
            "last_seen_at": None,
            "created_at": _now_iso(),
        }
        await db.clockin_devices.insert_one(device)
        return _clean(device)

    @router.put("/devices/{device_id}")
    async def update_device(
        device_id: str, data: DeviceUpdate, owner: dict = Depends(get_clockin_owner)
    ):
        company = await _company_for(owner)
        update = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await db.clockin_devices.update_one(
            {"id": device_id, "company_id": company["id"]}, {"$set": update}
        )
        if result.matched_count == 0:
            raise HTTPException(404, "Device not found")
        return _clean(await db.clockin_devices.find_one({"id": device_id}, {"_id": 0}))

    @router.delete("/devices/{device_id}")
    async def delete_device(device_id: str, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        result = await db.clockin_devices.delete_one(
            {"id": device_id, "company_id": company["id"]}
        )
        if result.deleted_count == 0:
            raise HTTPException(404, "Device not found")
        return {"message": "Device removed"}

    @router.get("/devices/unmapped")
    async def unmapped_punches(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        return await db.clockin_unmapped_punches.find(
            {"company_id": company["id"]}, {"_id": 0}
        ).sort("punched_at", -1).to_list(200)

    @router.post("/devices/import-csv")
    async def import_csv(
        request: Request,
        serial_number: str = Query(...),
        owner: dict = Depends(get_clockin_owner),
    ):
        company = await _company_for(owner)
        device = await db.clockin_devices.find_one(
            {"company_id": company["id"], "serial_number": serial_number.strip()},
            {"_id": 0},
        )
        if not device:
            raise HTTPException(404, "Register the device serial first")
        raw = (await request.body()).decode("utf-8", errors="ignore")
        rows = parse_attlog_body(raw)
        n = await ingest_attlog(db, device, rows)
        return {"imported": n, "parsed": len(rows)}

    router.include_router(create_adms_router(db), prefix="/adms/iclock")

    # ── Punches / attendance / payroll (owner) ───────────────────
    @router.get("/punches")
    async def list_punches(
        date: Optional[str] = None,
        employee_id: Optional[str] = None,
        owner: dict = Depends(get_clockin_owner),
    ):
        company = await _company_for(owner)
        q: dict = {"company_id": company["id"]}
        if employee_id:
            q["employee_id"] = employee_id
        rows = await db.clockin_punches.find(q, {"_id": 0}).sort("punched_at", -1).to_list(2000)
        if date:
            rows = [p for p in rows if local_date_str(parse_iso(p["punched_at"])) == date]
        return rows

    @router.post("/punches/manual")
    async def manual_punch(data: ManualPunch, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        emp = await db.clockin_employees.find_one(
            {"id": data.employee_id, "company_id": company["id"]}, {"_id": 0}
        )
        if not emp:
            raise HTTPException(404, "Employee not found")
        punched_at = (data.punched_at or _now()).astimezone(timezone.utc).isoformat()
        punch = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "employee_id": emp["id"],
            "punched_at": punched_at,
            "direction": data.direction,
            "source": "manual",
            "created_at": _now_iso(),
        }
        await db.clockin_punches.insert_one(punch)
        return _clean(punch)

    async def _attendance_for_day(company: dict, day: str) -> dict:
        employees = await db.clockin_employees.find(
            {"company_id": company["id"], "is_active": True}, {"_id": 0}
        ).to_list(500)
        punches = await db.clockin_punches.find(
            {"company_id": company["id"]}, {"_id": 0}
        ).to_list(5000)
        summaries = [summarize_day(punches, company, e, day) for e in employees]
        return {
            "date": day,
            "summaries": summaries,
            "digest_text": build_owner_digest(company, employees, summaries),
            "counts": {
                "present": sum(1 for s in summaries if s["status"] == "present"),
                "late": sum(1 for s in summaries if s["status"] == "late"),
                "half_day": sum(1 for s in summaries if s["status"] == "half_day"),
                "absent": sum(1 for s in summaries if s["status"] == "absent"),
                "week_off": sum(1 for s in summaries if s["status"] == "week_off"),
            },
        }

    async def _attendance_for_month(company: dict, month: int, year: int) -> dict:
        employees = await db.clockin_employees.find(
            {"company_id": company["id"], "is_active": True}, {"_id": 0}
        ).to_list(500)
        punches = await db.clockin_punches.find(
            {"company_id": company["id"]}, {"_id": 0}
        ).to_list(20000)
        days = monthrange(year, month)[1]
        all_summaries = []
        for d in range(1, days + 1):
            day = f"{year:04d}-{month:02d}-{d:02d}"
            for e in employees:
                all_summaries.append(summarize_day(punches, company, e, day))
        return {"month": month, "year": year, "summaries": all_summaries}

    @router.get("/attendance/today")
    async def attendance_today(owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        return await _attendance_for_day(company, local_date_str(_now()))

    @router.get("/attendance")
    async def attendance_range(
        date: Optional[str] = None,
        month: Optional[int] = None,
        year: Optional[int] = None,
        owner: dict = Depends(get_clockin_owner),
    ):
        company = await _company_for(owner)
        if date:
            return await _attendance_for_day(company, date)
        if month and year:
            return await _attendance_for_month(company, month, year)
        return await _attendance_for_day(company, local_date_str(_now()))

    @router.get("/digest")
    async def get_digest(
        date: Optional[str] = None, owner: dict = Depends(get_clockin_owner)
    ):
        company = await _company_for(owner)
        day = date or local_date_str(_now())
        data = await _attendance_for_day(company, day)
        return {
            "date": day,
            "text": data["digest_text"],
            "counts": data["counts"],
            "owner_whatsapp": company.get("owner_whatsapp"),
        }

    @router.get("/advances")
    async def list_advances(
        month: Optional[int] = None,
        year: Optional[int] = None,
        owner: dict = Depends(get_clockin_owner),
    ):
        company = await _company_for(owner)
        q: dict = {"company_id": company["id"]}
        if month:
            q["month"] = month
        if year:
            q["year"] = year
        return await db.clockin_advances.find(q, {"_id": 0}).to_list(500)

    @router.post("/advances")
    async def create_advance(data: AdvanceCreate, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        emp = await db.clockin_employees.find_one(
            {"id": data.employee_id, "company_id": company["id"]}, {"_id": 0}
        )
        if not emp:
            raise HTTPException(404, "Employee not found")
        row = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            **data.model_dump(),
            "created_at": _now_iso(),
        }
        await db.clockin_advances.insert_one(row)
        return _clean(row)

    @router.post("/payroll/generate")
    async def payroll_generate(data: PayrollGenerate, owner: dict = Depends(get_clockin_owner)):
        company = await _company_for(owner)
        employees = await db.clockin_employees.find(
            {"company_id": company["id"], "is_active": True}, {"_id": 0}
        ).to_list(500)
        month_data = await _attendance_for_month(company, data.month, data.year)
        advances = await db.clockin_advances.find(
            {"company_id": company["id"], "month": data.month, "year": data.year},
            {"_id": 0},
        ).to_list(500)
        slips = generate_payslips(
            company, employees, month_data["summaries"], advances, data.month, data.year
        )
        run = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "month": data.month,
            "year": data.year,
            "slips": slips,
            "total_net": round(sum(s["net"] for s in slips), 2),
            "digest_text": slips_whatsapp_summary(company, slips, data.month, data.year),
            "created_at": _now_iso(),
        }
        await db.clockin_payroll_runs.update_one(
            {"company_id": company["id"], "month": data.month, "year": data.year},
            {"$set": run},
            upsert=True,
        )
        run.pop("_id", None)
        return run

    @router.get("/payroll")
    async def get_payroll(
        month: int = Query(...),
        year: int = Query(...),
        owner: dict = Depends(get_clockin_owner),
    ):
        company = await _company_for(owner)
        run = await db.clockin_payroll_runs.find_one(
            {"company_id": company["id"], "month": month, "year": year},
            {"_id": 0},
        )
        if not run:
            raise HTTPException(404, "No payroll run for that month. Generate first.")
        return run

    # ── Office display: rotating QR (proves you are at the door) ──
    @router.get("/public/display/{display_token}")
    async def display_info(display_token: str):
        company = await db.clockin_companies.find_one(
            {"display_token": display_token}, {"_id": 0}
        )
        if not company:
            raise HTTPException(404, "Invalid display link")
        return {
            "company_name": company["name"],
            "window_seconds": QR_WINDOW_SEC,
            "punch_path": "/clockin/punch",
        }

    @router.get("/public/display/{display_token}/qr")
    async def display_qr(display_token: str, request: Request):
        company = await db.clockin_companies.find_one(
            {"display_token": display_token}, {"_id": 0}
        )
        if not company:
            raise HTTPException(404, "Invalid display link")
        code = rotating_qr_code(company["id"], company["qr_secret"])
        slot_end = _slot_end()
        # Prefer public site origin for phone camera scan → opens punch page with live code
        origin = _frontend_origin(request)
        punch_url = (
            f"{origin}/clockin/punch?display={company['display_token']}&code={code}"
        )
        return {
            "code": code,
            "expires_in": slot_end,
            "window_seconds": QR_WINDOW_SEC,
            "company_name": company["name"],
            "qr_payload": punch_url,
            "legacy_payload": f"CLOCKIN|{company['display_token']}|{code}",
        }

    # ── Secure employee punch: WA link → QR → selfie face match ──
    async def _resolve_presence(
        *,
        challenge_id: Optional[str],
        office_qr: Optional[str],
        display_token: Optional[str],
        lat: float,
        lng: float,
    ) -> tuple[dict, Optional[dict], str, Optional[float]]:
        """Validate WA challenge + live office QR + geofence. Returns company, challenge, presence_via, dist."""
        challenge = None
        company = None
        presence_via = None

        if challenge_id:
            challenge = await db.clockin_challenges.find_one(
                {"id": challenge_id}, {"_id": 0}
            )
            if not challenge or challenge.get("used"):
                raise HTTPException(400, "WhatsApp challenge invalid or already used")
            if parse_iso(challenge["expires_at"]) < _now():
                raise HTTPException(
                    400, "Link expired — text IN or OUT again on WhatsApp at the office"
                )
            company = await db.clockin_companies.find_one(
                {"id": challenge["company_id"]}, {"_id": 0}
            )
            presence_via = "whatsapp_challenge"

        qr_raw = (office_qr or "").strip()
        qr_code = qr_raw
        token = display_token
        if qr_raw.startswith("CLOCKIN|"):
            parts = qr_raw.split("|")
            if len(parts) >= 3:
                token, qr_code = parts[1], parts[2]

        # Live office QR is required for soft punch (presence at door)
        if not token and not qr_code:
            raise HTTPException(
                400, "Scan the live QR on the office screen (photo of old QR will not work)"
            )

        if token:
            company_from_display = await db.clockin_companies.find_one(
                {"display_token": token}, {"_id": 0}
            )
            if not company_from_display:
                raise HTTPException(400, "Invalid office display")
            if company and company["id"] != company_from_display["id"]:
                raise HTTPException(400, "QR does not match this WhatsApp link’s company")
            company = company_from_display

        if not company:
            raise HTTPException(400, "Could not verify office")

        if not verify_rotating_qr(company["id"], company.get("qr_secret", ""), qr_code):
            raise HTTPException(
                400,
                "Office QR expired or invalid — look at the live screen (codes change every 30s)",
            )
        presence_via = "office_qr" if not challenge else "whatsapp_and_qr"

        ok_geo, dist = within_geofence(
            lat,
            lng,
            company.get("office_lat"),
            company.get("office_lng"),
            company.get("geofence_radius_m") or 120,
        )
        if company.get("office_lat") is not None and not ok_geo:
            raise HTTPException(
                400,
                f"You must be at the office (distance {dist}m, allowed {company.get('geofence_radius_m')}m)",
            )
        return company, challenge, presence_via or "office_qr", dist

    @router.get("/public/punch/bootstrap")
    async def punch_bootstrap(
        display_token: Optional[str] = None,
        challenge_id: Optional[str] = None,
    ):
        company = None
        challenge = None
        direction = "auto"
        employee_name = None
        if display_token:
            company = await db.clockin_companies.find_one(
                {"display_token": display_token}, {"_id": 0}
            )
        if challenge_id:
            challenge = await db.clockin_challenges.find_one(
                {"id": challenge_id}, {"_id": 0}
            )
            if challenge and not challenge.get("used") and parse_iso(challenge["expires_at"]) > _now():
                company = await db.clockin_companies.find_one(
                    {"id": challenge["company_id"]}, {"_id": 0}
                )
                direction = challenge.get("direction") or "auto"
                emp = await db.clockin_employees.find_one(
                    {"id": challenge["employee_id"]}, {"_id": 0, "name": 1}
                )
                employee_name = emp.get("name") if emp else None
        if not company:
            raise HTTPException(400, "Open punch from WhatsApp link or office QR")
        return {
            "company_name": company["name"],
            "geofence_required": company.get("office_lat") is not None,
            "geofence_radius_m": company.get("geofence_radius_m", 120),
            "requires_office_qr": True,
            "requires_face": True,
            "pin_fallback": True,
            "server_time": True,
            "direction": direction,
            "employee_name": employee_name,
            "has_whatsapp_challenge": bool(challenge),
            "steps": ["scan_qr", "selfie", "done"],
            "shift_start": company.get("shift_start"),
            "shift_end": company.get("shift_end"),
        }

    @router.post("/public/punch/session")
    async def start_punch_session(data: PunchSessionStart):
        """After QR + GPS OK → issue short-lived session + liveness prompt for selfie."""
        company, challenge, presence_via, dist = await _resolve_presence(
            challenge_id=data.challenge_id,
            office_qr=data.office_qr,
            display_token=data.display_token,
            lat=data.lat,
            lng=data.lng,
        )

        emp = None
        if challenge:
            emp = await db.clockin_employees.find_one(
                {"id": challenge["employee_id"], "is_active": True}, {"_id": 0}
            )
        if not emp and data.phone:
            emp = await db.clockin_employees.find_one(
                {
                    "company_id": company["id"],
                    "phone": _normalize_phone(data.phone),
                    "is_active": True,
                },
                {"_id": 0},
            )
        if not emp and data.employee_code:
            emp = await db.clockin_employees.find_one(
                {
                    "company_id": company["id"],
                    "employee_code": data.employee_code.strip(),
                    "is_active": True,
                },
                {"_id": 0},
            )
        if not emp:
            raise HTTPException(404, "Employee not found — use WhatsApp IN or enter phone/code")

        direction = data.direction
        if challenge and challenge.get("direction") in ("in", "out"):
            direction = challenge["direction"]
        if direction == "auto":
            day = local_date_str(_now())
            todays = await db.clockin_punches.find(
                {"company_id": company["id"], "employee_id": emp["id"]}, {"_id": 0}
            ).to_list(100)
            todays = [p for p in todays if local_date_str(parse_iso(p["punched_at"])) == day]
            direction = "out" if todays else "in"

        face_count = await db.clockin_face_enrollments.count_documents(
            {"employee_id": emp["id"], "company_id": company["id"]}
        )
        live_key, live_prompt = pick_liveness()
        session = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "employee_id": emp["id"],
            "challenge_id": challenge["id"] if challenge else None,
            "direction": direction,
            "presence_via": presence_via,
            "lat": data.lat,
            "lng": data.lng,
            "distance_m": dist,
            "liveness_key": live_key,
            "liveness_prompt": live_prompt,
            "face_enrolled": face_count > 0,
            "attempts": 0,
            "used": False,
            "expires_at": (_now() + timedelta(seconds=120)).isoformat(),
            "created_at": _now_iso(),
        }
        await db.clockin_punch_sessions.insert_one(session)
        return {
            "session_id": session["id"],
            "employee_name": emp["name"],
            "direction": direction,
            "liveness_key": live_key,
            "liveness_prompt": live_prompt,
            "face_enrolled": face_count > 0,
            "pin_fallback_allowed": True,
            "expires_in": 120,
            "distance_m": dist,
        }

    @router.post("/public/punch")
    async def complete_punch(data: SecureSoftPunch):
        """Complete punch with selfie face match (or PIN fallback). Server time only."""
        session = await db.clockin_punch_sessions.find_one(
            {"id": data.session_id}, {"_id": 0}
        )
        if not session or session.get("used"):
            raise HTTPException(400, "Punch session invalid — start again from QR")
        if parse_iso(session["expires_at"]) < _now():
            raise HTTPException(400, "Session expired — scan the office QR again")

        company = await db.clockin_companies.find_one(
            {"id": session["company_id"]}, {"_id": 0}
        )
        emp = await db.clockin_employees.find_one(
            {"id": session["employee_id"], "is_active": True}
        )
        if not company or not emp:
            raise HTTPException(400, "Session employee/company missing")

        identity_via = None
        face_score = None
        face_detail = None
        selfie_path = None

        if data.use_pin_fallback or not data.selfie_base64:
            if not data.pin:
                raise HTTPException(400, "Take a selfie, or use PIN fallback")
            if not verify_pin(data.pin, emp.get("pin_hash")):
                raise HTTPException(403, "Wrong PIN")
            identity_via = "pin_fallback"
        else:
            if data.liveness_action != session.get("liveness_key"):
                raise HTTPException(
                    400, "Complete the liveness step shown on screen, then capture"
                )
            try:
                selfie_blob = decode_image_b64(data.selfie_base64)
            except ValueError as e:
                raise HTTPException(400, str(e)) from e

            enrollments = await db.clockin_face_enrollments.find(
                {"employee_id": emp["id"], "company_id": company["id"]}, {"_id": 0}
            ).to_list(5)
            paths = [f["path"] for f in enrollments if f.get("path")]
            if not paths:
                raise HTTPException(
                    400,
                    "No face enrolled for this employee — owner must add a face photo, or use PIN fallback",
                )

            ok, score, detail, _matched = verify_against_enrollments(paths, selfie_blob)
            face_score, face_detail = score, detail
            attempts = int(session.get("attempts") or 0) + 1
            await db.clockin_punch_sessions.update_one(
                {"id": session["id"]}, {"$set": {"attempts": attempts}}
            )
            if not ok:
                if attempts >= 3:
                    raise HTTPException(
                        403,
                        f"Face mismatch (score {score}). Use PIN fallback or ask owner to re-enroll face.",
                    )
                raise HTTPException(
                    403,
                    f"Face did not match (score {score}). Retry selfie ({3 - attempts} left) or use PIN.",
                )
            try:
                selfie_path = save_face_image(
                    company["id"], emp["id"], selfie_blob, kind="punch"
                )
            except Exception:
                logger.exception("Could not store punch selfie")
            identity_via = "face"

        direction = session["direction"]
        punched_at = _now_iso()
        punch = {
            "id": str(uuid.uuid4()),
            "company_id": company["id"],
            "employee_id": emp["id"],
            "punched_at": punched_at,
            "direction": direction,
            "source": "soft",
            "presence_via": session.get("presence_via"),
            "identity_via": identity_via,
            "face_score": face_score,
            "face_detail": face_detail,
            "selfie_path": selfie_path,
            "liveness_key": session.get("liveness_key"),
            "lat": session.get("lat"),
            "lng": session.get("lng"),
            "distance_m": session.get("distance_m"),
            "created_at": _now_iso(),
        }
        await db.clockin_punches.insert_one(punch)
        await db.clockin_punch_sessions.update_one(
            {"id": session["id"]}, {"$set": {"used": True, "used_at": _now_iso()}}
        )
        if session.get("challenge_id"):
            await db.clockin_challenges.update_one(
                {"id": session["challenge_id"]},
                {"$set": {"used": True, "used_at": _now_iso()}},
            )

        return {
            "ok": True,
            "employee_name": emp["name"],
            "direction": direction,
            "punched_at": punched_at,
            "server_time": True,
            "identity_via": identity_via,
            "face_score": face_score,
            "distance_m": session.get("distance_m"),
            "message": f"{emp['name']} ClockIN {direction.upper()} recorded",
        }

    # ── WhatsApp: IN/OUT → 90s link (not a punch by itself) ──────
    @router.get("/whatsapp/webhook")
    async def wa_verify(
        hub_mode: Optional[str] = Query(None, alias="hub.mode"),
        hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
        hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    ):
        expected = os.environ.get("WHATSAPP_VERIFY_TOKEN", "bhufix-clockin-verify")
        if hub_mode == "subscribe" and hub_verify_token == expected:
            return PlainTextResponse(content=hub_challenge or "")
        raise HTTPException(403, "Verification failed")

    async def _create_wa_challenge(emp: dict, direction: str, request: Request) -> dict:
        challenge = {
            "id": str(uuid.uuid4()),
            "company_id": emp["company_id"],
            "employee_id": emp["id"],
            "phone": emp.get("phone"),
            "direction": direction,
            "expires_at": (_now() + timedelta(seconds=90)).isoformat(),
            "used": False,
            "created_at": _now_iso(),
        }
        await db.clockin_challenges.insert_one(challenge)
        origin = _frontend_origin(request)
        link = f"{origin}/clockin/punch?challenge={challenge['id']}"
        body = (
            f"BhuFix ClockIN — {direction.upper()}\n"
            f"Open within 90 seconds at the office:\n{link}\n"
            f"Then: scan live office QR → selfie. Phone clock does not matter."
        )
        send = _send_whatsapp_text(emp.get("phone") or "", body)
        await db.clockin_wa_outbox.insert_one(
            {
                "id": str(uuid.uuid4()),
                "to": emp.get("phone"),
                "body": body,
                "challenge_id": challenge["id"],
                "direction": direction,
                "sent": bool(send.get("ok")),
                "send_detail": send.get("detail"),
                "created_at": _now_iso(),
            }
        )
        return {"challenge": challenge, "link": link, "body": body, "wa_sent": send}

    @router.post("/whatsapp/webhook")
    async def wa_incoming(request: Request):
        """
        Employee texts IN / OUT / CLOCKIN → 90s web link.
        Punch only completes after live QR + selfie (or PIN fallback).
        """
        payload = await request.json()
        try:
            for entry in payload.get("entry") or []:
                for change in entry.get("changes") or []:
                    value = change.get("value") or {}
                    for msg in value.get("messages") or []:
                        if msg.get("type") != "text":
                            continue
                        from_phone = _normalize_phone(msg.get("from", ""))
                        text = (msg.get("text") or {}).get("body", "").strip().upper()
                        text = text.replace(" ", "")
                        direction = None
                        if text in ("IN", "CLOCKIN", "CHECKIN", "HI", "HAI", "PUNCH"):
                            direction = "in" if text in ("IN", "CLOCKIN", "CHECKIN") else "auto"
                            if text in ("HI", "HAI", "PUNCH"):
                                direction = "auto"
                        elif text in ("OUT", "CLOCKOUT", "CHECKOUT"):
                            direction = "out"
                        else:
                            continue
                        emp = await db.clockin_employees.find_one(
                            {"phone": from_phone, "is_active": True}, {"_id": 0}
                        )
                        if not emp:
                            logger.info("WA: unknown phone %s", from_phone)
                            continue
                        result = await _create_wa_challenge(emp, direction, request)
                        logger.info(
                            "WA challenge %s dir=%s for %s link=%s",
                            result["challenge"]["id"],
                            direction,
                            from_phone,
                            result["link"],
                        )
        except Exception:
            logger.exception("WhatsApp webhook error")
        return {"status": "ok"}

    @router.post("/challenges/create-test")
    async def create_test_challenge(
        request: Request,
        employee_id: str = Query(...),
        direction: str = Query("in"),
        owner: dict = Depends(get_clockin_owner),
    ):
        """Owner generates a 90s punch link (simulates WhatsApp IN/OUT)."""
        company = await _company_for(owner)
        emp = await db.clockin_employees.find_one(
            {"id": employee_id, "company_id": company["id"], "is_active": True}, {"_id": 0}
        )
        if not emp:
            raise HTTPException(404, "Employee not found")
        if direction not in ("in", "out", "auto"):
            direction = "in"
        result = await _create_wa_challenge(emp, direction, request)
        return {
            "challenge_id": result["challenge"]["id"],
            "direction": direction,
            "expires_at": result["challenge"]["expires_at"],
            "punch_path": f"/clockin/punch?challenge={result['challenge']['id']}",
            "link": result["link"],
            "whatsapp_body": result["body"],
        }

    return router


def _slot_end() -> int:
    import time

    return QR_WINDOW_SEC - (int(time.time()) % QR_WINDOW_SEC)


def mount_adms_routes(app, db):
    app.include_router(create_adms_router(db), prefix="/iclock")
