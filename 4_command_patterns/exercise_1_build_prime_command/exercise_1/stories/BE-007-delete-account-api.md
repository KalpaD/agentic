### BE-007 — Delete Account `DELETE /api/v1/accounts/{account_id}`

#### Background
Users need to delete ledger accounts they no longer need. The database `ON DELETE CASCADE` constraint ensures all child transactions are removed automatically when an account is deleted. Ownership must be verified before deletion to prevent one user from deleting another user's account (IDOR).

#### User Story
As an authenticated user, I want to delete a financial account I own, so that I can remove accounts that are no longer relevant to me.

#### Tasks
- [ ] Implement `AccountRepository.get_by_id(account_id: UUID) -> Account | None`
- [ ] Implement `AccountRepository.delete(account_id: UUID) -> None`
- [ ] Implement `AccountService.delete_account(user_id: str, account_id: UUID) -> None`:
  - Fetch account by ID; if not found → `AppError(404, "account-not-found")`
  - If `account.owner_id != user_id` → `AppError(404, "account-not-found")` (do not reveal existence to wrong owner)
  - Call `repo.delete(account_id)`
- [ ] Add `DELETE /api/v1/accounts/{account_id}` route returning 204 No Content
- [ ] Log `account.delete.start` and `account.delete.success` using structlog

#### Testing and Verification

**Unit tests** — mock `AccountRepository`, test `AccountService` logic in isolation:
- `test_delete_account_calls_repo_delete_for_correct_owner` — mock `repo.get_by_id` returns account with matching `owner_id`; assert `repo.delete` is called with the correct `account_id`
- `test_delete_account_raises_404_when_account_not_found` — mock `repo.get_by_id` returns `None`; assert `AppError` raised with `type="account-not-found"` and status 404
- `test_delete_account_raises_404_when_account_belongs_to_different_owner` — mock `repo.get_by_id` returns account with different `owner_id`; assert `AppError(404, "account-not-found")` raised (not 403)

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_delete_account_returns_204_no_content` — create account, then DELETE it; assert 204
- `test_delete_account_cascades_transactions` — create account with transactions, delete account; assert transactions no longer exist in DB
- `test_delete_account_returns_404_for_nonexistent_account_id`
- `test_delete_account_returns_404_when_account_belongs_to_other_user` — create account under user A, attempt DELETE as user B; assert 404
- `test_delete_account_returns_401_without_token`

#### Dependencies
- BE-006

#### Open Questions
- None

#### Acceptance Criteria
- `DELETE /api/v1/accounts/{id}` by the owning user → 204 No Content
- All transactions under the deleted account are removed (DB cascade)
- Non-existent account ID → 404 `{"type": "account-not-found"}`
- Attempting to delete another user's account → 404 (not 403, to avoid information leakage)

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- Returning 404 instead of 403 for a wrong-owner deletion is intentional — it prevents an attacker from enumerating which account IDs exist in the system.
