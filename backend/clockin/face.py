"""Face enroll + 1:1 verify for ClockIN soft punch.

Production: AWS Rekognition CompareFaces (set AWS credentials + CLOCKIN_FACE_MODE=rekognition).
Dev fallback: Pillow average-hash distance (tolerant enough for local testing).
"""
from __future__ import annotations

import base64
import io
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

FACE_ROOT = Path(__file__).resolve().parent.parent / "data" / "clockin_faces"
FACE_ROOT.mkdir(parents=True, exist_ok=True)

REKOGNITION_THRESHOLD = float(os.environ.get("CLOCKIN_FACE_THRESHOLD", "85"))
HASH_MAX_DISTANCE = int(os.environ.get("CLOCKIN_FACE_HASH_MAX_DISTANCE", "18"))
MAX_IMAGE_BYTES = 2_500_000


def _face_mode() -> str:
    mode = (os.environ.get("CLOCKIN_FACE_MODE") or "").strip().lower()
    if mode in ("rekognition", "dev"):
        return mode
    # Auto: use Rekognition when AWS region/keys look available
    if os.environ.get("AWS_ACCESS_KEY_ID") or os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION"):
        return "rekognition"
    return "dev"


def decode_image_b64(data_url_or_b64: str) -> bytes:
    raw = (data_url_or_b64 or "").strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    raw = re.sub(r"\s+", "", raw)
    try:
        blob = base64.b64decode(raw, validate=False)
    except Exception as e:
        raise ValueError("Invalid image encoding") from e
    if len(blob) < 800 or len(blob) > MAX_IMAGE_BYTES:
        raise ValueError("Image must be between 1KB and 2.5MB")
    if not (blob[:3] == b"\xff\xd8\xff" or blob[:8] == b"\x89PNG\r\n\x1a\n"):
        # allow webp loosely
        if blob[:4] != b"RIFF":
            raise ValueError("Image must be JPEG, PNG, or WEBP")
    return blob


def save_face_image(company_id: str, employee_id: str, blob: bytes, kind: str = "enroll") -> str:
    folder = FACE_ROOT / company_id / employee_id
    folder.mkdir(parents=True, exist_ok=True)
    ext = ".jpg"
    if blob[:8] == b"\x89PNG\r\n\x1a\n":
        ext = ".png"
    name = f"{kind}_{uuid.uuid4().hex[:12]}{ext}"
    path = folder / name
    path.write_bytes(blob)
    # relative path stored in DB
    return str(path.relative_to(FACE_ROOT)).replace("\\", "/")


def load_face_image(relative_path: str) -> bytes:
    path = FACE_ROOT / relative_path
    if not path.is_file():
        raise FileNotFoundError(relative_path)
    return path.read_bytes()


def _average_hash(blob: bytes, hash_size: int = 16) -> Optional[int]:
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow not installed — face hash fallback unavailable")
        return None
    img = Image.open(io.BytesIO(blob)).convert("L").resize(
        (hash_size, hash_size), Image.Resampling.LANCZOS
    )
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    bits = 0
    for i, p in enumerate(pixels):
        if p >= avg:
            bits |= 1 << i
    return bits


def _hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def _compare_dev(source: bytes, target: bytes) -> tuple[bool, float, str]:
    hs = _average_hash(source)
    ht = _average_hash(target)
    if hs is None or ht is None:
        # Last-resort local: accept if both images decode and are non-trivial size
        # (only when CLOCKIN_FACE_DEV_PERMISSIVE=1)
        if os.environ.get("CLOCKIN_FACE_DEV_PERMISSIVE") == "1":
            return True, 50.0, "dev_permissive"
        return False, 0.0, "dev_no_pillow"
    dist = _hamming(hs, ht)
    # Map distance to a pseudo-similarity score
    max_bits = 16 * 16
    similarity = max(0.0, 100.0 * (1 - dist / max_bits))
    ok = dist <= HASH_MAX_DISTANCE
    return ok, round(similarity, 1), f"dev_hash_dist={dist}"


def _compare_rekognition(source: bytes, target: bytes) -> tuple[bool, float, str]:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError

    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-south-1"
    client = boto3.client("rekognition", region_name=region)
    try:
        resp = client.compare_faces(
            SourceImage={"Bytes": source},
            TargetImage={"Bytes": target},
            SimilarityThreshold=float(REKOGNITION_THRESHOLD),
        )
    except (BotoCoreError, ClientError) as e:
        logger.exception("Rekognition CompareFaces failed")
        raise RuntimeError(f"Face service error: {e}") from e

    matches = resp.get("FaceMatches") or []
    if not matches:
        unmatched = resp.get("UnmatchedFaces") or []
        return False, 0.0, f"rekognition_no_match unmatched={len(unmatched)}"
    best = max(float(m.get("Similarity") or 0) for m in matches)
    return best >= REKOGNITION_THRESHOLD, round(best, 1), "rekognition"


def compare_faces(enrolled_blob: bytes, selfie_blob: bytes) -> tuple[bool, float, str]:
    mode = _face_mode()
    if mode == "rekognition":
        try:
            return _compare_rekognition(enrolled_blob, selfie_blob)
        except RuntimeError:
            # Fall back to dev hash if Rekognition misconfigured
            logger.warning("Falling back to dev face compare")
            return _compare_dev(enrolled_blob, selfie_blob)
    return _compare_dev(enrolled_blob, selfie_blob)


def verify_against_enrollments(
    enrollment_paths: list[str], selfie_blob: bytes
) -> tuple[bool, float, str, Optional[str]]:
    """Return (ok, best_score, detail, matched_path)."""
    if not enrollment_paths:
        return False, 0.0, "no_enrollments", None
    best_ok = False
    best_score = 0.0
    best_detail = ""
    best_path = None
    for rel in enrollment_paths:
        try:
            enrolled = load_face_image(rel)
        except FileNotFoundError:
            continue
        ok, score, detail = compare_faces(enrolled, selfie_blob)
        if score >= best_score:
            best_score = score
            best_detail = detail
            best_path = rel
            best_ok = ok or best_ok
        if ok:
            return True, score, detail, rel
    return best_ok, best_score, best_detail, best_path


LIVENESS_PROMPTS = [
    ("smile", "Smile clearly at the camera"),
    ("blink", "Blink once, then hold still"),
    ("look_left", "Turn your head slightly left, then face the camera"),
    ("look_right", "Turn your head slightly right, then face the camera"),
]


def pick_liveness() -> tuple[str, str]:
    import random

    return random.choice(LIVENESS_PROMPTS)
