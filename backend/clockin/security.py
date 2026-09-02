"""Presence proofs for soft punch (QR + geofence). Server always owns the clock."""
from __future__ import annotations

import hashlib
import hmac
import math
import secrets
import time
from typing import Optional


QR_WINDOW_SEC = 30


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _slot(ts: Optional[float] = None) -> int:
    return int((ts if ts is not None else time.time()) // QR_WINDOW_SEC)


def rotating_qr_code(company_id: str, secret: str, slot: Optional[int] = None) -> str:
    s = _slot() if slot is None else slot
    digest = hmac.new(
        secret.encode("utf-8"),
        f"{company_id}:{s}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return digest[:8].upper()


def verify_rotating_qr(company_id: str, secret: str, code: str) -> bool:
    if not code or not secret:
        return False
    code = code.strip().upper()
    now = _slot()
    for s in (now, now - 1):  # allow previous window (clock skew / scan delay)
        if hmac.compare_digest(rotating_qr_code(company_id, secret, s), code):
            return True
    return False


def new_secret() -> str:
    return secrets.token_urlsafe(24)


def hash_pin(pin: str) -> str:
    return hashlib.sha256(f"clockin-pin:{pin.strip()}".encode("utf-8")).hexdigest()


def verify_pin(pin: str, pin_hash: Optional[str]) -> bool:
    if not pin or not pin_hash:
        return False
    return hmac.compare_digest(hash_pin(pin), pin_hash)


def within_geofence(
    lat: Optional[float],
    lng: Optional[float],
    office_lat: Optional[float],
    office_lng: Optional[float],
    radius_m: float,
) -> tuple[bool, Optional[float]]:
    if office_lat is None or office_lng is None:
        return False, None
    if lat is None or lng is None:
        return False, None
    dist = haversine_m(float(lat), float(lng), float(office_lat), float(office_lng))
    return dist <= float(radius_m), round(dist, 1)
