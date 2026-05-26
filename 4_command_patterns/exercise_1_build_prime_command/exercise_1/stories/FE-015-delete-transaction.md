### FE-015 — Delete Transaction

#### Background
Users need to permanently remove transactions. Because this affects the account balance, a confirmation dialog is shown before the deletion is executed. On success the transaction list and account balance are refreshed.

#### User Story
As an authenticated user, I want to delete a transaction after confirming the action, so that I can remove incorrect or unwanted records.

#### Tasks
- [ ] Add a delete (trash) icon button to `TransactionRow.tsx`
- [ ] Create `src/components/transactions/DeleteTransactionDialog.tsx` — shadcn/ui `AlertDialog` asking "Are you sure you want to delete this transaction? This cannot be undone."; "Cancel" and "Delete" buttons
- [ ] On "Delete" confirm: call `useDeleteTransaction(accountId, transactionId)`
- [ ] On success: `queryClient.invalidateQueries(["transactions", accountId])` and `queryClient.invalidateQueries(["accounts"])`; show success toast
- [ ] On failure: show error toast

#### Testing and Verification

**Unit tests** — mock `useDeleteTransaction`, test with React Testing Library:
- `test_delete_button_on_transaction_row_opens_confirmation_dialog`
- `test_cancel_button_in_dialog_does_not_call_delete_mutation`
- `test_confirm_button_calls_useDeleteTransaction_with_correct_ids`
- `test_delete_success_shows_success_toast`
- `test_delete_failure_shows_error_toast`

**Integration tests** — render full page with mocked hooks:
- `test_delete_transaction_removes_row_from_list_after_success` — mock mutation resolves; assert row no longer rendered after query invalidation
- `test_delete_transaction_triggers_accounts_query_invalidation` — assert accounts query invalidated so balance updates on dashboard

#### Dependencies
- FE-014

#### Open Questions
- None

#### Acceptance Criteria
- Delete button on each transaction row opens a confirmation dialog
- Cancelling makes no API call
- Confirming calls `useDeleteTransaction` and removes the row from the list on success
- Account balance on the dashboard reflects the deletion after the accounts query is refetched
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- None
