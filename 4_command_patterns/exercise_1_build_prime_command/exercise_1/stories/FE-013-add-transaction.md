### FE-013 — Add Transaction

#### Background
Users need to record new income or expense transactions against an account. This story adds an "Add Transaction" button that opens a modal form. Client-side Zod validation runs before any network call. On success the transaction list and account balance are refreshed.

#### User Story
As an authenticated user, I want to add a new income or expense transaction to one of my accounts, so that I can record my financial activity.

#### Tasks
- [ ] Create `src/schemas/transactionSchemas.ts` — `transactionCreateSchema` with Zod: `type` must be `"INCOME"` or `"EXPENSE"`, `amount` positive number, `description` 1–255 chars, `date` valid ISO date string, `category_id` optional UUID or null
- [ ] Create `src/components/transactions/TransactionFormModal.tsx` — modal with:
  - INCOME/EXPENSE toggle (radio or segmented control)
  - Amount field (numeric input, positive only)
  - Description field (text input, max 255)
  - Date picker (defaults to today)
  - Category dropdown populated from `useGetCategories`; "No category" as the default/null option
- [ ] On valid submit: call `useCreateTransaction(accountId, payload)`
- [ ] On success: `queryClient.invalidateQueries(["transactions", accountId])` and `queryClient.invalidateQueries(["accounts"])`; close modal; show success toast
- [ ] On failure: show error toast using `toUserMessage`
- [ ] Add "Add Transaction" button to `AccountDetailPage.tsx`

#### Testing and Verification

**Unit tests** — mock `useCreateTransaction` and `useGetCategories`, test with React Testing Library:
- `test_transaction_form_shows_validation_error_for_zero_amount`
- `test_transaction_form_shows_validation_error_for_negative_amount`
- `test_transaction_form_shows_validation_error_for_empty_description`
- `test_transaction_form_shows_validation_error_for_description_exceeding_255_chars`
- `test_transaction_form_income_expense_toggle_updates_type_field`
- `test_transaction_form_category_dropdown_renders_user_categories` — mock `useGetCategories` returns categories; assert all appear in dropdown
- `test_transaction_form_calls_createTransaction_mutation_with_correct_payload_on_valid_submit`
- `test_transaction_form_shows_error_toast_on_invalid_category_api_error` — mock mutation rejects with 422 `invalid-category`

**Integration tests** — render full page with mocked hooks:
- `test_add_transaction_button_opens_modal`
- `test_create_transaction_success_closes_modal`
- `test_create_transaction_success_invalidates_transactions_and_accounts_queries`

#### Dependencies
- FE-012

#### Open Questions
- None

#### Acceptance Criteria
- "Add Transaction" button opens the transaction modal
- Valid form submission calls `useCreateTransaction` and refreshes the transaction list and account balance
- Client-side Zod validation catches zero/negative amount and empty description before any API call
- Category dropdown shows the user's categories with a "No category" default
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- Both the transaction list query and the accounts query must be invalidated on success so the balance on the dashboard card also updates immediately.
