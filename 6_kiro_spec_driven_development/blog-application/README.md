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
# /api/images still has no handlers (TASK-05); /api/articles is implemented in
# TASK-04 but still 401s without auth via the same middleware.
curl -s -w "GET  /api/articles → %{http_code}\n" -o /dev/null \
  http://localhost:4000/api/articles
curl -s -w "POST /api/images   → %{http_code}\n" -o /dev/null \
  -X POST http://localhost:4000/api/images
# Expected: both → 401
```

---

### ✅ TASK-04 — Article CRUD API

Implements `POST/GET/PATCH/DELETE /api/articles[/...]` — every operation
JWT-gated and owner-scoped via `WHERE id = ? AND user_id = ?` (no read-then-check
TOCTOU). Bodies validated with Zod; `PATCH` runs inside a Postgres
`statement_timeout = 2000` and surfaces SQLSTATE 57014 as a 504. `DELETE`
removes the article's `article_images` rows in the same transaction and logs
storage keys for TASK-05 to clean up in MinIO.

**Run the test suites:**

```bash
# Unit tests (schemas + auth + app health)
docker compose exec api npx vitest run
# Expected: ~32 tests pass

# Integration tests (article CRUD + auth + schema)
docker compose exec api npx vitest run --config vitest.integration.config.ts
# Expected: ~38 tests pass (12 schema + 10 auth + 16 articles)
```

**Manual verification — per sub-task**

All steps assume a fresh alice login cookie. Re-run if you need one:

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' \
  -c /tmp/blog-cookies.txt >/dev/null
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"password123"}' \
  -c /tmp/blog-cookies-bob.txt >/dev/null
```

#### Step 1 — `POST /api/articles` creates a blank article owned by the caller

```bash
curl -s -i -X POST http://localhost:4000/api/articles \
  -b /tmp/blog-cookies.txt | head -1
# Expected: HTTP/1.1 201 Created

curl -s -X POST http://localhost:4000/api/articles \
  -b /tmp/blog-cookies.txt | python3 -m json.tool
# Expected: title="", body={"type":"doc","content":[]}, status="draft", user_id = alice's UUID
```

#### Step 2 — `PATCH /api/articles/:id` persists title + body (round-trip)

```bash
# Grab the most recent article id for alice
ID=$(curl -s "http://localhost:4000/api/articles" -b /tmp/blog-cookies.txt \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['articles'][0]['id'])")

curl -s -X PATCH "http://localhost:4000/api/articles/$ID" \
  -b /tmp/blog-cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"First post","body":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello world"}]}]}}' \
  | python3 -m json.tool

curl -s "http://localhost:4000/api/articles/$ID" -b /tmp/blog-cookies.txt \
  | python3 -m json.tool
# Expected: same title + body returned (Property 8 — save/load round-trip)
```

#### Step 3 — Owner isolation: bob cannot read or write alice's article (Property 9)

```bash
curl -s -w "GET  → %{http_code}\n" -o /dev/null \
  "http://localhost:4000/api/articles/$ID" -b /tmp/blog-cookies-bob.txt
curl -s -w "PATCH → %{http_code}\n" -o /dev/null \
  -X PATCH "http://localhost:4000/api/articles/$ID" \
  -b /tmp/blog-cookies-bob.txt -H "Content-Type: application/json" \
  -d '{"title":"hacked"}'
curl -s -w "DELETE → %{http_code}\n" -o /dev/null \
  -X DELETE "http://localhost:4000/api/articles/$ID" -b /tmp/blog-cookies-bob.txt
# Expected: all three → 404 (existence not disclosed)

# Confirm alice's title was not modified by bob's PATCH attempt
curl -s "http://localhost:4000/api/articles/$ID" -b /tmp/blog-cookies.txt \
  | python3 -c "import sys,json;print('title=',json.load(sys.stdin)['article']['title'])"
# Expected: title= First post
```

#### Step 4 — Title >200 chars → 400 (Zod validation)

```bash
LONG=$(python3 -c "print('x'*201)")
curl -s -w "\nstatus=%{http_code}\n" \
  -X PATCH "http://localhost:4000/api/articles/$ID" \
  -b /tmp/blog-cookies.txt -H "Content-Type: application/json" \
  -d "{\"title\":\"$LONG\"}"
# Expected: status=400 with details.fieldErrors.title containing
#           "Title may not exceed 200 characters"
```

#### Step 5 — `GET /api/articles` returns paginated metadata (Property 14)

```bash
# Create enough articles to spill across pages (25 total for alice)
for i in $(seq 1 25); do
  curl -s -X POST http://localhost:4000/api/articles \
    -b /tmp/blog-cookies.txt >/dev/null
done

curl -s "http://localhost:4000/api/articles?page=1&limit=20" \
  -b /tmp/blog-cookies.txt \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('page=',d['page'],'pages=',d['pages'],'total=',d['total'],'len=',len(d['articles']))"
# Expected: page=1, pages>=2, total>=25, len=20

curl -s "http://localhost:4000/api/articles?page=2&limit=20" \
  -b /tmp/blog-cookies.txt \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('page=',d['page'],'len=',len(d['articles']))"
# Expected: page=2, len = (total - 20)
```

#### Step 6 — List is sorted by `updated_at DESC` (Property 13)

```bash
# Touch one of the older articles by patching it — it should jump to the top.
TARGET=$(curl -s "http://localhost:4000/api/articles?page=2&limit=20" \
         -b /tmp/blog-cookies.txt \
         | python3 -c "import sys,json;print(json.load(sys.stdin)['articles'][-1]['id'])")
curl -s -X PATCH "http://localhost:4000/api/articles/$TARGET" \
  -b /tmp/blog-cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"jumped-to-top"}' >/dev/null

curl -s "http://localhost:4000/api/articles?page=1&limit=20" \
  -b /tmp/blog-cookies.txt \
  | python3 -c "import sys,json;a=json.load(sys.stdin)['articles'][0];print('top title=',a['title'],'id=',a['id'])"
# Expected: top title= jumped-to-top, id= $TARGET
```

#### Step 7 — `DELETE /api/articles/:id` cascades to `article_images` (Property 15)

```bash
NEW=$(curl -s -X POST http://localhost:4000/api/articles \
       -b /tmp/blog-cookies.txt \
       | python3 -c "import sys,json;print(json.load(sys.stdin)['article']['id'])")

ALICE_UID=$(curl -s "http://localhost:4000/api/auth/me" -b /tmp/blog-cookies.txt \
            | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")

# Seed two image rows pointing at the article
docker compose exec -T db psql -U blog -d blog -c \
  "INSERT INTO article_images(article_id,user_id,storage_key,url,size_bytes,mime_type)
   VALUES ('$NEW','$ALICE_UID','k/1.png','http://x/1',100,'image/png'),
          ('$NEW','$ALICE_UID','k/2.png','http://x/2',200,'image/png');"

# Confirm two rows exist
docker compose exec -T db psql -U blog -d blog -tAc \
  "SELECT count(*) FROM article_images WHERE article_id = '$NEW';"
# Expected: 2

# Delete the article — service removes article_images rows in the same tx
curl -s -w "status=%{http_code}\n" -X DELETE \
  "http://localhost:4000/api/articles/$NEW" -b /tmp/blog-cookies.txt
# Expected: {"ok":true}status=200

# Image rows are gone
docker compose exec -T db psql -U blog -d blog -tAc \
  "SELECT count(*) FROM article_images WHERE article_id = '$NEW';"
# Expected: 0

# Article gone — subsequent GET is 404
curl -s -w "GET after DELETE → %{http_code}\n" -o /dev/null \
  "http://localhost:4000/api/articles/$NEW" -b /tmp/blog-cookies.txt
# Expected: 404

# The API logs the storage keys for TASK-05 to clean up later
docker compose logs --tail=20 api | grep "TASK-05 pending"
# Expected: a log line listing ['k/1.png','k/2.png']
```

#### Step 8 — `PATCH` 2-second timeout returns 504 (SQLSTATE 57014 → 504)

The route runs the UPDATE inside a transaction with
`SET LOCAL statement_timeout = 2000`. We exercise the mechanism here using a
forced slow query — proves the same code that the route catches and converts to
504.

```bash
docker compose exec -T db psql -U blog -d blog -c "
BEGIN;
SET LOCAL statement_timeout = 50;
SELECT pg_sleep(0.2);
COMMIT;
" 2>&1 | grep -E "ERROR|statement timeout"
# Expected: ERROR:  canceling statement due to statement timeout
```

#### Step 9 — Concurrent saves by different users do not cross-contaminate (Property 16)

```bash
A=$(curl -s -X POST http://localhost:4000/api/articles -b /tmp/blog-cookies.txt \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['article']['id'])")
B=$(curl -s -X POST http://localhost:4000/api/articles -b /tmp/blog-cookies-bob.txt \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['article']['id'])")

# Fire both PATCHes in parallel (background shell jobs)
curl -s -X PATCH "http://localhost:4000/api/articles/$A" \
  -b /tmp/blog-cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"alice writes"}' >/dev/null &
curl -s -X PATCH "http://localhost:4000/api/articles/$B" \
  -b /tmp/blog-cookies-bob.txt -H "Content-Type: application/json" \
  -d '{"title":"bob writes"}' >/dev/null &
wait

curl -s "http://localhost:4000/api/articles/$A" -b /tmp/blog-cookies.txt \
  | python3 -c "import sys,json;print('alice article title =', json.load(sys.stdin)['article']['title'])"
curl -s "http://localhost:4000/api/articles/$B" -b /tmp/blog-cookies-bob.txt \
  | python3 -c "import sys,json;print('bob article title   =', json.load(sys.stdin)['article']['title'])"
# Expected: alice article title = alice writes
#           bob article title   = bob writes
```

#### Step 10 — All routes still require auth

```bash
for VERB_PATH in "GET /api/articles" "POST /api/articles" \
                 "GET /api/articles/00000000-0000-0000-0000-000000000000" \
                 "PATCH /api/articles/00000000-0000-0000-0000-000000000000" \
                 "DELETE /api/articles/00000000-0000-0000-0000-000000000000"; do
  VERB=${VERB_PATH%% *}
  P=${VERB_PATH#* }
  curl -s -w "$VERB $P → %{http_code}\n" -o /dev/null \
    -X "$VERB" "http://localhost:4000$P"
done
# Expected: every line ends in 401
```

---

### ✅ TASK-05 — Image Upload API

Implements `POST /api/images` — multipart upload, capped at 10 MB by multer
(oversized streams aborted early), MIME-restricted to JPEG/PNG/GIF/WebP, JWT-gated.
Stores objects via AWS SDK v3 in any S3-compatible backend (MinIO locally, real
S3 in production — only `STORAGE_*` env vars change). Returns
`{ url: "<STORAGE_PUBLIC_URL>/<key>" }` on success and records metadata in
`article_images`. S3 timeout (10 s) or any storage error → 502 with no DB row.

Storage keys are `<userId>/<uuid>.<ext>` — never the user-supplied filename, so
there is no path-traversal vector.

**Run the test suites:**

```bash
# Unit tests (validation + service + everything from prior tasks)
docker compose exec api npx vitest run
# Expected: ~51 tests pass

# Integration tests (uploads against the real MinIO container)
docker compose exec api npx vitest run --config vitest.integration.config.ts
# Expected: ~42 tests pass (4 new images + 16 articles + 10 auth + 12 schema)
```

**Manual verification — per sub-task**

Set up the working files once:

```bash
# Fresh alice login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' \
  -c /tmp/blog-cookies.txt >/dev/null

# A real, tiny (67-byte) 1×1 transparent PNG
python3 -c "
import base64; open('/tmp/test.png','wb').write(base64.b64decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/wcAAwAB/epv2gAAAABJRU5ErkJggg=='))"

# 10 MB + 1 byte of zeros (triggers multer's size cap)
python3 -c "open('/tmp/big.bin','wb').write(b'\\x00' * (10*1024*1024 + 1))"

# A plain-text file with the wrong MIME
echo "hello world" > /tmp/text.txt
```

#### Step 1 — `POST /api/images` accepts multipart and returns `{url}`

```bash
curl -s -i -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/test.png" | grep -E "HTTP/|url"
# Expected: HTTP/1.1 200 OK
#           {"url":"http://localhost:9000/blog-images/<alice-uuid>/<uuid>.png"}
```

#### Step 2 — The returned URL is reachable (MinIO serves the object)

```bash
URL=$(curl -s -X POST http://localhost:4000/api/images \
       -b /tmp/blog-cookies.txt -F "file=@/tmp/test.png" \
       | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
echo "url=$URL"

curl -s -w "\nstatus=%{http_code} size=%{size_download}\n" -o /tmp/dl.bin "$URL"
diff /tmp/test.png /tmp/dl.bin && echo "✓ bytes match" || echo "✗ BYTES DIFFER"
# Expected: status=200 size=67, ✓ bytes match
```

#### Step 3 — A row is created in `article_images` on success

```bash
docker compose exec -T db psql -U blog -d blog -c \
  "SELECT user_id, storage_key, mime_type, size_bytes
     FROM article_images
    ORDER BY uploaded_at DESC LIMIT 1;"
# Expected: one row with alice's user_id, a <uuid>/<uuid>.png key,
#           mime_type=image/png, size_bytes=67
```

#### Step 4 — Storage keys never reference the user-supplied filename

```bash
curl -s -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt \
  -F "file=@/tmp/test.png;filename=../../etc/passwd" \
  | python3 -c "import sys,json;print('key path =', json.load(sys.stdin)['url'].split('/blog-images/')[1])"
# Expected: key path = <alice-uuid>/<uuid>.png  (NO "../" or "passwd")
```

#### Step 5 — Oversized uploads → 400 with the size message (Property 11)

```bash
curl -s -w "\nstatus=%{http_code}\n" -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/big.bin;type=image/jpeg"
# Expected: {"error":"File exceeds the 10 MB maximum allowed size"}
#           status=400
```

#### Step 6 — Unsupported MIME types → 400 listing accepted formats (Property 11)

```bash
curl -s -w "\nstatus=%{http_code}\n" -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/text.txt;type=text/plain"
# Expected: {"error":"Unsupported file format. Accepted formats: JPEG, PNG, GIF, WebP"}
#           status=400
```

#### Step 7 — Error cases create no `article_images` rows (Acceptance Criterion 5)

```bash
BEFORE=$(docker compose exec -T db psql -U blog -d blog -tAc \
         "SELECT count(*) FROM article_images;")
curl -s -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/big.bin;type=image/jpeg" >/dev/null
curl -s -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/text.txt;type=text/plain" >/dev/null
AFTER=$(docker compose exec -T db psql -U blog -d blog -tAc \
        "SELECT count(*) FROM article_images;")
echo "before=$BEFORE after=$AFTER"
# Expected: before == after (rejected requests leave the table untouched)
```

#### Step 8 — Storage failure (502 path)

MinIO returning an error is the canonical 502 case. Easiest way to provoke it:
temporarily stop the MinIO container and watch the upload bounce.

```bash
docker compose stop minio
curl -s -w "\nstatus=%{http_code}\n" -X POST http://localhost:4000/api/images \
  -b /tmp/blog-cookies.txt -F "file=@/tmp/test.png"
# Expected: {"error":"Image upload failed"}
#           status=502
docker compose start minio
```

#### Step 9 — `POST /api/images` without a JWT → 401

```bash
curl -s -w "POST /api/images (no auth) → %{http_code}\n" \
  -o /dev/null -X POST http://localhost:4000/api/images \
  -F "file=@/tmp/test.png"
# Expected: 401
```

---

### ✅ TASK-06 — Frontend Authentication UI

Implements `/login` (AuthPage), an `AuthProvider` that restores the session
from the `httpOnly` cookie on app load via `GET /api/auth/me`, a
`ProtectedRoute` that gates `/dashboard` and `/articles/:id/edit`, a `Header`
with a logout button, and a `fetch` wrapper that transparently calls
`POST /api/auth/refresh` once on any 401 from a non-auth endpoint and retries
the original request. JWTs are NOT stored in localStorage — the SPA relies
entirely on the `httpOnly` cookie set by the API. The Vite dev proxy forwards
`/api/*` to the api container so cookies stay first-party on `localhost:3000`.

**Run the test suites:**

```bash
# Frontend unit / integration (React Testing Library, jsdom, mocked fetch)
docker compose exec frontend npx vitest run
# Expected: ~14 tests pass

# Backend tests still green (no API changes in TASK-06)
docker compose exec api npx vitest run
docker compose exec api npx vitest run --config vitest.integration.config.ts
```

**Manual verification — in the browser**

Open the app at **http://localhost:3000** and walk through these steps with
the **DevTools Network and Application → Cookies** panels open so you can see
what's happening on the wire.

#### Step 1 — First visit redirects unauthenticated users to `/login`

1. Clear cookies for `localhost:3000` (DevTools → Application → Cookies → delete `access_token` + `refresh_token`).
2. Navigate to `http://localhost:3000/`.

**Expected:** URL ends at `/login`, the **Sign in** form is rendered, no cookies present.

#### Step 2 — Submitting bad credentials shows a generic error

1. Enter `alice` / `wrong-password`, click **Sign in**.

**Expected:** A red alert appears with **exactly** the text:
`Invalid username or password` (no "username" or "password" field hint). URL
stays at `/login`. In Network, you see `POST /api/auth/login` → 401.

#### Step 3 — Submitting valid credentials lands on `/dashboard`

1. Enter `alice` / `password123`, click **Sign in**.

**Expected:**
- Network shows `POST /api/auth/login` → 200.
- Application → Cookies now lists `access_token` (15 min) and `refresh_token` (7 d),
  both `HttpOnly` and `SameSite=Lax`.
- URL is `/dashboard`.
- The header shows `alice` next to the **Log out** button.
- Network shows a follow-up `GET /api/auth/me` → 200 on entry.

#### Step 4 — Refreshing the page keeps you signed in (Acceptance Criterion 5)

1. While on `/dashboard`, hit ⌘R / F5.

**Expected:** Brief "Loading…" flash, then dashboard again. Network shows a
fresh `GET /api/auth/me` → 200 (session restored from the still-valid cookie).

#### Step 5 — Navigating to `/dashboard` while signed out redirects to `/login`

1. Clear both cookies in DevTools.
2. Manually visit `http://localhost:3000/dashboard`.

**Expected:** URL bounces to `/login`. (Same behavior for `/articles/<any-uuid>/edit`.)

#### Step 6 — Logout clears cookies and returns to `/login`

1. From `/dashboard` (signed in), click **Log out**.

**Expected:**
- Network shows `POST /api/auth/logout` → 200.
- Set-Cookie headers in the response clear both cookies (`Expires=Thu, 01 Jan 1970`).
- URL bounces to `/login`. The dashboard is no longer reachable until you sign in again.

#### Step 7 — `GET /api/auth/me` is the session-restore probe

Confirm the SPA uses this endpoint (and not `localStorage`) to decide whether
you're signed in.

1. Sign in normally.
2. In DevTools → Application → Local Storage and Session Storage, confirm
   **no entries** for `localhost:3000`.
3. In Network, filter to `auth/me` and refresh the page — you should see the
   call fire on every cold load.

#### Step 8 — Transparent token refresh on 401 (advanced)

This is hard to exercise via the UI because the access token TTL is 15 min and
there are no protected SPA-driven endpoints to call yet (those arrive in
TASK-07). You can exercise the underlying mechanism through the Vite proxy:

```bash
# Sign in via the proxy and capture cookies
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}' \
  -c /tmp/proxy-cookies.txt >/dev/null
grep -E "access_token|refresh_token" /tmp/proxy-cookies.txt
# Expected: both cookies set on `localhost`

# /me works
curl -s -b /tmp/proxy-cookies.txt http://localhost:3000/api/auth/me
# Expected: {"user":{"id":"...","username":"alice"}}

# Refresh issues a new access cookie via the proxy
curl -s -i -X POST http://localhost:3000/api/auth/refresh \
  -b /tmp/proxy-cookies.txt | grep -E "HTTP/|access_token"
# Expected: HTTP/1.1 200 OK + new Set-Cookie: access_token=...

# Logout clears cookies via the proxy
curl -s -i -X POST http://localhost:3000/api/auth/logout \
  -b /tmp/proxy-cookies.txt | grep -E "HTTP/|Set-Cookie" | head -5
# Expected: 200 + both cookies cleared (Expires=Thu, 01 Jan 1970)
```

The frontend's `apiFetch` (in `frontend/src/api/client.ts`) wraps every API
call; on any 401 from a non-`/api/auth/*` endpoint it makes the same `POST
/api/auth/refresh` call you just ran by hand and retries the original request.
Unit tests in `frontend/src/api/client.test.ts` cover the interceptor logic
end-to-end with a mocked fetch sequence.

---

*This README is updated after each completed task.*
