### BE-005 — List Accounts `GET /api/v1/accounts`

#### Background
This is the first endpoint of the Account module and establishes the full router → service → repository layer structure that all subsequent account and transaction stories will follow. It returns all ledger accounts owned by the authenticated user, with each account's balance computed as `SUM(INCOME) − SUM(EXPENSE)` from its transactions.

#### User Story
As an authenticated user, I want to retrieve all my financial accounts with their computed balances, so that I can see an overview of my finances on the dashboard.

#### Tasks
- [ ] Create `app/api/v1/accounts/schemas.py` — define `AccountCreate` and `AccountRead` Pydantic models matching the OpenAPI spec (BE-003)
- [ ] Create `app/api/v1/accounts/repository.py` — `AccountRepository.list_by_owner(owner_id: str) -> list[Account]` and `AccountRepository.get_balance(account_id: UUID) -> Decimal`
- [ ] Create `app/api/v1/accounts/service.py` — `AccountService.list_accounts(user_id: str) -> list[AccountRead]`; calls repo, attaches computed balance to each account
- [ ] Create `app/api/v1/accounts/router.py` — `GET /api/v1/accounts` with `Depends(get_current_user_id)`; returns `list[AccountRead]`
- [ ] Register account router in `app/api/v1/router.py`
- [ ] Add `get_account_repo` and `get_account_service` dependency factories to `app/dependencies.py`
- [ ] Log `account.list.start` and `account.list.success` with `user_id` using structlog

#### Testing and Verification

**Unit tests** — mock `AccountRepository`, test `AccountService` logic in isolation:
- `test_list_accounts_calls_repo_with_correct_owner_id` — assert `repo.list_by_owner` is called with the `user_id` passed to the service
- `test_list_accounts_returns_empty_list_when_repo_returns_empty` — mock repo returns `[]`; assert service returns `[]`
- `test_list_accounts_maps_repo_result_to_account_read_schema` — mock repo returns a list of `Account` models; assert service returns a list of `AccountRead` with correct fields
- `test_balance_computed_as_income_minus_expense` — mock `repo.get_balance` returns a known `Decimal`; assert the value is correctly attached to the `AccountRead` response

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_get_accounts_returns_200_with_empty_list_for_new_user` — authenticated user with no accounts receives `[]`
- `test_get_accounts_returns_only_accounts_owned_by_requesting_user` — insert accounts for two different `owner_id` values; assert each user only sees their own
- `test_get_accounts_includes_correct_computed_balance` — insert account with known INCOME and EXPENSE transactions; assert balance in response equals `SUM(INCOME) − SUM(EXPENSE)`
- `test_get_accounts_returns_401_without_token`

#### Dependencies
- BE-002
- BE-004

#### Open Questions
- None

#### Acceptance Criteria
- `GET /api/v1/accounts` with valid token returns `200` with `list[AccountRead]`
- New user with no accounts receives `[]` — not a 404
- Balance is correctly computed; a user with no transactions has balance `0`
- A user cannot see accounts belonging to another user
- Response schema matches `AccountRead` from the OpenAPI spec exactly

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- Balance is computed on every read via a single aggregation query — no stored balance column. This is intentional (HLD §4.2) and is fast enough at MVP scale.
