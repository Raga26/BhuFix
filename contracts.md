# Bhufix API Contracts

## Endpoints

### 1. POST /api/contact
**Purpose:** Store contact form submissions
**Request Body:**
```json
{ "name": "string (required)", "email": "string (required, valid email)", "phone": "string (optional)", "service": "string (optional)", "message": "string (required, min 10 chars)" }
```
**Response 200:** `{ "id": "string", "message": "Contact form submitted successfully" }`
**Response 422:** Validation error
**Response 429:** Rate limited

### 2. GET /api/contact
**Purpose:** Retrieve submissions (admin)
**Response 200:** Array of contact submissions

### 3. GET /api/health
**Purpose:** Health check
**Response 200:** `{ "status": "healthy", "timestamp": "..." }`

## Mock Data to Replace
- `ContactSection.jsx`: Remove setTimeout mock, connect to POST /api/contact via axios

## Security
- Rate limiting: 5 submissions per IP per hour
- Input sanitization on all text fields
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- Honeypot field for spam detection

## Frontend Integration
- Use REACT_APP_BACKEND_URL from env
- Handle loading, success, error states in contact form
- Show appropriate toast messages
