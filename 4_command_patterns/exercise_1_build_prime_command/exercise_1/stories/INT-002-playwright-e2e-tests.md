### INT-002 — Playwright E2E Tests

#### Background
End-to-end tests validate the complete user journey through the full application stack — browser, React SPA, FastAPI backend, PostgreSQL, and cognito-local — exactly as a real user would experience it. These tests are the final quality gate before infrastructure work begins.

#### User Story
As an engineer, I want automated Playwright E2E tests that cover the critical user journeys, so that I can confidently ship changes knowing the full application flow works correctly.

#### Tasks
- [ ] Install Playwright and configure `playwright.config.ts`: base URL `http://localhost:5173`, browser `chromium`, screenshot on failure
- [ ] Create `e2e/helpers/auth.ts` — helper to programmatically register, verify (via cognito-local API), and sign in a test user; returns a browser storage state file for reuse
- [ ] Create `e2e/helpers/api.ts` — direct API helper (bypasses UI) to seed and tear down test data between tests
- [ ] Write the following E2E tests using JSON fixture files for input data:

  **Auth flow:**
  - `test_user_can_register_with_email_and_password` — fills register form; submits; lands on verify page
  - `test_user_can_verify_email_with_otp` — uses cognito-local admin API to retrieve OTP; enters code; lands on login
  - `test_user_can_login_and_see_empty_dashboard` — signs in; asserts dashboard loads with empty account list

  **Account flow:**
  - `test_user_can_create_an_account` — clicks "New Account"; fills name; submits; asserts card appears on dashboard
  - `test_user_cannot_create_duplicate_account_name` — create account, try to create same name; assert 409 toast

  **Transaction flow:**
  - `test_user_can_add_income_transaction` — navigates to account; clicks "Add Transaction"; fills INCOME form; submits; asserts row appears
  - `test_user_can_add_expense_transaction` — same for EXPENSE
  - `test_balance_reflects_income_minus_expenses` — add known INCOME and EXPENSE; assert balance on dashboard matches expected value
  - `test_user_can_filter_transactions_by_date_range` — add transactions on different dates; apply filter; assert only matching rows visible
  - `test_user_can_edit_transaction_amount` — edit transaction; change amount; assert updated amount in list
  - `test_user_can_delete_transaction_and_balance_updates` — delete transaction; assert row gone and balance updated

  **Category flow:**
  - `test_user_can_create_a_category_and_assign_to_transaction` — create category; add transaction with that category; assert category name visible in transaction row
  - `test_user_can_delete_category_and_transaction_becomes_uncategorised`

  **Sign out:**
  - `test_user_can_sign_out_and_is_redirected_to_login`
  - `test_signed_out_user_cannot_access_dashboard`

#### Testing and Verification

**E2E tests** — all tests listed in Tasks above are the deliverable. Each test:
- Uses a fresh user account (registered programmatically via helper) to ensure test isolation
- Uses JSON fixture files in `e2e/fixtures/` for input data (transaction amounts, descriptions, account names)
- Asserts visible UI state — not implementation details

#### Dependencies
- INT-001 (full stack must be running)

#### Open Questions
- None

#### Acceptance Criteria
- All Playwright tests pass with `pnpm e2e` against the running Docker Compose stack
- Each test is independent — order of execution does not affect results
- Test failures produce a screenshot saved to `playwright-report/`
- `pnpm e2e` exits 0 in CI

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- Use cognito-local's admin API (`AdminConfirmSignUp`) in the test setup helper to confirm the user without needing to interact with an email inbox. This is the only place where cognito-local's admin API is used — all other auth interactions go through the Amplify SDK as a real user would.
