"""Attendance status from punch events."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional


def _parse_hhmm(value: str) -> tuple[int, int]:
    parts = (value or "09:00").split(":")
    return int(parts[0]), int(parts[1] if len(parts) > 1 else 0)


def parse_iso(dt: Any) -> datetime:
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    s = str(dt).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(s)
    except ValueError:
        parsed = datetime.strptime(str(dt)[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def local_date_str(dt: datetime, tz_offset_hours: float = 5.5) -> str:
    local = dt.astimezone(timezone(timedelta(hours=tz_offset_hours)))
    return local.strftime("%Y-%m-%d")


def summarize_day(
    punches: list[dict],
    company: dict,
    employee: dict,
    day: str,
    tz_offset_hours: float = 5.5,
) -> dict:
    """Compute present/late/half/absent/ot for one employee on one calendar day."""
    shift_h, shift_m = _parse_hhmm(company.get("shift_start", "09:00"))
    end_h, end_m = _parse_hhmm(company.get("shift_end", "18:00"))
    grace = int(company.get("grace_minutes", 15))
    half_hours = float(company.get("half_day_hours", 4.0))

    day_punches = sorted(
        [p for p in punches if local_date_str(parse_iso(p["punched_at"]), tz_offset_hours) == day],
        key=lambda p: parse_iso(p["punched_at"]),
    )

    weekday = datetime.strptime(day, "%Y-%m-%d").weekday()  # Mon=0
    # Convert to Sun=0 style used in employee.weekly_offs
    sunday_based = (weekday + 1) % 7
    weekly_offs = employee.get("weekly_offs") or [0]
    if sunday_based in weekly_offs:
        return {
            "date": day,
            "employee_id": employee["id"],
            "status": "week_off",
            "first_in": None,
            "last_out": None,
            "worked_hours": 0,
            "ot_hours": 0,
            "late_minutes": 0,
            "punches": day_punches,
        }

    if not day_punches:
        return {
            "date": day,
            "employee_id": employee["id"],
            "status": "absent",
            "first_in": None,
            "last_out": None,
            "worked_hours": 0,
            "ot_hours": 0,
            "late_minutes": 0,
            "punches": [],
        }

    first = parse_iso(day_punches[0]["punched_at"])
    last = parse_iso(day_punches[-1]["punched_at"])
    local_first = first.astimezone(timezone(timedelta(hours=tz_offset_hours)))
    expected = local_first.replace(hour=shift_h, minute=shift_m, second=0, microsecond=0)
    late_minutes = max(0, int((local_first - expected).total_seconds() // 60) - grace)

    worked_seconds = max(0, (last - first).total_seconds())
    # single punch → count as present with 0 hours until OUT
    if len(day_punches) == 1:
        worked_seconds = 0

    worked_hours = round(worked_seconds / 3600, 2)
    shift_seconds = (
        datetime(2000, 1, 1, end_h, end_m) - datetime(2000, 1, 1, shift_h, shift_m)
    ).total_seconds()
    ot_hours = max(0, round((worked_seconds - shift_seconds) / 3600, 2)) if worked_seconds else 0

    if worked_hours == 0 and len(day_punches) >= 1:
        status = "present" if late_minutes == 0 else "late"
    elif worked_hours < half_hours:
        status = "half_day"
    elif late_minutes > 0:
        status = "late"
    else:
        status = "present"

    return {
        "date": day,
        "employee_id": employee["id"],
        "employee_name": employee.get("name"),
        "status": status,
        "first_in": first.isoformat(),
        "last_out": last.isoformat() if len(day_punches) > 1 else None,
        "worked_hours": worked_hours,
        "ot_hours": ot_hours,
        "late_minutes": late_minutes,
        "awaiting_checkout": len(day_punches) == 1,
        "check_in_method": _method_label(day_punches[0]),
        "check_out_method": _method_label(day_punches[-1]) if len(day_punches) > 1 else None,
        "punches": [
            {
                "id": p.get("id"),
                "punched_at": p.get("punched_at"),
                "direction": p.get("direction"),
                "source": p.get("source"),
                "identity_via": p.get("identity_via"),
                "presence_via": p.get("presence_via"),
                "face_score": p.get("face_score"),
                "method": _method_label(p),
            }
            for p in day_punches
        ],
    }


def _method_label(punch: dict) -> str:
    if not punch:
        return "—"
    source = (punch.get("source") or "").lower()
    identity = (punch.get("identity_via") or "").lower()
    presence = (punch.get("presence_via") or "").lower()
    if source == "machine":
        return "Biometric machine"
    if source == "manual":
        return "Manual (owner)"
    parts = []
    if "qr" in presence or presence == "office_qr" or presence == "whatsapp_and_qr":
        parts.append("Office QR")
    elif "whatsapp" in presence:
        parts.append("WhatsApp link")
    if identity == "face":
        score = punch.get("face_score")
        parts.append(f"Face selfie{f' ({score})' if score is not None else ''}")
    elif identity == "pin_fallback":
        parts.append("PIN")
    elif source == "soft":
        parts.append("Soft punch")
    return " + ".join(parts) if parts else (source or "Unknown")


def build_owner_digest(company: dict, employees: list[dict], day_summaries: list[dict]) -> str:
    name = company.get("name", "Your business")
    by_status: dict[str, list[str]] = {
        "present": [],
        "late": [],
        "half_day": [],
        "absent": [],
        "week_off": [],
    }
    emp_names = {e["id"]: e.get("name", "?") for e in employees}
    for s in day_summaries:
        st = s.get("status", "absent")
        by_status.setdefault(st, []).append(emp_names.get(s["employee_id"], s.get("employee_name", "?")))

    lines = [
        f"*{name} — Attendance*",
        f"Date: {day_summaries[0]['date'] if day_summaries else 'today'}",
        "",
        f"✅ Present: {len(by_status['present'])}",
        f"⏰ Late: {len(by_status['late'])}",
        f"🌓 Half-day: {len(by_status['half_day'])}",
        f"❌ Absent: {len(by_status['absent'])}",
        f"🗓 Week off: {len(by_status['week_off'])}",
    ]

    def _fmt_hm(iso: Optional[str]) -> str:
        if not iso:
            return "—"
        try:
            dt = parse_iso(iso)
            return dt.strftime("%I:%M %p").lstrip("0")
        except Exception:
            return "—"

    detail_rows = []
    for s in day_summaries:
        if s.get("status") in ("absent", "week_off") and not s.get("first_in"):
            continue
        emp_name = emp_names.get(s["employee_id"], s.get("employee_name", "?"))
        cin = _fmt_hm(s.get("first_in"))
        cout = _fmt_hm(s.get("last_out")) if not s.get("awaiting_checkout") else "still in"
        hours = s.get("worked_hours")
        hours_s = f"{hours}h" if hours is not None else "—"
        method = s.get("check_in_method") or "—"
        if s.get("check_out_method") and s.get("last_out"):
            method = f"IN: {method} · OUT: {s['check_out_method']}"
        detail_rows.append(
            f"• {emp_name}: {cin} → {cout} · {hours_s} · {method}"
        )
    if detail_rows:
        lines += ["", "*Details:*"] + detail_rows

    if by_status["late"]:
        lines += ["", "*Late:* " + ", ".join(by_status["late"])]
    if by_status["absent"]:
        lines += ["", "*Absent:* " + ", ".join(by_status["absent"])]
    if by_status["half_day"]:
        lines += ["", "*Half-day:* " + ", ".join(by_status["half_day"])]
    return "\n".join(lines)
