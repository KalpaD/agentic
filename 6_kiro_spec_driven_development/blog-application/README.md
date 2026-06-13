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

---

*This README is updated after each completed task.*
