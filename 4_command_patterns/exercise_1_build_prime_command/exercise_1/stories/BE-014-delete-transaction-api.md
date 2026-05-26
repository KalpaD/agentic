### BE-014 — Delete Transaction `DELETE /api/v1/accounts/{id}/transactions/{txn_id}`

#### Background
Users need to remove incorrectly recorded or unwanted transactions. Deleting a transaction will affect the account's computed balance on the next read. Ownership of both the parent account and the transaction must be verified before deletion.

#### User Story
As an authenticated user, I want to delete a transaction from one of my accounts, so that I can remove incorrect or unwanted records.

#### Tasks
- [ ] Implement `TransactionRepository.delete(transaction_id: UUID) -> None`
- [ ] Implement `TransactionService.delete_transaction(user_id: str, account_id: UUID, transaction_id: UUID) -> None`:
  - Verify account exists and `owner_id == user_id`; raise `AppError(404, "account-not-found")` otherwise
  - Fetch transaction by ID; if not found or `transaction.account_id != account_id` → `AppError(404, "transaction-not-found")`
  - Call `repo.delete(transaction_id)`
- [ ] Add `DELETE /api/v1/accounts/{account_id}/transactions/{txn_id}` route returning 204 No Content
- [ ] Log `transaction.delete.start` and `transaction.delete.success` using structlog

#### Testing and Verification

**Unit tests** — mock repositories, test `TransactionService` logic in isolation:
- `test_delete_transaction_calls_repo_delete_for_valid_owner` — mock account and transaction repo return matching records; assert `repo.delete` called with correct `transaction_id`
- `test_delete_transaction_raises_404_when_account_not_found`
- `test_delete_transaction_raises_404_when_account_belongs_to_other_user`
- `test_delete_transaction_raises_404_when_transaction_not_found` — mock transaction repo returns `None`
- `test_delete_transaction_raises_404_when_transaction_belongs_to_different_account` — transaction exists but `account_id` does not match

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_delete_transaction_returns_204_no_content`
- `test_delete_transaction_is_no_longer_returned_in_list` — delete transaction, then GET transactions; assert it is absent
- `test_delete_transaction_affects_account_balance` — delete an INCOME transaction; assert balance decreases accordingly in GET accounts response
- `test_delete_transaction_returns_404_for_nonexistent_transaction_id`
- `test_delete_transaction_returns_404_when_transaction_belongs_to_other_user`
- `test_delete_transaction_returns_401_without_token`

#### Dependencies
- BE-013

#### Open Questions
- None

#### Acceptance Criteria
- `DELETE /api/v1/accounts/{id}/transactions/{txn_id}` by owning user → 204 No Content
- Deleted transaction no longer appears in the list endpoint
- Account balance reflects the deletion on subsequent reads
- Non-existent transaction or wrong owner → 404 `{"type": "transaction-not-found"}`

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- None
