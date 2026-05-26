### FE-004 — Login Page

#### Background
Registered and verified users must be able to sign in with their email and password. Amplify calls Cognito and returns a session containing the access, ID, and refresh tokens. Amplify manages token storage automatically. On success the user is redirected to the dashboard.

#### User Story
As a registered user, I want to sign in with my email and password, so that I can access my financial data.

#### Tasks
- [ ] Create `src/schemas/authSchemas.ts` (extend) — add `loginSchema`: email valid, password non-empty
- [ ] Create `src/pages/LoginPage.tsx` — email and password fields; on submit call `signIn({ username: email, password })`
- [ ] On success: navigate to `/dashboard`
- [ ] On failure: show error toast mapped to a user-friendly message (e.g. "Incorrect email or password" for `NotAuthorizedException`, "Please verify your email first" for `UserNotConfirmedException`)
- [ ] Add a "Don't have an account? Register" link to `/register`

#### Testing and Verification

**Unit tests** — mock `signIn` from `aws-amplify/auth`, test with React Testing Library:
- `test_login_form_shows_validation_error_for_empty_email`
- `test_login_form_shows_validation_error_for_invalid_email_format`
- `test_login_form_shows_validation_error_for_empty_password`
- `test_login_form_calls_signIn_with_email_and_password_on_valid_submit` — mock `signIn` resolves; assert called with correct args
- `test_login_form_navigates_to_dashboard_on_signIn_success`
- `test_login_form_shows_incorrect_credentials_toast_on_NotAuthorizedException` — mock `signIn` throws `NotAuthorizedException`
- `test_login_form_shows_verification_required_toast_on_UserNotConfirmedException`

**Integration tests** — render full page with router context:
- `test_login_page_renders_email_password_fields_and_submit_button`
- `test_login_page_submit_button_is_disabled_while_signIn_is_pending`
- `test_login_page_has_link_to_register`

#### Dependencies
- FE-003

#### Open Questions
- None

#### Acceptance Criteria
- Login page is accessible at `/login` and also served at `/` (root redirect)
- Valid credentials call `signIn` and navigate to `/dashboard`
- Incorrect credentials show a user-friendly toast — no raw Cognito error messages exposed
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- Never display raw Cognito exception messages to the user. Map known exception names to friendly strings in `toUserMessage` or a dedicated auth-error mapper.
