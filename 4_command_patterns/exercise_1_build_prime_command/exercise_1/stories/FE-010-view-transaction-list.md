### FE-010 — View Transaction List

#### Background
Clicking an account on the dashboard navigates to the Account Detail page, which shows a paginated list of transactions along with INCOME and EXPENSE totals and the computed balance. This story establishes the Account Detail page structure and wires up the `useGetTransactions` hook with default parameters (no date filter, page 1).

#### User Story
As an authenticated user, I want to see a list of my transactions for a specific account including INCOME and EXPENSE totals, so that I can review my financial activity.

#### Tasks
- [ ] Create `src/pages/AccountDetailPage.tsx` — reads `accountId` from URL params; fetches transactions using `useGetTransactions(accountId, { page: 1, size: 20 })`; renders summary totals and transaction list
- [ ] Create `src/components/transactions/TransactionRow.tsx` — displays type icon, description, category (if set), date, and amount (positive green for INCOME, negative red for EXPENSE)
- [ ] Create `src/components/transactions/TransactionSummary.tsx` — shows total INCOME, total EXPENSE, and net balance for the current page/filter
- [ ] Create `src/components/transactions/EmptyTransactionsState.tsx` — empty state when no transactions exist
- [ ] Add account name as page heading (fetch from accounts list or pass via router state)
- [ ] Handle loading skeleton and error state

#### Testing and Verification

**Unit tests** — render components in isolation with mocked props:
- `test_TransactionRow_renders_description_amount_and_date` — render with mock `TransactionRead`
- `test_TransactionRow_renders_income_amount_in_green` — INCOME type; assert green colour class
- `test_TransactionRow_renders_expense_amount_in_red` — EXPENSE type; assert red colour class
- `test_TransactionRow_renders_category_name_when_set`
- `test_TransactionRow_renders_no_category_label_when_category_id_is_null`
- `test_TransactionSummary_calculates_and_renders_totals_correctly` — pass known INCOME + EXPENSE amounts; assert displayed totals match
- `test_EmptyTransactionsState_renders_prompt`

**Integration tests** — render full page with mocked hooks:
- `test_account_detail_page_shows_skeleton_while_transactions_loading`
- `test_account_detail_page_renders_transaction_rows_after_successful_fetch` — mock `useGetTransactions` returns page with 5 transactions; assert 5 rows
- `test_account_detail_page_shows_empty_state_when_no_transactions`
- `test_account_detail_page_shows_error_state_on_api_failure`

#### Dependencies
- FE-009

#### Open Questions
- None

#### Acceptance Criteria
- Navigating to `/accounts/:id` renders the Account Detail page with a transaction list
- INCOME amounts shown in green; EXPENSE amounts shown in red
- INCOME total, EXPENSE total, and net balance are displayed
- Empty state shown when account has no transactions
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- None
