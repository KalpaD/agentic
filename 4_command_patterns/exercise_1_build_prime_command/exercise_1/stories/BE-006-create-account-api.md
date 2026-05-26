### BE-006 — Create Account `POST /api/v1/accounts`

#### Background
Users need to create named ledger accounts. Account names must be unique per user, enforced at both the service layer (for a clean error message) and at the database level (as a safety net). This story extends the Account module established in BE-005.

#### User Story
As an authenticated user, I want to create a new financial account with a unique name, so that I can start recording transactions against it.

#### Tasks
- [ ] Implement `AccountRepository.get_by_name(owner_id: str, name: str) -> Account | None`
- [ ] Implement `AccountRepository.create(owner_id: str, payload: AccountCreate) -> Account`
- [ ] Implement `AccountService.create_account(user_id: str, payload: AccountCreate) -> AccountRead` — call `get_by_name` first; raise `AppError(409, "account-already-exists", "Account already exists", "An account with this name already exists")` if found; otherwise create and return
- [ ] Add `POST /api/v1/accounts` route to `router.py` with status code 201
- [ ] Validate `name` max 100 chars in `AccountCreate` schema (Pydantic `max_length=100`)
- [ ] Log `account.create.start` and `account.create.success` (with `account_id`) using structlog
- [ ] Create test fixture files:
  - `tests/fixtures/accounts/create_account_request.json`
  - `tests/fixtures/accounts/create_account_response.json`

#### Testing and Verification

**Unit tests** — mock `AccountRepository`, test `AccountService` logic in isolation:
- `test_create_account_raises_409_when_name_already_exists` — mock `repo.get_by_name` returns an existing `Account`; assert `AppError` raised with `type="account-already-exists"` and status 409
- `test_create_account_calls_repo_create_when_name_is_unique` — mock `repo.get_by_name` returns `None`; assert `repo.create` is called with the correct `owner_id` and payload
- `test_create_account_returns_account_read_schema` — mock `repo.create` returns an `Account`; assert service returns an `AccountRead` with matching fields

**Integration tests** — real ASGI app + real database via `AsyncClient`, using JSON fixture files:
- `test_post_account_returns_201_with_account_read` — POST with `create_account_request.json`; assert 201 and response matches `create_account_response.json` shape
- `test_post_account_duplicate_name_returns_409` — create account, then POST same name again; assert 409 `{"type": "account-already-exists"}`
- `test_post_account_name_exceeds_100_chars_returns_422`
- `test_post_account_empty_name_returns_422`
- `test_post_account_missing_name_field_returns_422`
- `test_post_account_returns_401_without_token`

#### Dependencies
- BE-005

#### Open Questions
- None

#### Acceptance Criteria
- `POST /api/v1/accounts` with valid body → 201 with `AccountRead`
- Duplicate name for the same user → 409 `{"type": "account-already-exists"}`
- Name exceeding 100 chars → 422
- Missing `name` field → 422
- Two different users can each have an account with the same name (uniqueness is per-user only)

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The uniqueness check at the service layer is intentional — it produces a domain-specific 409 error code rather than a raw database `IntegrityError`. The DB unique constraint is a safety net, not the primary enforcement path.
