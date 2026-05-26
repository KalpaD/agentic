### BE-013 — Update Transaction `PUT /api/v1/accounts/{id}/transactions/{txn_id}`

#### Background
Users need to correct or update transaction details including type, amount, description, date, and category assignment. This is a full-update (PUT) operation — all fields in `TransactionUpdate` are optional so the client can send only changed fields, but the service applies whatever is provided on top of the existing record. Category can be explicitly set to `null` to remove the assignment.

#### User Story
As an authenticated user, I want to update the details of an existing transaction including reassigning or removing its category, so that I can correct mistakes or refine my records.

#### Tasks
- [ ] Implement `TransactionRepository.get_by_id(transaction_id: UUID) -> Transaction | None`
- [ ] Implement `TransactionRepository.update(transaction_id: UUID, payload: TransactionUpdate) -> Transaction`
- [ ] Implement `TransactionService.update_transaction(user_id: str, account_id: UUID, transaction_id: UUID, payload: TransactionUpdate) -> TransactionRead`:
  - Verify account exists and `owner_id == user_id`; raise `AppError(404, "account-not-found")` otherwise
  - Verify transaction exists and `transaction.account_id == account_id`; raise `AppError(404, "transaction-not-found")` otherwise
  - If `payload.amount` is provided, assert `> 0`; raise `AppError(422, "invalid-amount")`
  - If `payload.category_id` is a non-null UUID, verify category belongs to `user_id`; raise `AppError(422, "invalid-category")`
  - Call `repo.update` and return `TransactionRead`
- [ ] Add `PUT /api/v1/accounts/{account_id}/transactions/{txn_id}` route returning 200
- [ ] Log `transaction.update.start` and `transaction.update.success` using structlog
- [ ] Create test fixture files:
  - `tests/fixtures/transactions/update_transaction_request.json`
  - `tests/fixtures/transactions/update_transaction_response.json`

#### Testing and Verification

**Unit tests** — mock repositories, test `TransactionService` logic in isolation:
- `test_update_transaction_raises_404_when_account_not_found`
- `test_update_transaction_raises_404_when_transaction_not_found` — mock transaction repo returns `None`
- `test_update_transaction_raises_404_when_transaction_belongs_to_different_account`
- `test_update_transaction_raises_422_when_updated_amount_is_zero`
- `test_update_transaction_raises_422_when_updated_amount_is_negative`
- `test_update_transaction_raises_422_when_category_belongs_to_other_user`
- `test_update_transaction_allows_category_id_null_to_remove_assignment` — payload with `category_id=None`; assert no category validation performed, `repo.update` called
- `test_update_transaction_calls_repo_update_with_correct_payload`
- `test_update_transaction_returns_transaction_read_schema`

**Integration tests** — real ASGI app + real database via `AsyncClient`, using JSON fixture files:
- `test_put_transaction_returns_200_with_updated_transaction` — PUT with `update_transaction_request.json`; assert response matches updated fields
- `test_put_transaction_updates_category_to_new_valid_id`
- `test_put_transaction_sets_category_to_null` — send `{"category_id": null}`; assert `category_id` is null in response
- `test_put_transaction_zero_amount_returns_422`
- `test_put_transaction_returns_404_for_nonexistent_transaction`
- `test_put_transaction_returns_404_when_transaction_belongs_to_other_user`
- `test_put_transaction_returns_401_without_token`

#### Dependencies
- BE-012

#### Open Questions
- None

#### Acceptance Criteria
- `PUT /api/v1/accounts/{id}/transactions/{txn_id}` with valid body → 200 with updated `TransactionRead`
- Category can be set to `null` to remove the assignment
- Amount update of 0 or negative → 422 `{"type": "invalid-amount"}`
- Transaction not found or belonging to another user → 404

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The `updated_at` timestamp must be refreshed by the database on every update. This should be enforced via a SQLAlchemy `onupdate` setting on the column, not set manually in the application code.
