### INT-001 — Docker Compose Full Stack

#### Background
Before running Playwright E2E tests, the full application stack must be provably runnable with a single `docker compose up` command. This story wires together the PostgreSQL database, cognito-local, the FastAPI backend, and verifies that the frontend dev server can connect to the backend. It is the integration checkpoint after completing both the backend and frontend phases.

#### User Story
As an engineer, I want to start the entire local development stack with `docker compose up`, so that I can run E2E tests and demo the application end-to-end without manual configuration steps.

#### Tasks
- [ ] Add `backend` service to `docker-compose.yml` — builds from `Dockerfile` in project root; depends on `postgres` and `cognito-local`; sets all required env vars from `.env.local`
- [ ] Create production-ready `Dockerfile` for the FastAPI backend: multi-stage build, non-root user, `uvicorn` as entrypoint
- [ ] Add `migrate` one-off service to `docker-compose.yml` that runs `alembic upgrade head` before the backend starts (use `depends_on` with `condition: service_completed_successfully`)
- [ ] Verify cognito-local is pre-seeded with a User Pool and App Client matching `.env.local` values (use cognito-local's `db.json` config)
- [ ] Document the full local setup in `README.md`: prerequisites, `.env.local` setup, `docker compose up` command, expected URLs
- [ ] Add a `docker-compose.override.yml` for mounting source directories as volumes so hot-reload works without rebuilding the image

#### Testing and Verification

**Integration tests** — run against the live `docker compose up` stack (can be part of a CI pre-E2E step):
- `test_backend_health_endpoint_is_reachable` — `curl http://localhost:8000/health` returns `{"status": "ok"}`
- `test_cognito_local_responds_to_user_pool_describe` — `curl` the cognito-local endpoint; assert 200 response
- `test_database_migrations_applied_successfully` — connect to Postgres and query `information_schema.tables`; assert all three tables exist
- `test_backend_rejects_request_without_auth` — `curl http://localhost:8000/api/v1/accounts` without token; assert 401

#### Dependencies
- BE-014 (all backend stories complete)
- FE-017 (all frontend stories complete)

#### Open Questions
- None

#### Acceptance Criteria
- `docker compose up` starts all services (postgres, cognito-local, migrate, backend) without errors
- `GET http://localhost:8000/health` returns 200
- `GET http://localhost:8000/api/v1/accounts` without a token returns 401
- Frontend dev server (`pnpm dev`) connects to the backend successfully
- All services are documented in `README.md` with their ports and purpose

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- The `migrate` service must complete successfully before the `backend` service starts. Use Docker Compose `depends_on` with health checks to enforce this ordering — do not use `sleep` hacks.
