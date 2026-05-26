### FE-009 — Delete Account

#### Background
Users need to remove accounts they no longer need. Because deletion also removes all child transactions (via the backend cascade), a confirmation dialog must be shown before the destructive action is executed.

#### User Story
As an authenticated user, I want to delete one of my financial accounts after confirming the action, so that I can remove accounts I no longer need.

#### Tasks
- [ ] Add a delete button (icon) to `AccountCard.tsx`
- [ ] Create `src/components/accounts/DeleteAccountDialog.tsx` — shadcn/ui `AlertDialog` warning the user that all transactions will also be deleted; "Cancel" and "Delete" buttons
- [ ] On "Delete" confirm: call `useDeleteAccount` mutation with the account ID
- [ ] On success: `queryClient.invalidateQueries(["accounts"])`; show success toast; close dialog
- [ ] On failure: show error toast

#### Testing and Verification

**Unit tests** — mock `useDeleteAccount`, test with React Testing Library:
- `test_delete_button_on_account_card_opens_confirmation_dialog`
- `test_confirmation_dialog_cancel_does_not_call_delete_mutation`
- `test_confirmation_dialog_confirm_calls_useDeleteAccount_with_correct_account_id`
- `test_delete_account_shows_success_toast_and_closes_dialog_on_success`
- `test_delete_account_shows_error_toast_on_mutation_failure`

**Integration tests** — render dashboard with mocked hooks:
- `test_delete_account_removes_card_from_list_after_successful_deletion` — mock `useDeleteAccount` resolves; assert card no longer visible after invalidation

#### Dependencies
- FE-008

#### Open Questions
- None

#### Acceptance Criteria
- Delete button on each account card opens a confirmation dialog explaining that transactions will also be deleted
- Cancelling the dialog makes no API call
- Confirming calls `useDeleteAccount` and removes the account card from the dashboard on success
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The confirmation dialog must explicitly mention that all transactions under the account will be permanently deleted. This cannot be undone.
