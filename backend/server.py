from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders
from motor.motor_asyncio import AsyncIOMotorClient
from jose import JWTError, jwt
from passlib.context import CryptContext
import certifi
import os
import re
import html
import logging
import logging.handlers
import time
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import traceback
import json

# Configure comprehensive logging
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Create logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# File handler for all logs
file_handler = logging.handlers.RotatingFileHandler(
    LOG_DIR / "bhufix.log",
    maxBytes=10485760,  # 10MB
    backupCount=10
)
file_handler.setLevel(logging.DEBUG)

# File handler for errors only
error_handler = logging.handlers.RotatingFileHandler(
    LOG_DIR / "bhufix_errors.log",
    maxBytes=10485760,  # 10MB
    backupCount=10
)
error_handler.setLevel(logging.ERROR)

# Console handler - Set to DEBUG for detailed Render logs
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(formatter)
error_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(error_handler)
logger.addHandler(console_handler)

ROOT_DIR = Path(__file__).parent
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"

logger.info("🚀 Starting Bhufix Application Initialization")
logger.info(f"Root Directory: {ROOT_DIR}")
logger.info(f"Frontend Build Directory: {FRONTEND_BUILD_DIR}")

# Load environment variables
load_dotenv(ROOT_DIR / '.env')
logger.info("Environment variables loaded successfully")

# Email configuration
GMAIL_USER = os.environ.get('GMAIL_USER')
GMAIL_PASSWORD = os.environ.get('GMAIL_PASSWORD')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'bhufix@gmail.com')

if GMAIL_USER:
    logger.info(f"Gmail configured for: {GMAIL_USER}")
else:
    logger.warning("⚠️  Gmail not configured - email notifications will be disabled")

# JWT / Auth configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'bhufix-default-secret-change-in-prod')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', '480'))
OWNER_EMAIL = os.environ.get('OWNER_EMAIL', '')
OWNER_PASSWORD = os.environ.get('OWNER_PASSWORD', '')
OWNER_NAME = os.environ.get('OWNER_NAME', 'BhuFix Admin')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Environment validation
logger.info("Validating required environment variables...")
try:
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    logger.info(f"MongoDB connection string found (length: {len(mongo_url)} chars)")
    logger.info(f"Database name: {db_name}")
except KeyError as e:
    logger.error(f"❌ Missing required environment variable: {e}")
    raise

# MongoDB connection
logger.info("Attempting to connect to MongoDB...")
try:
    client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=20000,
        maxPoolSize=10,
        minPoolSize=1,
        tlsCAFile=certifi.where(),
    )
    db = client[db_name]
    logger.info("✓ MongoDB client initialized for Render")
except Exception as e:
    logger.error(f"❌ Failed to initialize MongoDB client: {e}", exc_info=True)
    raise

# Create the main app
app = FastAPI(
    title="Bhufix Digital Marketing Agency API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ── Request Logging Middleware (pure ASGI — no response buffering) ──
class RequestLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())[:8]
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        method = scope.get("method", "?")
        path = scope.get("path", "?")
        start_time = time.time()

        logger.info(
            f"[{request_id}] INCOMING REQUEST | {method} {path} | IP: {client_ip}"
        )

        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            process_time = time.time() - start_time
            logger.info(
                f"[{request_id}] RESPONSE | {method} {path} | "
                f"Status: {status_code} | Duration: {process_time:.3f}s"
            )
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] ERROR | {method} {path} | "
                f"Duration: {process_time:.3f}s | Error: {str(e)}",
                exc_info=True,
            )
            raise

# ── Rate Limiter with Logging ────────────────────────────────────
# ── Rate Limiter with Logging ────────────────────────────────────
rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX = 5       # max requests
RATE_LIMIT_WINDOW = 3600 # per 1 hour (seconds)

def check_rate_limit(ip: str) -> bool:
    """Check rate limit for IP and log violations"""
    now = time.time()
    rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    
    current_count = len(rate_limit_store[ip])
    
    if current_count >= RATE_LIMIT_MAX:
        logger.warning(f"⚠️  Rate limit exceeded for IP {ip} | Requests in window: {current_count}/{RATE_LIMIT_MAX}")
        return False
    
    rate_limit_store[ip].append(now)
    logger.debug(f"Rate limit check passed for IP {ip} | Requests: {current_count + 1}/{RATE_LIMIT_MAX}")
    return True

# ── Security Headers Middleware (pure ASGI — avoids buffering FileResponse/Range) ──
class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path") or ""

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["X-XSS-Protection"] = "1; mode=block"
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

                content_type = (headers.get("content-type") or "").lower()
                if path.startswith("/api/") or "text/html" in content_type:
                    headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                    headers["Pragma"] = "no-cache"
                elif content_type.startswith(("image/", "video/", "audio/", "font/")) or any(
                    content_type.startswith(t)
                    for t in ("text/css", "application/javascript", "text/javascript")
                ):
                    headers["Cache-Control"] = "public, max-age=31536000, immutable"
                elif path.endswith(".html") or path in ("/", ""):
                    headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
                else:
                    headers["Cache-Control"] = "public, max-age=3600"

            await send(message)

        await self.app(scope, receive, send_with_headers)

# ── Input Sanitization ───────────────────────────────────────────
def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    if not text:
        return text
    text = html.escape(text.strip())
    text = re.sub(r'<[^>]+>', '', text)  # Remove any remaining HTML tags
    return text

# ── Email Sending ────────────────────────────────────────────────
async def send_contact_email(name: str, email: str, phone: str, service: str, message: str) -> bool:
    """Send contact form submission email to admin"""
    logger.info(f"📧 Attempting to send contact email for {email}")
    
    if not GMAIL_USER or not GMAIL_PASSWORD:
        logger.warning("⚠️  Gmail credentials not configured. Email not sent.")
        return False
    
    try:
        logger.debug(f"Creating email message for contact from {email}")
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['From'] = GMAIL_USER
        msg['To'] = ADMIN_EMAIL
        msg['Subject'] = f"New Contact Form Submission from {name}"
        msg['Auto-Submitted'] = 'auto-replied'
        
        # HTML email body
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #E87346;">New Contact Form Submission</h2>
                <hr>
                <p><strong>Name:</strong> {html.escape(name)}</p>
                <p><strong>Email:</strong> {html.escape(email)}</p>
                <p><strong>Phone:</strong> {html.escape(phone)}</p>
                <p><strong>Service Interested:</strong> {html.escape(service)}</p>
                <hr>
                <h3>Message:</h3>
                <p style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #E87346;">
                    {html.escape(message).replace(chr(10), '<br>')}
                </p>
                <hr>
                <p style="font-size: 12px; color: #999;">
                    This is an automated email from Bhufix website contact form.
                </p>
            </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
New Contact Form Submission

Name: {name}
Email: {email}
Phone: {phone}
Service: {service}

Message:
{message}

---
This is an automated email from Bhufix website contact form.
        """
        
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email via Gmail SMTP
        logger.debug(f"Connecting to SMTP server (smtp.gmail.com:587)")
        async with aiosmtplib.SMTP(hostname='smtp.gmail.com', port=587, start_tls=True) as smtp:
            logger.debug(f"SMTP connection established with TLS")
            logger.debug(f"SMTP login with user: {GMAIL_USER}")
            await smtp.login(GMAIL_USER, GMAIL_PASSWORD)
            
            logger.debug(f"Sending email to {ADMIN_EMAIL}")
            await smtp.send_message(msg)
        
        logger.info(f"✓ Email sent successfully to {ADMIN_EMAIL} for submission from {email}")
        return True
        
    except Exception as e:
        logger.error(
            f"❌ Failed to send email to {ADMIN_EMAIL} for submission from {email} | Error: {str(e)}",
            exc_info=True
        )
        return False

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

class FrontendLog(BaseModel):
    """Frontend log entry from browser"""
    timestamp: str
    level: str  # DEBUG, INFO, WARN, ERROR, SUCCESS
    message: str
    data: Optional[dict] = None
    sessionId: str
    url: str
    elapsed: str

class FrontendLogsRequest(BaseModel):
    """Request containing multiple frontend logs"""
    logs: List[FrontendLog]

# ── Dashboard Pydantic Models ─────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "employee"  # owner, employee, client
    sub_role: Optional[str] = None  # editor, videographer, management
    client_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    sub_role: Optional[str] = None  # editor, videographer, management
    client_id: Optional[str] = None


def normalize_managed_user_role(role: Optional[str], sub_role: Optional[str]) -> str:
    """Keep owner privileges out of the team/user-management flow.

    Job titles, including custom titles, are employee accounts.  The only
    exception is a client account, which is explicitly selected and has no
    team job title.  Owner accounts are provisioned through the owner seed,
    not through this endpoint.
    """
    if role == "client" and not sub_role:
        return "client"
    return "employee"

class ClientCreate(BaseModel):
    name: str
    industry: str = ""
    level: str = "Silver"  # Silver, Gold, Diamond, Customised
    logo_emoji: str = ""
    color: str = "#E8734A"
    ig_handle: str = ""
    followers: str = "0"
    reels_count: int = 0
    ad_budget: int = 0
    ad_spent: int = 0
    monthly_progress: int = 0
    drive_link: str = ""
    start_date: str = ""

    @field_validator('reels_count', 'ad_budget', 'ad_spent', 'monthly_progress', mode='before')
    @classmethod
    def coerce_empty_to_zero(cls, v):
        if v is None or v == '':
            return 0
        try:
            return int(float(str(v)))
        except (ValueError, TypeError):
            return 0

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    level: Optional[str] = None
    logo_emoji: Optional[str] = None
    color: Optional[str] = None
    ig_handle: Optional[str] = None
    followers: Optional[str] = None
    reels_count: Optional[int] = None
    ad_budget: Optional[int] = None
    ad_spent: Optional[int] = None
    monthly_progress: Optional[int] = None
    drive_link: Optional[str] = None
    start_date: Optional[str] = None

class CalendarEventCreate(BaseModel):
    client_id: str
    title: str
    type: str = "reel"   # reel, post, ad, content, shoot
    date: str            # ISO date string e.g. "2026-04-15"
    time: Optional[str] = None  # HH:MM e.g. "14:30"
    status: str = "not_started"  # not_started, in_progress, completed, postpone

class AdsCampaignCreate(BaseModel):
    client_id: str
    platform: str = "Meta"
    budget: int = 0
    spent: int = 0
    month: int
    year: int

class KPICreate(BaseModel):
    client_id: str
    platform: str = "Instagram"
    reach: int = 0
    engagement_rate: float = 0.0
    followers_gained: int = 0
    dm_inquiries: int = 0
    bookings: int = 0
    month: int
    year: int

class PostReportUpsert(BaseModel):
    client_id: str
    month: int
    year: int
    target_videos: int = 0
    target_posters: int = 0
    target_youtube: int = 0
    posted_videos: int = 0
    posted_posters: int = 0
    posted_youtube: int = 0
    video_dates: List[str] = []
    poster_dates: List[str] = []
    youtube_dates: List[str] = []
    completed: bool = False
    notes: str = ""

class ChatMessageCreate(BaseModel):
    thread: str = "team"   # "team" or "client"
    client_id: Optional[str] = None
    message: str

class StrategyHookCreate(BaseModel):
    title: str
    body: str
    example_text: str

# ── Auth Helpers ──────────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id, "is_active": True}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_owner(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user

async def require_staff(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ["owner", "employee"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    return current_user

async def normalize_existing_team_roles():
    """Remove legacy owner access from users created with a team job title."""
    result = await db.users.update_many(
        {"role": "owner", "sub_role": {"$exists": True, "$ne": None}},
        {"$set": {"role": "employee"}},
    )
    if result.modified_count:
        logger.info("Normalized %s legacy team role(s) to employee access", result.modified_count)


async def seed_owner():
    if not OWNER_EMAIL or not OWNER_PASSWORD:
        logger.warning("OWNER_EMAIL/OWNER_PASSWORD not set — skipping owner seed")
        return
    new_hash = get_password_hash(OWNER_PASSWORD)
    existing = await db.users.find_one({"email": OWNER_EMAIL.lower()})
    if existing:
        await db.users.update_one(
            {"email": OWNER_EMAIL.lower()},
            {"$set": {
                "password_hash": new_hash,
                "role": "owner",
                "is_active": True,
                "name": OWNER_NAME,
            }}
        )
        logger.info(f"✓ Owner account password synced from env: {OWNER_EMAIL}")
        return
    owner = {
        "id": str(uuid.uuid4()),
        "email": OWNER_EMAIL.lower(),
        "name": OWNER_NAME,
        "password_hash": new_hash,
        "role": "owner",
        "client_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(owner)
    logger.info(f"✓ Owner account seeded: {OWNER_EMAIL}")

# ── Routes ───────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    logger.debug("API root endpoint accessed")
    return {"message": "Bhufix Digital Marketing Agency API"}

@api_router.get("/health")
async def health_check():
    logger.info("🏥 Health check requested")
    try:
        logger.debug("Testing MongoDB connection...")
        await db.command("ping")
        db_status = "connected"
        logger.info("✓ MongoDB health check passed")
    except Exception as e:
        db_status = "disconnected"
        logger.error(f"❌ MongoDB health check failed: {e}")
    
    health_response = {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    logger.debug(f"Health check response: {health_response}")
    return health_response

# ── Contact Form ─────────────────────────────────────────────────
@api_router.post("/contact")
async def submit_contact(data: ContactCreate, request: Request):
    logger.info(f"📝 New contact form submission attempt from {request.client.host if request.client else 'unknown'}")
    
    # Honeypot check
    if data.honeypot:
        logger.warning(f"🚫 Spam detected from {request.client.host} - honeypot field filled")
        return {"id": str(uuid.uuid4()), "message": "Contact form submitted successfully"}

    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    logger.debug(f"Checking rate limit for IP: {client_ip}")
    
    if not check_rate_limit(client_ip):
        logger.warning(f"⚠️  Rate limit exceeded for IP {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="Too many submissions. Please try again later."
        )

    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    logger.debug(f"Creating contact document with ID: {contact_id}")

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

    try:
        logger.debug(f"Inserting contact into database - ID: {contact_id}, Email: {data.email}")
        await db.contacts.insert_one(doc)
        logger.info(f"✓ Contact submission saved - ID: {contact_id}, From: {data.email} (IP: {client_ip})")
    except Exception as e:
        logger.error(f"❌ Failed to save contact to database - ID: {contact_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save contact form")
    
    # Send email notification to admin
    logger.debug(f"Attempting to send email notification for contact ID: {contact_id}")
    email_sent = await send_contact_email(
        name=data.name,
        email=data.email,
        phone=data.phone,
        service=data.service,
        message=data.message
    )
    
    if email_sent:
        logger.info(f"✓ Email notification sent successfully for contact ID: {contact_id}")
    else:
        logger.warning(f"⚠️  Email notification failed for contact ID: {contact_id} (contact still saved)")

    return {"id": contact_id, "message": "Contact form submitted successfully"}

@api_router.get("/contact", response_model=List[ContactResponse])
async def get_contacts():
    logger.info("📋 Fetching all contacts")
    try:
        logger.debug("Querying contacts from MongoDB")
        contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
        logger.info(f"✓ Retrieved {len(contacts)} contacts from database")
        return contacts
    except Exception as e:
        logger.error(f"❌ Failed to retrieve contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve contacts")

# ── Status Endpoints (existing) ──────────────────────────────────
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    logger.info(f"📊 Creating status check for client: {input.client_name}")
    try:
        status_dict = input.model_dump()
        status_obj = StatusCheck(**status_dict)
        doc = status_obj.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        
        logger.debug(f"Inserting status check into database - Client: {input.client_name}")
        await db.status_checks.insert_one(doc)
        logger.info(f"✓ Status check created for {input.client_name} with ID: {status_obj.id}")
        return status_obj
    except Exception as e:
        logger.error(f"❌ Failed to create status check for {input.client_name}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create status check")

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    logger.info("📊 Fetching all status checks")
    try:
        logger.debug("Querying status checks from MongoDB")
        status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
        
        for check in status_checks:
            if isinstance(check['timestamp'], str):
                check['timestamp'] = datetime.fromisoformat(check['timestamp'])
        
        logger.info(f"✓ Retrieved {len(status_checks)} status checks from database")
        return status_checks
    except Exception as e:
        logger.error(f"❌ Failed to retrieve status checks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve status checks")

# ── Frontend Logs ────────────────────────────────────────────────
@api_router.post("/logs")
async def receive_frontend_logs(request: FrontendLogsRequest, client_request: Request):
    """Receive frontend logs from browser - logs go only to Render, not dev tools"""
    client_ip = client_request.client.host if client_request.client else "unknown"
    
    if not request.logs:
        return {"status": "ok", "received": 0}
    
    for log_entry in request.logs:
        # Format frontend log for backend logging
        data_str = f" | Data: {json.dumps(log_entry.data)}" if log_entry.data else ""
        log_message = (
            f"🌐 [Frontend | {log_entry.level}] {log_entry.message} "
            f"(Session: {log_entry.sessionId} | URL: {log_entry.url} | +{log_entry.elapsed}s){data_str}"
        )
        
        # Log to backend logger based on level
        if log_entry.level == "DEBUG":
            logger.debug(log_message)
        elif log_entry.level == "INFO" or log_entry.level == "SUCCESS":
            logger.info(log_message)
        elif log_entry.level == "WARN":
            logger.warning(log_message)
        elif log_entry.level == "ERROR":
            logger.error(log_message)
        else:
            logger.info(log_message)
    
    logger.debug(f"✓ Received and logged {len(request.logs)} frontend logs from client {client_ip}")
    return {"status": "ok", "received": len(request.logs)}

# ── Auth Endpoints ────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"email": data.email.lower().strip(), "is_active": True}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password_hash"}

# ── User Management (owner only) ──────────────────────────────────
@api_router.post("/users")
async def create_user(data: UserCreate, current_user: dict = Depends(require_owner)):
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    role = normalize_managed_user_role(data.role, data.sub_role)
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower().strip(),
        "name": sanitize_input(data.name),
        "password_hash": get_password_hash(data.password),
        "role": role,
        "sub_role": data.sub_role,
        "client_id": data.client_id,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}

@api_router.get("/users")
async def list_users(current_user: dict = Depends(require_owner)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)

@api_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, current_user: dict = Depends(require_owner)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated"}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(require_owner)):
    # Keep explicitly supplied nulls (for clearing a job/client association),
    # but do not treat omitted fields as updates.
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    if "role" in update_data or "sub_role" in update_data:
        existing = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "sub_role": 1})
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        update_data["role"] = normalize_managed_user_role(
            update_data.get("role", existing.get("role")),
            update_data.get("sub_role", existing.get("sub_role")),
        )
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated

@api_router.put("/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, data: dict, current_user: dict = Depends(require_owner)):
    new_password = data.get("password", "")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    result = await db.users.update_one({"id": user_id}, {"$set": {"password_hash": get_password_hash(new_password)}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password updated"}

# ── Dashboard Stats ───────────────────────────────────────────────
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["owner", "employee"]:
        def to_int(v):
            try:
                return int(float(str(v))) if v not in (None, '') else 0
            except (ValueError, TypeError):
                return 0

        total_clients = await db.clients.count_documents({})
        clients_data = await db.clients.find({}, {"reels_count": 1}).to_list(1000)
        total_reels = sum(to_int(c.get("reels_count", 0)) for c in clients_data)
        ads = await db.ads_campaigns.find({}).to_list(1000)
        total_budget = sum(to_int(a.get("budget", 0)) for a in ads)
        total_spent = sum(to_int(a.get("spent", 0)) for a in ads)
        kpis = await db.kpis.find({}).to_list(1000)
        total_dm = sum(to_int(k.get("dm_inquiries", 0)) for k in kpis)
        return {
            "total_clients": total_clients,
            "total_reels": total_reels,
            "total_ad_budget": total_budget,
            "total_ad_spent": total_spent,
            "total_dm_inquiries": total_dm,
        }
    client_id = current_user.get("client_id")
    if not client_id:
        return {}
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return client or {}

# ── Clients ───────────────────────────────────────────────────────
@api_router.get("/clients")
async def list_clients(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["owner", "employee"]:
        return await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    client_id = current_user.get("client_id")
    if not client_id:
        return []
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return [client] if client else []

@api_router.post("/clients")
async def create_client(data: ClientCreate, current_user: dict = Depends(require_owner)):
    client = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.clients.insert_one(client)
    client.pop("_id", None)
    return client

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientUpdate, current_user: dict = Depends(require_owner)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return await db.clients.find_one({"id": client_id}, {"_id": 0})

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(require_owner)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

# ── Content Calendar ──────────────────────────────────────────────
@api_router.get("/calendar")
async def get_calendar(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    query = {}
    if month and year:
        query["date"] = {"$regex": f"^{year}-{str(month).zfill(2)}"}
    if current_user["role"] == "client":
        client_id = current_user.get("client_id")
        if not client_id:
            return []
        query["client_id"] = client_id
    return await db.calendar_events.find(query, {"_id": 0}).sort("date", 1).to_list(1000)

@api_router.post("/calendar")
async def create_calendar_event(data: CalendarEventCreate, current_user: dict = Depends(require_staff)):
    event = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.calendar_events.insert_one(event)
    event.pop("_id", None)
    return event

@api_router.put("/calendar/{event_id}")
async def update_calendar_event(event_id: str, data: CalendarEventCreate, current_user: dict = Depends(require_staff)):
    result = await db.calendar_events.update_one({"id": event_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return await db.calendar_events.find_one({"id": event_id}, {"_id": 0})

@api_router.delete("/calendar/{event_id}")
async def delete_calendar_event(event_id: str, current_user: dict = Depends(require_staff)):
    result = await db.calendar_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ── Ads Campaigns ─────────────────────────────────────────────────
@api_router.get("/ads")
async def get_ads(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["owner", "employee"]:
        return await db.ads_campaigns.find({}, {"_id": 0}).to_list(500)
    client_id = current_user.get("client_id")
    if not client_id:
        return []
    return await db.ads_campaigns.find({"client_id": client_id}, {"_id": 0}).to_list(500)

@api_router.post("/ads")
async def create_ads_campaign(data: AdsCampaignCreate, current_user: dict = Depends(require_owner)):
    campaign = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.ads_campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return campaign

@api_router.put("/ads/{campaign_id}")
async def update_ads_campaign(campaign_id: str, data: AdsCampaignCreate, current_user: dict = Depends(require_owner)):
    result = await db.ads_campaigns.update_one({"id": campaign_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return await db.ads_campaigns.find_one({"id": campaign_id}, {"_id": 0})

@api_router.delete("/ads/{campaign_id}")
async def delete_ads_campaign(campaign_id: str, current_user: dict = Depends(require_owner)):
    result = await db.ads_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}

# ── KPIs ──────────────────────────────────────────────────────────
@api_router.get("/kpis")
async def get_kpis(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["owner", "employee"]:
        return await db.kpis.find({}, {"_id": 0}).to_list(500)
    client_id = current_user.get("client_id")
    if not client_id:
        return []
    return await db.kpis.find({"client_id": client_id}, {"_id": 0}).to_list(500)

@api_router.post("/kpis")
async def create_kpi(data: KPICreate, current_user: dict = Depends(require_staff)):
    kpi = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.kpis.insert_one(kpi)
    kpi.pop("_id", None)
    return kpi

@api_router.put("/kpis/{kpi_id}")
async def update_kpi(kpi_id: str, data: KPICreate, current_user: dict = Depends(require_staff)):
    result = await db.kpis.update_one({"id": kpi_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="KPI not found")
    return await db.kpis.find_one({"id": kpi_id}, {"_id": 0})

@api_router.delete("/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str, current_user: dict = Depends(require_staff)):
    result = await db.kpis.delete_one({"id": kpi_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="KPI not found")
    return {"message": "KPI deleted"}

# ── Post Reports (monthly delivery tracker) ───────────────────────
@api_router.get("/post-reports")
async def get_post_reports(
    client_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] == "client":
        cid = current_user.get("client_id")
        if not cid:
            return []
        return await db.post_reports.find({"client_id": cid}, {"_id": 0}).to_list(500)
    if current_user["role"] not in ["owner", "employee"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    query = {"client_id": client_id} if client_id else {}
    return await db.post_reports.find(query, {"_id": 0}).to_list(500)

@api_router.put("/post-reports")
async def upsert_post_report(data: PostReportUpsert, current_user: dict = Depends(require_staff)):
    if data.month < 1 or data.month > 12:
        raise HTTPException(status_code=400, detail="Month must be 1-12")
    if data.year < 2000 or data.year > 2100:
        raise HTTPException(status_code=400, detail="Invalid year")
    client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    payload = data.model_dump()
    payload["notes"] = sanitize_input(payload.get("notes") or "")
    payload["video_dates"] = [d for d in (payload.get("video_dates") or []) if d]
    payload["poster_dates"] = [d for d in (payload.get("poster_dates") or []) if d]
    payload["youtube_dates"] = [d for d in (payload.get("youtube_dates") or []) if d]
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    existing = await db.post_reports.find_one(
        {"client_id": data.client_id, "month": data.month, "year": data.year},
        {"_id": 0},
    )
    if existing:
        await db.post_reports.update_one({"id": existing["id"]}, {"$set": payload})
        return await db.post_reports.find_one({"id": existing["id"]}, {"_id": 0})

    report = {
        "id": str(uuid.uuid4()),
        **payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.post_reports.insert_one(report)
    report.pop("_id", None)
    return report

@api_router.delete("/post-reports/{report_id}")
async def delete_post_report(report_id: str, current_user: dict = Depends(require_staff)):
    result = await db.post_reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post report not found")
    return {"message": "Post report deleted"}

# ── Chat ──────────────────────────────────────────────────────────
@api_router.get("/chat")
async def get_chat_messages(
    thread: str = Query("team"),
    client_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if thread == "team":
        if current_user["role"] not in ["owner", "employee"]:
            raise HTTPException(status_code=403, detail="Staff only")
        return await db.chat_messages.find({"thread": "team"}, {"_id": 0}).sort("created_at", 1).to_list(200)
    if current_user["role"] == "client":
        cid = current_user.get("client_id")
    else:
        cid = client_id
    if not cid:
        return []
    return await db.chat_messages.find({"thread": "client", "client_id": cid}, {"_id": 0}).sort("created_at", 1).to_list(200)

@api_router.post("/chat")
async def send_chat_message(data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    if data.thread == "team" and current_user["role"] not in ["owner", "employee"]:
        raise HTTPException(status_code=403, detail="Staff only")
    if current_user["role"] == "client":
        data.thread = "client"
        data.client_id = current_user.get("client_id")
        if not data.client_id:
            raise HTTPException(status_code=403, detail="No client profile linked")
    msg = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "sender_role": current_user["role"],
        "thread": data.thread,
        "client_id": data.client_id,
        "message": sanitize_input(data.message),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(msg)
    msg.pop("_id", None)
    return msg

# ── Strategy Hooks ────────────────────────────────────────────────
@api_router.get("/strategy/hooks")
async def get_hooks(current_user: dict = Depends(require_staff)):
    return await db.strategy_hooks.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)

@api_router.post("/strategy/hooks")
async def create_hook(data: StrategyHookCreate, current_user: dict = Depends(require_owner)):
    hook = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.strategy_hooks.insert_one(hook)
    hook.pop("_id", None)
    return hook

@api_router.delete("/strategy/hooks/{hook_id}")
async def delete_hook(hook_id: str, current_user: dict = Depends(require_owner)):
    result = await db.strategy_hooks.delete_one({"id": hook_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hook not found")
    return {"message": "Hook deleted"}

# ── Global Exception Handler ─────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"❌ Unhandled exception on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        f"⚠️  HTTP Exception on {request.method} {request.url.path}: "
        f"Status {exc.status_code} - {exc.detail}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

# ── BhuFix ClockIN (separate product) ─────────────────────────────
from clockin import create_clockin_router, mount_adms_routes

api_router.include_router(
    create_clockin_router(
        db,
        secret_key=SECRET_KEY,
        algorithm=ALGORITHM,
        verify_password=verify_password,
        get_password_hash=get_password_hash,
        create_access_token=create_access_token,
    )
)
mount_adms_routes(app, db)
logger.info("✓ ClockIN module mounted (/api/clockin + /iclock ADMS)")

# ── Include Router & Middleware ───────────────────────────────────
logger.info("Including API router and setting up middleware...")
app.include_router(api_router)

# ── Serve Frontend Static Files ──────────────────────────────────
if FRONTEND_BUILD_DIR.exists():
    logger.info(f"✓ Frontend build directory found at {FRONTEND_BUILD_DIR}")
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static")
    logger.info("✓ Static files mounted at /static")

    # Client reels / logos from CRA public/videos → build/videos
    videos_dir = FRONTEND_BUILD_DIR / "videos"
    if videos_dir.is_dir():
        app.mount("/videos", StaticFiles(directory=str(videos_dir)), name="videos")
        logger.info(f"✓ Video assets mounted at /videos ({videos_dir})")
    else:
        logger.warning(f"⚠️  No videos directory at {videos_dir}")
    
    @app.get("/sitemap.xml")
    async def serve_sitemap():
        """Serve sitemap for SEO"""
        logger.debug("Sitemap.xml requested")
        sitemap_file = FRONTEND_BUILD_DIR / "sitemap.xml"
        if sitemap_file.exists():
            logger.debug("✓ Sitemap found and served")
            return FileResponse(sitemap_file, media_type="application/xml")
        logger.warning("⚠️  Sitemap not found")
        return JSONResponse({"error": "Sitemap not found"}, status_code=404)
    
    @app.get("/robots.txt")
    async def serve_robots():
        """Serve robots.txt for search engines"""
        logger.debug("Robots.txt requested")
        robots_file = FRONTEND_BUILD_DIR / "robots.txt"
        if robots_file.exists():
            logger.debug("✓ Robots.txt found and served")
            return FileResponse(robots_file, media_type="text/plain")
        logger.warning("⚠️  Robots.txt not found")
        return JSONResponse({"error": "Robots not found"}, status_code=404)
    
    @app.get("/")
    async def serve_root():
        """Serve the main page"""
        logger.debug("Root path / requested")
        index_file = FRONTEND_BUILD_DIR / "index.html"
        if index_file.exists():
            logger.debug("✓ Serving index.html")
            return FileResponse(index_file)
        logger.error("❌ Frontend index.html not found")
        return JSONResponse({"error": "Frontend not found"}, status_code=404)
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve build assets when present; otherwise SPA index.html for client routes."""
        if full_path.startswith("api/") or full_path.startswith("iclock"):
            logger.warning(f"API route not found: /{full_path}")
            return JSONResponse({"error": "Not found"}, status_code=404)

        # Prevent path traversal; serve real files from the CRA build (favicon, logos, etc.)
        build_root = FRONTEND_BUILD_DIR.resolve()
        candidate = (FRONTEND_BUILD_DIR / full_path).resolve()
        try:
            candidate.relative_to(build_root)
        except ValueError:
            return JSONResponse({"error": "Not found"}, status_code=404)

        if candidate.is_file():
            logger.debug(f"✓ Serving build asset: /{full_path}")
            return FileResponse(candidate)

        logger.debug(f"SPA route requested: /{full_path}")
        index_file = FRONTEND_BUILD_DIR / "index.html"
        if index_file.exists():
            logger.debug(f"✓ Serving SPA for route: /{full_path}")
            return FileResponse(index_file)
        logger.error(f"❌ Frontend not found for route: /{full_path}")
        return JSONResponse({"error": "Frontend not found"}, status_code=404)
else:
    logger.error(f"❌ Frontend build directory not found at {FRONTEND_BUILD_DIR}")
    logger.warning("⚠️  Running in development mode without frontend build")
    
    @app.get("/")
    async def serve_root():
        logger.info("Root path accessed - returning API info (frontend not built)")
        return JSONResponse({
            "message": "Bhufix API",
            "status": "running",
            "docs": "/api/docs",
            "note": "Frontend build not found - ensure frontend is built"
        })

logger.info("Setting up middleware...")
app.add_middleware(SecurityHeadersMiddleware)
logger.info("✓ Security headers middleware added")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("✓ CORS middleware configured")

app.add_middleware(RequestLoggingMiddleware)
logger.info("✓ Request logging middleware added")

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 80)
    logger.info("🚀 APPLICATION STARTUP")
    logger.info("=" * 80)
    logger.info(f"Application: Bhufix Digital Marketing Agency API v1.0.0")
    logger.info(f"Environment: {os.environ.get('ENV', 'production')}")
    logger.info(f"Frontend Build: {'Present' if FRONTEND_BUILD_DIR.exists() else 'Not Found'}")
    logger.info(f"Email Notifications: {'Enabled' if GMAIL_USER else 'Disabled'}")
    logger.info(f"Database: {os.environ.get('DB_NAME', 'unknown')}")
    logger.info(f"CORS Origins: {os.environ.get('CORS_ORIGINS', '*')}")
    
    # Show deployed URL
    render_external_url = os.environ.get('RENDER_EXTERNAL_URL')
    if render_external_url:
        logger.info(f"📡 Deployed URL: {render_external_url}")
    else:
        logger.info(f"📡 Local development: http://localhost:{os.environ.get('PORT', 8000)}")
    logger.info("=" * 80)
    await normalize_existing_team_roles()
    await seed_owner()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("=" * 80)
    logger.info("🛑 APPLICATION SHUTDOWN")
    logger.info("=" * 80)
    logger.info("Closing MongoDB connection...")
    client.close()
    logger.info("✓ MongoDB connection closed")
    logger.info("=" * 80)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    render_external_url = os.environ.get('RENDER_EXTERNAL_URL')
    
    logger.info("=" * 80)
    logger.info("Starting Uvicorn server...")
    logger.info(f"Port: {port}")
    logger.info(f"Host: 0.0.0.0 (Internal binding)")
    if render_external_url:
        logger.info(f"External URL: {render_external_url}")
    logger.info(f"Log files: {LOG_DIR}")
    logger.info("=" * 80)
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
