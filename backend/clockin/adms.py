"""ZKTeco / eSSL ADMS (push) protocol handlers.

Devices call these endpoints over HTTP(S). Responses are plain text, not JSON.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Request, Response

logger = logging.getLogger(__name__)

# Biometric devices in India report wall-clock local time (IST), not UTC
IST = timezone(timedelta(hours=5.5))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_attlog_body(body: str) -> list[dict]:
    """Parse ATTLOG push body (newline records, tab-separated fields)."""
    rows = []
    for line in (body or "").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            parts = line.split(",")
        if len(parts) < 2:
            continue
        user_id = parts[0].strip()
        ts_raw = parts[1].strip()
        status = parts[2].strip() if len(parts) > 2 else "0"
        # status: 0/1 often check-in, 1 check-out — treat as auto and let engine order by time
        direction = "out" if status in ("1", "Out", "out", "1\r") else "auto"
        try:
            # Device wall clock is IST for TN SMB machines
            punched_at = datetime.strptime(ts_raw[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=IST)
        except ValueError:
            try:
                punched_at = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                if punched_at.tzinfo is None:
                    punched_at = punched_at.replace(tzinfo=IST)
            except ValueError:
                logger.warning("ADMS: skip unparseable timestamp %s", ts_raw)
                continue
        rows.append(
            {
                "device_user_id": user_id,
                "punched_at": punched_at.isoformat(),
                "direction": direction,
                "raw": line,
            }
        )
    return rows


async def resolve_device(db, serial: str) -> Optional[dict]:
    if not serial:
        return None
    return await db.clockin_devices.find_one(
        {"serial_number": serial.strip(), "is_active": True},
        {"_id": 0},
    )


async def ingest_attlog(db, device: dict, rows: list[dict]) -> int:
    inserted = 0
    company_id = device["company_id"]
    for row in rows:
        emp = await db.clockin_employees.find_one(
            {
                "company_id": company_id,
                "device_user_id": str(row["device_user_id"]),
                "is_active": True,
            },
            {"_id": 0},
        )
        if not emp:
            # stash unmapped for owner UI
            await db.clockin_unmapped_punches.update_one(
                {
                    "company_id": company_id,
                    "device_sn": device["serial_number"],
                    "device_user_id": str(row["device_user_id"]),
                    "punched_at": row["punched_at"],
                },
                {
                    "$setOnInsert": {
                        "id": str(uuid.uuid4()),
                        "company_id": company_id,
                        "device_sn": device["serial_number"],
                        "device_user_id": str(row["device_user_id"]),
                        "punched_at": row["punched_at"],
                        "direction": row["direction"],
                        "raw": row.get("raw"),
                        "created_at": _now_iso(),
                    }
                },
                upsert=True,
            )
            continue

        # idempotent: same employee + same timestamp + machine
        existing = await db.clockin_punches.find_one(
            {
                "company_id": company_id,
                "employee_id": emp["id"],
                "punched_at": row["punched_at"],
                "source": "machine",
            },
            {"_id": 0},
        )
        if existing:
            continue

        punch = {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "employee_id": emp["id"],
            "punched_at": row["punched_at"],
            "direction": row["direction"],
            "source": "machine",
            "device_sn": device["serial_number"],
            "device_user_id": str(row["device_user_id"]),
            "raw": row.get("raw"),
            "created_at": _now_iso(),
        }
        await db.clockin_punches.insert_one(punch)
        inserted += 1

    await db.clockin_devices.update_one(
        {"id": device["id"]},
        {"$set": {"last_seen_at": _now_iso()}},
    )
    return inserted


def create_adms_router(db) -> APIRouter:
    """Device-facing routes (no JWT). Mount at /iclock and under /api/clockin/adms/iclock."""
    router = APIRouter(tags=["clockin-adms"])

    @router.api_route("/cdata", methods=["GET", "POST"])
    async def cdata(request: Request):
        sn = request.query_params.get("SN") or request.query_params.get("sn") or ""
        table = (request.query_params.get("table") or "").upper()
        options = request.query_params.get("options")

        device = await resolve_device(db, sn)
        if not device:
            logger.warning("ADMS unknown device SN=%s", sn)
            # Still ACK so device does not retry forever during setup
            return Response(content="OK", media_type="text/plain")

        await db.clockin_devices.update_one(
            {"id": device["id"]},
            {"$set": {"last_seen_at": _now_iso()}},
        )

        if request.method == "GET" and options:
            # Handshake / options exchange
            body = (
                f"GET OPTION FROM: {sn}\n"
                "ATTLOGStamp=None\n"
                "OPERLOGStamp=None\n"
                "ATTPHOTOStamp=None\n"
                "ErrorDelay=30\n"
                "Delay=10\n"
                "TransTimes=00:00;14:00\n"
                "TransInterval=1\n"
                "TransFlag=1111000000\n"
                "TimeZone=5.5\n"
                "Realtime=1\n"
                "Encrypt=0\n"
            )
            return Response(content=body, media_type="text/plain")

        if request.method == "POST" and table == "ATTLOG":
            raw = (await request.body()).decode("utf-8", errors="ignore")
            rows = parse_attlog_body(raw)
            n = await ingest_attlog(db, device, rows)
            logger.info("ADMS ATTLOG SN=%s rows=%s inserted=%s", sn, len(rows), n)
            return Response(content="OK", media_type="text/plain")

        # Other tables (OPERLOG, ATTPHOTO…) — acknowledge
        if request.method == "POST":
            return Response(content="OK", media_type="text/plain")

        return Response(content="OK", media_type="text/plain")

    @router.get("/getrequest")
    async def getrequest(request: Request):
        sn = request.query_params.get("SN") or request.query_params.get("sn") or ""
        device = await resolve_device(db, sn)
        if device:
            await db.clockin_devices.update_one(
                {"id": device["id"]},
                {"$set": {"last_seen_at": _now_iso()}},
            )
        # No pending remote commands in v1
        return Response(content="OK", media_type="text/plain")

    return router
