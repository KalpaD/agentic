### BE-004 — Cognito JWT Auth Middleware

#### Background
Every protected endpoint requires a valid Cognito access token. This story implements the JWT validation dependency that all subsequent endpoint stories will rely on. Rather than calling the real Cognito JWKS endpoint in tests, a locally generated RS256 key pair is used so the full validation logic runs without any network calls.

#### User Story
As a backend engineer, I want a FastAPI dependency that validates Cognito-issued JWTs on every protected endpoint and extracts the user's stable `sub` identifier, so that only authenticated users can access their own data.

#### Tasks
- [ ] Add `python-jose[cryptography]` and `httpx` to dependencies
- [ ] Implement `app/core/auth.py`:
  - `_get_cached_jwks()` — fetch JWKS from Cognito endpoint, cache in memory, refresh only on `kid` mismatch
  - `get_current_user_id(token: str = Depends(oauth2_scheme)) -> str` — validate RS256 signature, expiry, audience; return `claims["sub"]`; raise `AppError(401, "token-invalid", "Unauthorized", "Invalid or expired token")` on any failure
- [ ] Add `AWS_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID` to `app/config.py` and `.env.example`
- [ ] Expose `get_current_user_id` in `app/dependencies.py`
- [ ] Add a test-only protected route `GET /api/v1/me` returning `{"user_id": sub}` (guarded with a feature flag or removed before production)
- [ ] Add `cognito-local` service to `docker-compose.yml` with a pre-configured User Pool and App Client
- [ ] Write a pytest fixture in `tests/conftest.py` that generates a real RS256 key pair, patches the JWKS URL to return the public key, and provides a helper to mint valid test tokens with a given `sub`

#### Testing and Verification

**Unit tests** — call auth functions directly with crafted tokens, no HTTP server, no network:
- `test_get_current_user_id_returns_sub_from_valid_rs256_token` — mint a valid token using the test RS256 key pair; call `get_current_user_id` directly; assert it returns the expected `sub` string
- `test_get_current_user_id_raises_401_on_expired_token` — mint a token with `exp` in the past; assert `AppError` with `type="token-invalid"` is raised
- `test_get_current_user_id_raises_401_on_wrong_algorithm` — mint a HS256-signed token; assert `AppError` raised
- `test_get_current_user_id_raises_401_on_tampered_signature` — take a valid token, corrupt the signature segment; assert `AppError` raised
- `test_jwks_cache_is_not_refetched_on_second_call` — mock the JWKS HTTP call; call `_get_cached_jwks()` twice; assert the mock was invoked exactly once

**Integration tests** — real ASGI app via `AsyncClient`, token validation wired into the app:
- `test_protected_endpoint_without_token_returns_401` — `GET /api/v1/me` with no `Authorization` header
- `test_protected_endpoint_with_malformed_token_returns_401` — `Authorization: Bearer not-a-jwt`
- `test_protected_endpoint_with_expired_token_returns_401`
- `test_protected_endpoint_with_wrong_algorithm_token_returns_401`
- `test_protected_endpoint_with_valid_token_returns_user_id` — valid RS256 token from test fixture; assert response body contains the correct `user_id`

#### Dependencies
- BE-001

#### Open Questions
- None

#### Acceptance Criteria
- `GET /api/v1/me` with no token → 401 `{"type": "token-invalid"}`
- `GET /api/v1/me` with a valid RS256-signed test token → 200 `{"user_id": "<sub>"}`
- JWKS are fetched once and cached; subsequent requests do not re-fetch
- `owner_id` is always sourced from the validated JWT `sub` — never from a request body field
- `uv run mypy app` passes with zero errors

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- The Cognito `sub` extracted here is the only value ever used as `owner_id` in all database queries. It must never be accepted from the request body — this is the primary defence against IDOR attacks.
- In production, JWKS keys are refreshed only on `kid` mismatch (key rotation is rare). Do not add a time-based TTL that causes unnecessary network calls on every request.
