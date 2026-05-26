### FE-017 — Delete Category

#### Background
Users need to be able to remove categories they no longer want. Because deleting a category silently unlinks it from all existing transactions (setting `category_id` to null on the backend), the confirmation dialog must clearly communicate this consequence.

#### User Story
As an authenticated user, I want to delete a category after being warned that existing transactions will become uncategorised, so that I can remove labels I no longer need.

#### Tasks
- [ ] Add a delete icon button to `CategoryItem.tsx`
- [ ] Create `src/components/categories/DeleteCategoryDialog.tsx` — shadcn/ui `AlertDialog` with the message: "Deleting this category will remove it from all transactions that use it. Those transactions will become uncategorised."; "Cancel" and "Delete" buttons
- [ ] On "Delete" confirm: call `useDeleteCategory(categoryId)`
- [ ] On success: `queryClient.invalidateQueries(["categories"])` and `queryClient.invalidateQueries(["transactions"])` (so any open transaction list refreshes the now-null category); show success toast
- [ ] On failure: show error toast

#### Testing and Verification

**Unit tests** — mock `useDeleteCategory`, test with React Testing Library:
- `test_delete_button_on_category_item_opens_confirmation_dialog`
- `test_confirmation_dialog_displays_warning_about_uncategorised_transactions` — assert warning text visible in dialog
- `test_cancel_button_does_not_call_delete_mutation`
- `test_confirm_button_calls_useDeleteCategory_with_correct_category_id`
- `test_delete_success_invalidates_categories_and_transactions_queries`
- `test_delete_failure_shows_error_toast`

**Integration tests** — render full page with mocked hooks:
- `test_delete_category_removes_item_from_list_after_success`

#### Dependencies
- FE-016

#### Open Questions
- None

#### Acceptance Criteria
- Delete button on each category item opens a dialog warning that transactions will become uncategorised
- Cancelling makes no API call
- Confirming calls `useDeleteCategory` and removes the item from the list on success
- Both the categories and transactions queries are invalidated on success
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The transaction query invalidation is important: if the user has the Account Detail page open in another tab (or navigates there next), the transaction rows should reflect the now-null `category_id` without requiring a manual refresh.
