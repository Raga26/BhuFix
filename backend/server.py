from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from datetime import datetime, timezone
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

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

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
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logger.info("✓ MongoDB client initialized")
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

# ── Request Logging Middleware ───────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log incoming requests and outgoing responses"""
    async def dispatch(self, request: Request, call_next):
        # Log incoming request
        request_id = str(uuid.uuid4())[:8]
        client_ip = request.client.host if request.client else "unknown"
        
        logger.info(
            f"[{request_id}] INCOMING REQUEST | {request.method} {request.url.path} | "
            f"IP: {client_ip} | User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )
        
        # Capture request body for logging (only for non-streaming requests)
        try:
            body = await request.body()
            if body and request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body_log = json.loads(body)
                    # Mask sensitive fields
                    if 'email' in body_log:
                        body_log['email'] = body_log['email'][:3] + "***"
                    if 'password' in body_log:
                        body_log['password'] = "***"
                    logger.debug(f"[{request_id}] Request Body: {body_log}")
                except:
                    logger.debug(f"[{request_id}] Request Body: {body[:100]}...")
        except Exception as e:
            logger.debug(f"[{request_id}] Could not log request body: {e}")
        
        # Record start time
        start_time = time.time()
        
        # Call the endpoint
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logger.info(
                f"[{request_id}] RESPONSE | {request.method} {request.url.path} | "
                f"Status: {response.status_code} | Duration: {process_time:.3f}s"
            )
            
            # Add request ID to response headers for tracing
            response.headers["X-Request-ID"] = request_id
            
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] ERROR | {request.method} {request.url.path} | "
                f"Duration: {process_time:.3f}s | Error: {str(e)}",
                exc_info=True
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

# ── Security Headers Middleware ──────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Smart cache control:
        # - HTML files (index.html): Don't cache - always fetch latest
        # - Static assets (JS, CSS, images with hashes): Cache for 1 year
        # - API routes: Don't cache
        path = str(request.url)
        if "/api/" in path:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        elif path.endswith(".html") or path == "/":
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        elif any(path.endswith(ext) for ext in [".js", ".css", ".woff", ".woff2", ".png", ".jpg", ".svg"]):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            response.headers["Cache-Control"] = "public, max-age=3600"
        
        return response

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
        async with aiosmtplib.SMTP(hostname='smtp.gmail.com', port=587) as smtp:
            logger.debug(f"SMTP connection established, initiating TLS")
            await smtp.starttls()
            
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

# ── Include Router & Middleware ───────────────────────────────────
logger.info("Including API router and setting up middleware...")
app.include_router(api_router)

# ── Serve Frontend Static Files ──────────────────────────────────
if FRONTEND_BUILD_DIR.exists():
    logger.info(f"✓ Frontend build directory found at {FRONTEND_BUILD_DIR}")
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static")
    logger.info("✓ Static files mounted at /static")
    
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
        """Serve SPA - return index.html for all non-API routes"""
        if full_path.startswith("api/"):
            logger.warning(f"API route not found: /{full_path}")
            return JSONResponse({"error": "Not found"}, status_code=404)
        
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
    logger.info("=" * 80)

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
    
    logger.info("=" * 80)
    logger.info("Starting Uvicorn server...")
    logger.info(f"Port: {port}")
    logger.info(f"Host: 0.0.0.0")
    logger.info(f"Log files: {LOG_DIR}")
    logger.info("=" * 80)
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )