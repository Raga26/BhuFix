from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ClockInRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1, max_length=120)
    business_name: str = Field(..., min_length=1, max_length=120)


class ClockInLogin(BaseModel):
    email: str
    password: str


class CompanyUpsert(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    owner_whatsapp: Optional[str] = None
    bot_whatsapp: Optional[str] = None  # public ClockIN line employees text IN/OUT to
    shift_start: str = "09:00"
    shift_end: str = "18:00"
    grace_minutes: int = Field(default=15, ge=0, le=120)
    half_day_hours: float = Field(default=4.0, ge=1, le=12)
    timezone: str = "Asia/Kolkata"
    office_lat: Optional[float] = None
    office_lng: Optional[float] = None
    geofence_radius_m: int = Field(default=120, ge=30, le=2000)


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    device_user_id: Optional[str] = None
    pin: str = Field(..., min_length=4, max_length=6)
    pay_type: Literal["monthly", "daily"] = "monthly"
    monthly_salary: float = Field(default=0, ge=0)
    daily_wage: float = Field(default=0, ge=0)
    ot_rate_per_hour: float = Field(default=0, ge=0)
    weekly_offs: list[int] = Field(default_factory=lambda: [0])


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    device_user_id: Optional[str] = None
    pin: Optional[str] = Field(default=None, min_length=4, max_length=6)
    pay_type: Optional[Literal["monthly", "daily"]] = None
    monthly_salary: Optional[float] = None
    daily_wage: Optional[float] = None
    ot_rate_per_hour: Optional[float] = None
    weekly_offs: Optional[list[int]] = None
    is_active: Optional[bool] = None


class FaceEnrollRequest(BaseModel):
    """Base64 data URL or raw base64 of JPEG/PNG selfie for enrollment."""
    image_base64: str = Field(..., min_length=100)


class DeviceCreate(BaseModel):
    serial_number: str = Field(..., min_length=1, max_length=64)
    name: str = Field(default="Biometric Device", max_length=120)
    brand: Literal["zkteco", "essl", "other"] = "zkteco"


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[Literal["zkteco", "essl", "other"]] = None
    is_active: Optional[bool] = None


class ManualPunch(BaseModel):
    employee_id: str
    punched_at: Optional[datetime] = None
    direction: Literal["in", "out", "auto"] = "auto"


class PunchSessionStart(BaseModel):
    """Step 1 after opening WA link / scanning QR: prove presence, get liveness prompt."""
    challenge_id: Optional[str] = None
    office_qr: Optional[str] = None
    display_token: Optional[str] = None
    phone: Optional[str] = None
    employee_code: Optional[str] = None
    lat: float
    lng: float
    direction: Literal["in", "out", "auto"] = "auto"


class SecureSoftPunch(BaseModel):
    """Step 2: complete punch with selfie (face) or PIN fallback."""
    session_id: str
    selfie_base64: Optional[str] = None
    liveness_action: Optional[str] = None  # must match session prompt key
    pin: Optional[str] = Field(default=None, min_length=4, max_length=6)
    use_pin_fallback: bool = False


class AdvanceCreate(BaseModel):
    employee_id: str
    amount: float = Field(..., gt=0)
    note: Optional[str] = None
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)


class PayrollGenerate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
