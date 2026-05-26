### BE-011 — List Transactions `GET /api/v1/accounts/{id}/transactions`

#### Background
This is the primary data-reading endpoint of the application. It returns a paginated, date-range-filtered list of transactions for a specific account, along with a total count for pagination controls. The account ownership must be verified before returning any data. This story establishes the full Transaction module layer.

#### User Story
As an authenticated user, I want to retrieve a paginated and date-filtered list of transactions for one of my accounts, so that I can review my financial activity for a given period.

#### Tasks
- [ ] Create `app/api/v1/transactions/schemas.py` — define `TransactionCreate`, `TransactionUpdate`, `TransactionRead`, `TransactionPage` (concrete expansion of `Page[TransactionRead]`) matching the OpenAPI spec
- [ ] Create `app/api/v1/transactions/repository.py` — `TransactionRepository.list_by_account(account_id, start_date, end_date, page, size) -> tuple[list[Transaction], int]`; use composite index `ix_transactions_account_date`
- [ ] Create `app/api/v1/transactions/service.py` — `TransactionService.list_transactions(user_id, account_id, start_date, end_date, page, size) -> TransactionPage`:
  - Verify account exists and is owned by `user_id`; raise `AppError(404, "account-not-found")` otherwise
  - Delegate to repository; build and return `TransactionPage`
- [ ] Create `app/api/v1/transactions/router.py` — `GET /api/v1/accounts/{account_id}/transactions` with query params `start_date`, `end_date`, `page` (default 1), `size` (default 20, max 100)
- [ ] Register transaction router in `app/api/v1/router.py`
- [ ] Add `get_transaction_repo` and `get_transaction_service` to `app/dependencies.py`
- [ ] Log `transaction.list.start` and `transaction.list.success` using structlog

#### Testing and Verification

**Unit tests** — mock `TransactionRepository` and `AccountRepository`, test `TransactionService` in isolation:
- `test_list_transactions_raises_404_when_account_not_found` — mock account repo returns `None`; assert `AppError(404, "account-not-found")`
- `test_list_transactions_raises_404_when_account_belongs_to_other_user` — mock account repo returns account with different `owner_id`; assert `AppError(404)`
- `test_list_transactions_calls_repo_with_correct_filters` — assert repo is called with the correct `account_id`, `start_date`, `end_date`, `page`, `size`
- `test_list_transactions_returns_correct_page_structure` — mock repo returns `([txn1, txn2], 10)`; assert service returns `TransactionPage` with `items`, `total=10`, `page`, `size`
- `test_list_transactions_with_no_date_filter_passes_none_to_repo` — assert `start_date` and `end_date` are `None` when not provided

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_get_transactions_returns_200_with_transaction_page` — create account + transactions; assert 200 with correct `items` and `total`
- `test_get_transactions_returns_empty_page_when_no_transactions_exist`
- `test_get_transactions_date_range_filter_returns_only_matching_transactions` — create transactions on three different dates; filter by middle date range; assert only matching transactions returned
- `test_get_transactions_date_range_with_no_matches_returns_empty_items`
- `test_get_transactions_pagination_second_page_returns_correct_items` — create 25 transactions; fetch page 2 with size 20; assert 5 items returned
- `test_get_transactions_returns_404_when_account_belongs_to_other_user`
- `test_get_transactions_returns_401_without_token`

#### Dependencies
- BE-007
- BE-010

#### Open Questions
- None

#### Acceptance Criteria
- `GET /api/v1/accounts/{id}/transactions` returns 200 with `TransactionPage`
- `items` contains transactions for the requested page; `total` reflects the full count matching the filter
- Date-range filter correctly includes/excludes transactions by `date` field
- Account not owned by requesting user → 404 `{"type": "account-not-found"}`
- Default page is 1, default size is 20, maximum size is 100

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- Pagination is offset-based for MVP. The composite index `ix_transactions_account_date` is what makes date-filtered queries fast — verify it is used via `EXPLAIN` if performance is a concern.
