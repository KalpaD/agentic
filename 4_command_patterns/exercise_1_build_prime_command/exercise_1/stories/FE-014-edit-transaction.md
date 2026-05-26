### FE-014 — Edit Transaction

#### Background
Users need to correct transaction details after the fact — for example, fixing the amount, changing the date, or reassigning or removing the category. The edit modal reuses the `TransactionFormModal` component pre-populated with the existing transaction data.

#### User Story
As an authenticated user, I want to edit the details of an existing transaction, so that I can correct mistakes or update records.

#### Tasks
- [ ] Add an edit (pencil) icon button to `TransactionRow.tsx`
- [ ] Extend `TransactionFormModal.tsx` to accept an optional `initialValues` prop of type `TransactionRead`; when provided, pre-populate all form fields and call `useUpdateTransaction` instead of `useCreateTransaction` on submit
- [ ] The category dropdown in edit mode must allow selecting "No category" (which sends `category_id: null`) to remove a previously assigned category
- [ ] On success: `queryClient.invalidateQueries(["transactions", accountId])` and `queryClient.invalidateQueries(["accounts"])`; close modal; show success toast
- [ ] On failure: show error toast using `toUserMessage`

#### Testing and Verification

**Unit tests** — mock `useUpdateTransaction`, test with React Testing Library:
- `test_edit_form_pre_populates_type_field_from_initialValues`
- `test_edit_form_pre_populates_amount_field_from_initialValues`
- `test_edit_form_pre_populates_description_field_from_initialValues`
- `test_edit_form_pre_populates_date_field_from_initialValues`
- `test_edit_form_pre_populates_category_when_category_id_is_set`
- `test_edit_form_shows_no_category_selected_when_category_id_is_null`
- `test_edit_form_calls_useUpdateTransaction_not_useCreateTransaction_on_submit`
- `test_edit_form_allows_setting_category_to_null` — select "No category"; assert mutation called with `category_id: null`
- `test_edit_form_shows_error_toast_on_mutation_failure`

**Integration tests** — render full page with mocked hooks:
- `test_edit_button_on_transaction_row_opens_modal_with_prefilled_data` — assert form fields match the transaction being edited
- `test_update_transaction_success_closes_modal_and_refreshes_list`

#### Dependencies
- FE-013

#### Open Questions
- None

#### Acceptance Criteria
- Edit button on each transaction row opens the form modal pre-populated with the transaction's current values
- Submitting calls `useUpdateTransaction` and refreshes the transaction list and account balance on success
- Category can be changed to "No category" (null) to remove the assignment
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- Reuse `TransactionFormModal` for both create and edit to avoid duplication. The distinction is made via the presence of `initialValues` prop and which mutation hook is called.
