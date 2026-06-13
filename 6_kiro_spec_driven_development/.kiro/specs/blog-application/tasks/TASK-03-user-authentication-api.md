# Task 03 — User Authentication API

## Background

The Auth Service handles credential validation, JWT issuance, token refresh, and logout. It is the security boundary for the entire application — all other API endpoints depend on the JWT middleware produced here.

## User Story

As a visitor, I want to log in with my credentials, so that I can access my personal articles and the authoring tools.

## Tasks

- [ ] Implement `POST /api/auth/login` — validate username/password against `users` table using bcrypt, issue JWT access token (15 min) and refresh token (7 days), set both as `httpOnly` cookies
- [ ] Implement JWT middleware — validate Bearer token or `access_token` cookie, attach `req.userId`, return 401 on invalid/expired token
- [ ] Implement `POST /api/auth/refresh` — validate refresh token hash against `refresh_tokens` table, issue new access token
- [ ] Implement `POST /api/auth/logout` — delete refresh token record from `refresh_tokens`, clear cookies
- [ ] Implement `GET /api/auth/me` — return current user info for session validation on frontend load
- [ ] Return identical error message for wrong username and wrong password (no field enumeration)
- [ ] Hash all refresh tokens with SHA-256 before storing in database
- [ ] Apply JWT middleware as default to all `/api/articles` and `/api/images` routes

## Testing and Verification

### Unit Tests
- `login()` with valid credentials returns access token and refresh token
- `login()` with unknown username returns generic error message
- `login()` with wrong password returns identical generic error message (same message, same HTTP status)
- `login()` with wrong username and wrong password both return byte-identical response bodies (Property 1)
- JWT middleware accepts a freshly issued non-expired token (Property 2)
- JWT middleware rejects an expired token with 401
- JWT middleware rejects a tampered token with 401
- `logout()` removes the refresh token record from the database

### Integration Tests
- `POST /api/auth/login` with seeded test user credentials returns 200 and sets `httpOnly` cookies
- `POST /api/auth/login` with wrong password returns 401 with generic message
- Authenticated `GET /api/auth/me` returns the correct user id and username
- `POST /api/auth/logout` clears cookies and subsequent requests with old token return 401
- `POST /api/auth/refresh` with valid refresh token returns new access token

## Dependencies

### Internal
- TASK-01 (Docker Compose stack)
- TASK-02 (users and refresh_tokens tables)

### External
- `jsonwebtoken` (JWT signing/verification)
- `bcrypt` (password hashing, cost factor 12)

## Open Questions

None

## Acceptance Criteria

1. `POST /api/auth/login` with valid credentials returns 200, sets `httpOnly` access and refresh token cookies
2. `POST /api/auth/login` with invalid credentials returns 401 with a message that does not indicate which field failed
3. The error message body is byte-identical regardless of whether the username or password is wrong
4. JWT middleware blocks unauthenticated requests to protected routes with 401
5. `POST /api/auth/logout` clears both cookies and invalidates the refresh token in the database

## Relative Estimation

5 points

## Special Notes

- Use `SameSite=Strict` and `Secure` flags on cookies in production; `SameSite=Lax` without `Secure` in local dev
- Access token TTL of 15 minutes is intentionally short — the frontend must silently refresh via the refresh token before expiry
- Do not log raw passwords or tokens anywhere in the application
