from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import html
import logging
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(
    title="Bhufix Digital Marketing Agency API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ── Rate Limiter ─────────────────────────────────────────────────
rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX = 5       # max requests
RATE_LIMIT_WINDOW = 3600 # per 1 hour (seconds)

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        return False
    rate_limit_store[ip].append(now)
    return True

# ── Security Headers Middleware ──────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate" if "/api/" in str(request.url) else "public, max-age=31536000, immutable"
        return response

# ── Input Sanitization ───────────────────────────────────────────
def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not text:
        return text
    text = html.escape(text.strip())
    text = re.sub(r'<[^>]+>', '', text)  # Remove any remaining HTML tags
    return text

# ── Pydantic Models ──────────────────────────────────────────────
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=254)
    phone: str = Field(default="", max_length=20)
    service: str = Field(default="", max_length=100)
    message: str = Field(..., min_length=10, max_length=2000)
    honeypot: str = Field(default="")  # Spam trap: should be empty; bots fill this

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError("Invalid email address")
        return v.lower().strip()

    @field_validator("name", "message", "service", "phone")
    @classmethod
    def sanitize_fields(cls, v):
        return sanitize_input(v)

class ContactResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: str
    service: str
    message: str
    created_at: str
    ip_address: str = ""

# ── Routes ───────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "Bhufix Digital Marketing Agency API"}

@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ── Contact Form ─────────────────────────────────────────────────
@api_router.post("/contact")
async def submit_contact(data: ContactCreate, request: Request):
    # Honeypot check
    if data.honeypot:
        logger.warning(f"Spam detected from {request.client.host}")
        return {"id": str(uuid.uuid4()), "message": "Contact form submitted successfully"}

    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many submissions. Please try again later."
        )

    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    doc = {
        "id": contact_id,
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "service": data.service,
        "message": data.message,
        "ip_address": client_ip,
        "created_at": now.isoformat(),
        "read": False,
    }

    await db.contacts.insert_one(doc)
    logger.info(f"New contact submission from {data.email} (IP: {client_ip})")

    return {"id": contact_id, "message": "Contact form submitted successfully"}

@api_router.get("/contact", response_model=List[ContactResponse])
async def get_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return contacts

# ── Status Endpoints (existing) ──────────────────────────────────
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ── Global Exception Handler ─────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )

# ── Include Router & Middleware ───────────────────────────────────
app.include_router(api_router)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# Start the server if run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
