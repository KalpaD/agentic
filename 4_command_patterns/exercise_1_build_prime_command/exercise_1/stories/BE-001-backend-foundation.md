### BE-001 — Backend Foundation

#### Background
This is the first story of the project. Before any feature work can begin, the FastAPI application skeleton must exist with all cross-cutting concerns wired: structured logging, error handling, CORS, request-ID injection, and a health endpoint. Every subsequent backend story depends on this foundation being correct and stable.

#### User Story
As an engineer working on the PFM application, I want a runnable FastAPI application with all foundational infrastructure configured, so that I can build feature endpoints on top of a solid, consistent foundation.

#### Tasks
- [ ] Initialise `uv` project with `pyproject.toml` (Python 3.12, all dependencies from CLAUDE.md §2 Backend)
- [ ] Create directory structure as defined in CLAUDE.md §3 (`app/`, `app/api/v1/`, `app/core/`, `app/db/`, `tests/unit/`, `tests/integration/`)
- [ ] Implement `app/main.py` — FastAPI app factory with lifespan hook
- [ ] Implement `app/config.py` — pydantic-settings loading all env vars from `.env`
- [ ] Implement `app/core/exceptions.py` — `AppError` class + RFC 9457 exception handler registered on the app
- [ ] Implement `app/core/middleware.py` — CORS middleware + request-ID UUID injection into every request context and response headers (`X-Request-ID`)
- [ ] Configure structlog (JSON renderer in production, coloured console in local dev)
- [ ] Implement `GET /health` endpoint returning `{"status": "ok"}`
- [ ] Create `tests/conftest.py` with `AsyncClient` fixture
- [ ] Create `.env.example` documenting every required environment variable with descriptions

#### Testing and Verification

**Unit tests** — no database, no HTTP client, test classes and functions in isolation:
- `test_app_error_fields` — instantiating `AppError(422, "invalid-amount", "Invalid amount", "Amount must be positive")` sets `status`, `type`, `title`, and `detail` correctly
- `test_rfc9457_exception_handler_returns_correct_json_response` — call the exception handler function directly with a mock request and an `AppError`; assert the returned `JSONResponse` has shape `{"type", "title", "detail", "status"}` with the correct values
- `test_request_id_middleware_injects_uuid` — call the middleware directly with a mock ASGI scope; assert a valid UUID string is added to the request state and appears in the response headers as `X-Request-ID`

**Integration tests** — real ASGI app via `AsyncClient`, no database needed for this story:
- `test_health_endpoint_returns_200` — `GET /health` returns 200 with body `{"status": "ok"}`
- `test_unhandled_exception_returns_500_rfc9457` — a test route that raises a bare `Exception` returns 500 with RFC 9457 shape and does not leak the stack trace in the response body
- `test_cors_headers_present_for_allowed_origin` — OPTIONS preflight to an allowed origin returns the correct `Access-Control-Allow-Origin` header
- `test_cors_blocks_disallowed_origin` — OPTIONS preflight from a disallowed origin does not return `Access-Control-Allow-Origin`
- `test_every_response_has_request_id_header` — `GET /health` response includes `X-Request-ID` with a valid UUID value

#### Dependencies
- None — this is the root story

#### Open Questions
- None

#### Acceptance Criteria
- `uv run uvicorn app.main:app --reload` starts without errors on port 8000
- `GET /health` returns `{"status": "ok"}` with status 200
- All errors return RFC 9457 shape: `{"type", "title", "detail", "status"}`
- CORS headers are present for configured allowed origins and absent for disallowed ones
- Every response includes `X-Request-ID` with a UUID value
- `uv run ruff check . && uv run mypy app` passes with zero errors
- `uv run pytest` passes with all tests green

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- The request-ID middleware must bind the request ID into the structlog context so every log line emitted during that request includes it automatically. This is critical for log correlation in production.
- `print()` is never used anywhere in the codebase — only `structlog`.
