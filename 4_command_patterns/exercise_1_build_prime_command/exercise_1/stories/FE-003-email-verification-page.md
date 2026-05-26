### FE-003 — Email Verification Page

#### Background
After registration, Cognito sends a 6-digit OTP to the user's email. The user must enter this code to confirm their account before they can sign in. This page handles the `confirmSignUp` flow via `@aws-amplify/auth`.

#### User Story
As a newly registered user, I want to enter the verification code sent to my email, so that I can confirm my account and proceed to login.

#### Tasks
- [ ] Create `src/schemas/authSchemas.ts` (extend) — add `verifySchema`: code must be exactly 6 digits
- [ ] Create `src/pages/VerifyEmailPage.tsx` — single code input field; read the email from router navigation state (passed from the register page)
- [ ] On valid submit: call `confirmSignUp({ username: email, confirmationCode: code })`; on success navigate to `/login` with a success toast
- [ ] On failure: show error toast (e.g. "Invalid or expired code")
- [ ] Add a "Resend code" button that calls `resendSignUpCode({ username: email })`

#### Testing and Verification

**Unit tests** — mock `confirmSignUp` and `resendSignUpCode`, test with React Testing Library:
- `test_verify_form_shows_validation_error_for_empty_code`
- `test_verify_form_shows_validation_error_for_non_numeric_code`
- `test_verify_form_shows_validation_error_for_code_less_than_6_digits`
- `test_verify_form_calls_confirmSignUp_with_email_and_code_on_submit` — mock `confirmSignUp` resolves; assert called with correct args
- `test_verify_form_navigates_to_login_on_success`
- `test_verify_form_shows_error_toast_on_confirmSignUp_failure`
- `test_resend_code_button_calls_resendSignUpCode` — mock `resendSignUpCode` resolves; assert called with email

**Integration tests** — render full page with router context:
- `test_verify_page_renders_code_input_and_submit_button`
- `test_resend_code_button_shows_success_toast_on_resend`

#### Dependencies
- FE-002

#### Open Questions
- None

#### Acceptance Criteria
- Verify page is accessible at `/verify`
- Submitting a valid 6-digit code calls `confirmSignUp` and navigates to `/login`
- Non-numeric or wrong-length codes are rejected by client-side validation before any network call
- "Resend code" button triggers `resendSignUpCode`
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The email address is passed from the register page via React Router navigation state, not stored in any persistent state. If the user navigates directly to `/verify` without state, redirect them back to `/register`.
