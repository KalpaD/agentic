### BE-012 — Create Transaction `POST /api/v1/accounts/{id}/transactions`

#### Background
This is the core write operation of the application — recording an INCOME or EXPENSE event against a user's account. The service must validate account ownership, enforce a positive amount, and verify that any supplied category belongs to the same user.

#### User Story
As an authenticated user, I want to record a new income or expense transaction against one of my accounts, so that I can track my financial activity.

#### Tasks
- [ ] Implement `TransactionRepository.create(account_id: UUID, payload: TransactionCreate) -> Transaction`
- [ ] Implement `TransactionService.create_transaction(user_id: str, account_id: UUID, payload: TransactionCreate) -> TransactionRead`:
  - Verify account exists and `owner_id == user_id`; raise `AppError(404, "account-not-found")` otherwise
  - Assert `payload.amount > 0`; raise `AppError(422, "invalid-amount", "Invalid amount", "Amount must be positive")`
  - If `category_id` is provided, verify it exists and `category.owner_id == user_id`; raise `AppError(422, "invalid-category", "Invalid category", "Category does not exist or does not belong to you")`
  - Call `repo.create` and return `TransactionRead`
- [ ] Add `POST /api/v1/accounts/{account_id}/transactions` route with status 201
- [ ] Log `transaction.create.start` and `transaction.create.success` using structlog
- [ ] Create test fixture files:
  - `tests/fixtures/transactions/create_transaction_income_request.json`
  - `tests/fixtures/transactions/create_transaction_expense_request.json`
  - `tests/fixtures/transactions/create_transaction_response.json`

#### Testing and Verification

**Unit tests** — mock repositories, test `TransactionService` logic in isolation:
- `test_create_transaction_raises_404_when_account_not_found`
- `test_create_transaction_raises_404_when_account_belongs_to_other_user`
- `test_create_transaction_raises_422_for_zero_amount` — payload with `amount=0`; assert `AppError(422, "invalid-amount")`
- `test_create_transaction_raises_422_for_negative_amount` — payload with `amount=-50`
- `test_create_transaction_raises_422_for_category_not_owned_by_user` — mock category repo returns category with different `owner_id`
- `test_create_transaction_raises_422_for_nonexistent_category_id`
- `test_create_transaction_succeeds_without_category` — `category_id=None`; assert `repo.create` called, returns `TransactionRead`
- `test_create_transaction_succeeds_with_valid_category`

**Integration tests** — real ASGI app + real database via `AsyncClient`, using JSON fixture files:
- `test_post_transaction_income_returns_201` — POST with `create_transaction_income_request.json`; assert 201
- `test_post_transaction_expense_returns_201` — POST with `create_transaction_expense_request.json`
- `test_post_transaction_zero_amount_returns_422` — assert `{"type": "invalid-amount"}`
- `test_post_transaction_negative_amount_returns_422`
- `test_post_transaction_invalid_category_id_returns_422` — assert `{"type": "invalid-category"}`
- `test_post_transaction_category_from_other_user_returns_422`
- `test_post_transaction_missing_required_fields_returns_422`
- `test_post_transaction_invalid_type_value_returns_422` — type not in `["INCOME", "EXPENSE"]`
- `test_post_transaction_returns_404_for_other_users_account`
- `test_post_transaction_returns_401_without_token`

#### Dependencies
- BE-011

#### Open Questions
- None

#### Acceptance Criteria
- `POST /api/v1/accounts/{id}/transactions` with valid body → 201 with `TransactionRead`
- Amount ≤ 0 → 422 `{"type": "invalid-amount"}`
- Category owned by a different user → 422 `{"type": "invalid-category"}`
- Account not owned by requesting user → 404
- `transaction_date` is the user-supplied date, not server time

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The `date` field is the user-supplied transaction date (which may be in the past), not the server's current timestamp. `created_at` is the server timestamp and is set by the database, not the application.
