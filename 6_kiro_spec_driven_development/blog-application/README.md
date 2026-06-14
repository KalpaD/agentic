# Blog Application

Medium-like multi-user blog platform — React, Node.js/Express, PostgreSQL, MinIO.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

---

## Quick Start

```bash
cp .env.example .env
make dev
```

---

## Completed Tasks & Verification

### ✅ TASK-01 — Project Scaffold and Local Dev Setup

**Verify:**

```bash
# 1. Start the stack
make dev

# 2. API health check
curl http://localhost:4000/health
# Expected: {"status":"ok"}

# 3. Frontend
open http://localhost:3000
# Expected: React app shell loads

# 4. MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin

# 5. Run unit tests
make test

# 6. Stop everything
make down
```

---

## Service URLs (when running)

| Service      | URL                        |
|--------------|----------------------------|
| Frontend     | http://localhost:3000      |
| API          | http://localhost:4000      |
| API health   | http://localhost:4000/health |
| MinIO S3     | http://localhost:9000      |
| MinIO UI     | http://localhost:9001      |
| PostgreSQL   | localhost:5432             |

## Make Commands

| Command                 | What it does                          |
|-------------------------|---------------------------------------|
| `make dev`              | Start all services with hot-reload    |
| `make test`             | Run unit tests                        |
| `make test-integration` | Run integration tests (needs stack up)|
| `make build`            | Build production images               |
| `make down`             | Stop all containers                   |
| `make logs`             | Tail all service logs                 |
| `make migrate`          | Run pending DB migrations             |
| `make migrate-rollback` | Rollback last migration               |

### ✅ TASK-02 — Database Schema and Migrations

**Verify:**

```bash
# Migrations run automatically on startup — check API logs
docker compose logs api | grep -E "Migrations|migration"
# Expected: "Running database migrations…" then "Migrations complete."

# Check all 4 tables exist
docker compose exec db psql -U blog -d blog -c "\dt"
# Expected: users, refresh_tokens, articles, article_images

# Check the performance index exists
docker compose exec db psql -U blog -d blog -c "\di idx_articles_user_updated"

# Seed test users (only needed once, or after a clean wipe)
make seed

# Check seed users exist
docker compose exec db psql -U blog -d blog -c "SELECT username FROM users;"
# Expected: alice, bob

# Manual migration commands
make migrate           # run pending migrations
make migrate-rollback  # rollback last batch
```

---

### ✅ TASK-03 — User Authentication API

Implements `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`,
`GET /api/auth/me`, and a JWT middleware that pre-gates `/api/articles` and
`/api/images`. Access token TTL 15 min, refresh token TTL 7 days. Refresh tokens
are stored SHA-256-hashed in `refresh_tokens.token_hash` for revocation.

**Run the test suites:**

```bash
# Unit tests (jwt, login, middleware, app) — no DB needed
docker compose exec api npx vitest run
# Expected: ~17 tests pass

# Integration tests (full HTTP flow against blog_test DB)
docker compose exec api npx vitest run --config vitest.integration.config.ts
# Expected: ~22 tests pass (12 schema + 10 auth)
```

**Manual verification — per sub-task**

#### Step 1 — `POST /api/auth/login` issues access + refresh cookies

```bash
# Login with seeded user; capture cookies into a jar
curl -s -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' \
  -c /tmp/blog-cookies.txt | grep -E "HTTP|Set-Cookie"
# Expected: HTTP/1.1 200 OK
#           Set-Cookie: access_token=<JWT>; Max-Age=900;  HttpOnly; SameSite=Lax
#           Set-Cookie: refresh_token=<JWT>; Max-Age=604800; HttpOnly; SameSite=Lax
```

#### Step 2 — JWT middleware accepts a valid token, rejects missing/invalid ones

```bash
# Valid token via cookie jar from step 1 — protected route returns non-401
curl -s -w "status=%{http_code}\n" -o /dev/null \
  -b /tmp/blog-cookies.txt http://localhost:4000/api/auth/me
# Expected: status=200

# No token — protected route returns 401
curl -s -w "status=%{http_code}\n" -o /dev/null http://localhost:4000/api/articles
# Expected: status=401

# Tampered token — 401
curl -s -w "status=%{http_code}\n" -o /dev/null \
  -H "Authorization: Bearer not.a.real.jwt" http://localhost:4000/api/auth/me
# Expected: status=401
```

#### Step 3 — `POST /api/auth/refresh` issues a new access token

```bash
# Use the refresh cookie from step 1 to get a fresh access token
curl -s -i -X POST http://localhost:4000/api/auth/refresh \
  -b /tmp/blog-cookies.txt -c /tmp/blog-cookies.txt | grep -E "HTTP|Set-Cookie"
# Expected: HTTP/1.1 200 OK
#           Set-Cookie: access_token=<new JWT>; Max-Age=900; HttpOnly; SameSite=Lax
```

#### Step 4 — `POST /api/auth/logout` clears cookies and invalidates the refresh row

```bash
# Capture refresh token before logout so we can confirm DB row removal
REFRESH=$(grep refresh_token /tmp/blog-cookies.txt | awk '{print $7}')
# openssl is available on both macOS and Linux; sha256sum is Linux-only.
HASH=$(printf "%s" "$REFRESH" | openssl dgst -sha256 -hex | awk '{print $NF}')

# Row exists before logout
docker compose exec -T db psql -U blog -d blog -tAc \
  "SELECT count(*) FROM refresh_tokens WHERE token_hash = '$HASH';"
# Expected: 1

curl -s -i -X POST http://localhost:4000/api/auth/logout \
  -b /tmp/blog-cookies.txt | grep -E "HTTP|Set-Cookie"
# Expected: HTTP/1.1 200 OK
#           Set-Cookie: access_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
#           Set-Cookie: refresh_token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT

# Row gone after logout
docker compose exec -T db psql -U blog -d blog -tAc \
  "SELECT count(*) FROM refresh_tokens WHERE token_hash = '$HASH';"
# Expected: 0

# Replay refresh with the now-revoked cookie → 401
curl -s -w "status=%{http_code}\n" -o /dev/null \
  -X POST http://localhost:4000/api/auth/refresh \
  -H "Cookie: refresh_token=$REFRESH"
# Expected: status=401
```

#### Step 5 — `GET /api/auth/me` returns the current user

```bash
# Fresh login so we have a clean cookie jar
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}' \
  -c /tmp/blog-cookies.txt >/dev/null

curl -s -b /tmp/blog-cookies.txt http://localhost:4000/api/auth/me
# Expected: {"user":{"id":"<uuid>","username":"bob"}}
```

#### Step 6 — Error message is byte-identical for unknown user vs wrong password (Property 1)

```bash
A=$(curl -s -X POST http://localhost:4000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"ghost","password":"whatever"}')
B=$(curl -s -X POST http://localhost:4000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"alice","password":"wrong-pass"}')
echo "$A"; echo "$B"
[ "$A" = "$B" ] && echo "✓ byte-identical" || echo "✗ DIFFER"
# Expected: both bodies = {"error":"Invalid username or password"}
#           "✓ byte-identical"
```

#### Step 7 — Refresh tokens are stored as SHA-256 hashes (never plaintext)

```bash
# Fresh login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' \
  -c /tmp/blog-cookies.txt >/dev/null

REFRESH=$(grep refresh_token /tmp/blog-cookies.txt | awk '{print $7}')

# The raw refresh JWT must NOT appear in token_hash; the SHA-256 hash MUST.
docker compose exec -T db psql -U blog -d blog -c \
  "SELECT token_hash FROM refresh_tokens ORDER BY created_at DESC LIMIT 1;"
# Expected: a 64-char hex string (SHA-256), not the JWT
```

#### Step 8 — JWT middleware pre-gates `/api/articles` and `/api/images`

```bash
# Neither route has handlers yet (TASK-04 / TASK-05), but the middleware
# already 401s on missing or invalid tokens.
curl -s -w "GET  /api/articles → %{http_code}\n" -o /dev/null \
  http://localhost:4000/api/articles
curl -s -w "POST /api/images   → %{http_code}\n" -o /dev/null \
  -X POST http://localhost:4000/api/images
# Expected: both → 401
```

---

*This README is updated after each completed task.*
