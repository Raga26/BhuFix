# AGENTS.md

## Cursor Cloud specific instructions

BhuFix is a single FastAPI backend (`backend/`) + a React/CRACO frontend (`frontend/`) backed by MongoDB. Two products share this stack: the marketing site + agency dashboard (routes under `/`, `/dashboard`) and the ClockIN attendance app (routes under `/clockin`).

### Services

| Service | Dir | Dev command | Port | Notes |
|---------|-----|-------------|------|-------|
| MongoDB | n/a | see TLS note below | 27017 | Must be running before the backend starts |
| Backend API (FastAPI/Uvicorn) | `backend/` | `python3 server.py` | 8000 | Reads `backend/.env`; `reload=False` so restart after backend edits |
| Frontend (CRACO dev server) | `frontend/` | `npm start` | 3000 | Talks to backend at `REACT_APP_BACKEND_URL` (defaults to `http://localhost:8000`) |

The `pip`/`npm` dependency installs are handled by the Cursor Cloud update script — do not re-run them unless dependencies changed.

### MongoDB must speak TLS (key non-obvious gotcha)

`backend/server.py` builds its Mongo client with `tlsCAFile=certifi.where()` unconditionally, which forces a TLS handshake. A plain, non-TLS local `mongod` will fail with `SSL handshake failed ... UNEXPECTED_EOF`, and you cannot disable it via the URL (`?tls=false` raises a `ConfigurationError` because `tlsCAFile` is set).

Run `mongod` with TLS using a self-signed cert and connect with `?tlsInsecure=true` (the client skips cert/hostname validation; the server just needs to speak TLS). A self-signed cert lives at `~/mongo-tls/mongo.pem` (cert also copied to `~/mongo-tls/mongo.crt` for the CA file). Start it (in a tmux session so it persists) with:

```
mongod --dbpath ~/mongo-data --bind_ip 127.0.0.1 --port 27017 \
  --tlsMode requireTLS --tlsCertificateKeyFile ~/mongo-tls/mongo.pem \
  --tlsCAFile ~/mongo-tls/mongo.crt --tlsAllowConnectionsWithoutCertificates
```

MongoDB 8 refuses TLS without a `--tlsCAFile`, hence passing the cert as its own CA. If `~/mongo-tls/` is missing, regenerate with `openssl req -newkey rsa:2048 -nodes -keyout ~/mongo-tls/mongo.key -x509 -days 3650 -out ~/mongo-tls/mongo.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"` then `cat ~/mongo-tls/mongo.key ~/mongo-tls/mongo.crt > ~/mongo-tls/mongo.pem`.

### backend/.env (required, gitignored)

The backend crashes on startup if `MONGO_URL` or `DB_NAME` are missing. `.env` is gitignored (`*.env`), so it is not committed. Recreate `backend/.env` with:

```
MONGO_URL=mongodb://127.0.0.1:27017/?tlsInsecure=true
DB_NAME=Bhufix
PORT=8000
ENV=development
SECRET_KEY=dev-secret-key-local-only
ACCESS_TOKEN_EXPIRE_MINUTES=480
OWNER_EMAIL=owner@bhufix.local
OWNER_PASSWORD=Owner@12345
OWNER_NAME=BhuFix Admin
CLOCKIN_FACE_MODE=dev
CORS_ORIGINS=*
```

On startup the backend seeds/updates an owner account from `OWNER_EMAIL`/`OWNER_PASSWORD` — use those to log in at `/login`. Optional integrations (AWS Rekognition face-match, Meta WhatsApp, Gmail SMTP) are disabled/degrade gracefully when their env vars are unset; `CLOCKIN_FACE_MODE=dev` uses a local face-match fallback.

### Lint / test

- Backend lint: `python3 -m flake8 .` and `python3 -m black --check .` from `backend/` (existing code is not black-formatted, so `black --check` reports diffs).
- Backend tests: `backend_test.py` hardcodes a remote `BACKEND_URL`. To run against the local server, override it, e.g. `python3 -c "import backend_test; backend_test.BACKEND_URL='http://localhost:8000/api'; backend_test.BackendTester().run_all_tests()"` from the repo root.
- Frontend: no dedicated lint script; ESLint runs as part of `npm start` / `npm run build` (a clean "Compiled successfully" means lint passed).
