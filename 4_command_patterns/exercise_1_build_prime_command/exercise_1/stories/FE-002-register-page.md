### FE-002 — Register Page

#### Background
New users must be able to create an account using their email and password. Authentication is fully delegated to AWS Cognito via the `@aws-amplify/auth` SDK. The register page calls `signUp` and, on success, redirects the user to the email verification page. In local development, cognito-local handles the registration flow identically to real Cognito.

#### User Story
As a new user, I want to register with my email address and a password, so that I can create a PFM account and start tracking my finances.

#### Tasks
- [ ] Install `@aws-amplify/auth` and `aws-amplify`
- [ ] Create `src/lib/auth.ts` — `Amplify.configure(...)` using `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_APP_CLIENT_ID` env vars; call this at app startup in `main.tsx`
- [ ] Create `src/schemas/authSchemas.ts` — `registerSchema` using Zod: email must be valid, password min 8 chars with at least one uppercase, one lowercase, and one number
- [ ] Create `src/pages/RegisterPage.tsx` — form with email and password fields using `react-hook-form` + `zodResolver`
- [ ] On valid submit: call `signUp({ username: email, password })` from `aws-amplify/auth`; on success navigate to `/verify` passing the email as state
- [ ] On `signUp` failure: call `logger.error(...)` and show an error toast using shadcn/ui `Toast`

#### Testing and Verification

**Unit tests** — mock `signUp` from `aws-amplify/auth`, test form behaviour in isolation with React Testing Library:
- `test_register_form_shows_validation_error_for_empty_email` — submit form with empty email; assert validation message visible
- `test_register_form_shows_validation_error_for_invalid_email_format` — submit with `"notanemail"`
- `test_register_form_shows_validation_error_for_password_too_short` — submit with 7-char password
- `test_register_form_shows_validation_error_for_password_missing_uppercase`
- `test_register_form_calls_signUp_with_email_and_password_on_valid_submit` — mock `signUp` resolves; assert called with correct args
- `test_register_form_navigates_to_verify_on_signUp_success` — mock `signUp` resolves; assert navigation to `/verify`
- `test_register_form_shows_error_toast_on_signUp_failure` — mock `signUp` throws; assert toast is visible

**Integration tests** — render full page with router context, mock `signUp`:
- `test_register_page_renders_email_password_and_submit_fields`
- `test_register_page_submit_button_is_disabled_while_signUp_is_pending`

#### Dependencies
- FE-001

#### Open Questions
- None

#### Acceptance Criteria
- Register page is accessible at `/register`
- Submitting valid email + password calls `signUp` and navigates to `/verify`
- Client-side Zod validation runs before any network call
- `signUp` failure displays an error toast with a user-friendly message
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- Amplify must be configured before any auth calls are made. Ensure `Amplify.configure()` runs synchronously at module load time in `main.tsx` before `ReactDOM.createRoot`.
