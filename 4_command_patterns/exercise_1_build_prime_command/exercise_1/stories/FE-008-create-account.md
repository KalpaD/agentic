### FE-008 — Create Account

#### Background
Users need to create new financial accounts from the dashboard. This story adds an inline form or modal triggered by a "New Account" button. On success the accounts list is invalidated so the new account appears immediately.

#### User Story
As an authenticated user, I want to create a new financial account from the dashboard, so that I can start tracking transactions for a new area of my finances.

#### Tasks
- [ ] Create `src/schemas/accountSchemas.ts` — `accountCreateSchema` using Zod: `name` string, min 1 char, max 100 chars
- [ ] Create `src/components/accounts/CreateAccountForm.tsx` — form with a single `name` field; uses `react-hook-form` + `zodResolver(accountCreateSchema)`; calls `useCreateAccount` mutation on submit
- [ ] On success: call `queryClient.invalidateQueries(["accounts"])` to refresh the dashboard; close the form/modal; show a success toast
- [ ] On 409 error: show toast "An account with this name already exists"
- [ ] Add a "New Account" button to `DashboardPage.tsx` that toggles the form visible

#### Testing and Verification

**Unit tests** — mock `useCreateAccount`, test with React Testing Library:
- `test_create_account_form_shows_validation_error_for_empty_name`
- `test_create_account_form_shows_validation_error_for_name_exceeding_100_chars`
- `test_create_account_form_calls_mutation_with_correct_payload_on_valid_submit` — mock mutation; assert called with `{ name: "Savings" }`
- `test_create_account_form_shows_error_toast_on_409_conflict` — mock mutation rejects with 409 `ApiError`; assert toast with correct message
- `test_create_account_form_invalidates_accounts_query_on_success`

**Integration tests** — render dashboard page with mocked hooks:
- `test_new_account_button_reveals_create_form`
- `test_create_account_success_closes_form`

#### Dependencies
- FE-007

#### Open Questions
- None

#### Acceptance Criteria
- "New Account" button on dashboard opens the create form
- Submitting a valid name calls `useCreateAccount` and refreshes the accounts list on success
- Duplicate name shows a 409 error toast — not a generic error
- Name too long or empty is caught by client-side Zod validation before any network call
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- None
