# Task 01 — Project Scaffold and Local Dev Setup

## Background

Before any feature work can begin, the full local development environment must be in place. This task establishes the monorepo structure, Docker Compose stack (frontend, API, PostgreSQL, MinIO), and the Makefile developer interface. All subsequent tasks depend on this foundation.

## User Story

As a developer, I want a single command to spin up the entire application stack locally, so that I can develop and test without any external dependencies.

## Tasks

- [ ] Initialise monorepo directory structure: `frontend/`, `api/`, `docker/`, `Makefile`
- [ ] Create `api/` Node.js + Express skeleton with TypeScript config, ESLint, and Prettier
- [ ] Create `frontend/` React + Vite skeleton with TypeScript config, ESLint, and Prettier
- [ ] Write `docker-compose.yml` with services: `frontend`, `api`, `db` (PostgreSQL 16), `minio`, `minio-init`
- [ ] Write `Dockerfile` for `api` (development target with nodemon hot-reload, production target)
- [ ] Write `Dockerfile` for `frontend` (development target with Vite, production target with Nginx)
- [ ] Configure Docker internal networking so `api` reaches `db:5432` and `minio:9000` by service name
- [ ] Seed MinIO `minio-init` one-shot container to create the `blog-images` bucket on first run
- [ ] Create `.env.example` documenting all required environment variables
- [ ] Write `Makefile` with targets: `dev`, `build`, `test`, `test-integration`, `down`, `logs`
- [ ] Verify `make dev` starts all services and health checks pass

## Testing and Verification

### Unit Tests
- None required for this infrastructure task

### Integration Tests
- `make dev` starts all 5 Docker Compose services without error
- `api` container reaches PostgreSQL on `db:5432` and responds to a health endpoint `GET /health` with 200
- `api` container reaches MinIO on `minio:9000` and the `blog-images` bucket exists
- `frontend` dev server is accessible on `localhost:3000`
- `make down` cleanly stops all containers

## Dependencies

### Internal
- None — this is the foundational task

### External
- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 20+ (for local tooling outside Docker)

## Open Questions

None

## Acceptance Criteria

1. Running `make dev` from the repo root starts all services within 60 seconds on a clean machine
2. `GET http://localhost:4000/health` returns `200 OK`
3. `GET http://localhost:3000` serves the React app shell
4. MinIO console is accessible at `http://localhost:9001`
5. `make down` stops all containers cleanly with exit code 0
6. `.env.example` documents every required environment variable with a description

## Relative Estimation

3 points

## Special Notes

- Use named Docker volumes for PostgreSQL data persistence across restarts
- MinIO dev credentials are fixed to `minioadmin / minioadmin` — document this clearly in `.env.example`
- The `minio-init` service should use `depends_on` with a health check on the `minio` service before running
