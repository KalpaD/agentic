### INF-005 — Cognito User Pool + App Client

#### Background
Real AWS Cognito User Pools are needed for the staging and production environments. This story provisions the User Pool with the password policy and email verification settings defined in HLD §4.1, and creates a public App Client for use by the React SPA.

#### User Story
As an engineer, I want AWS Cognito User Pool and App Client provisioned via Terraform, so that real users can register, verify their email, and sign in to the application in staging and production.

#### Tasks
- [ ] Implement `infra/modules/cognito/main.tf`:
  - `aws_cognito_user_pool` with: email as sign-in identifier, email verification required, password policy (min 8 chars, uppercase + lowercase + number), access token 1h, refresh token 30 days
  - `aws_cognito_user_pool_client` — public client (no secret), SRP auth flow enabled
- [ ] Output `user_pool_id`, `user_pool_client_id`, `user_pool_endpoint` from the module
- [ ] Use outputs to populate `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_APP_CLIENT_ID` env vars at build time and `COGNITO_USER_POOL_ID`/`COGNITO_APP_CLIENT_ID` in the ECS task environment

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_cognito_user_pool`
- `test_terraform_plan_configures_email_as_signin_attribute`
- `test_terraform_plan_creates_public_app_client_with_no_secret`
- `test_terraform_plan_sets_access_token_validity_to_1_hour`
- `test_terraform_plan_sets_refresh_token_validity_to_30_days`

After `terraform apply` in staging:
- `test_cognito_user_pool_is_accessible` — call `aws cognito-idp describe-user-pool`; assert response contains the pool details
- `test_user_can_register_and_receive_verification_email` — register a test user via Cognito SDK; assert user state is `UNCONFIRMED`

#### Dependencies
- INF-001

#### Open Questions
- None

#### Acceptance Criteria
- Cognito User Pool provisioned with correct password policy and token expiry settings
- Public App Client created with no client secret
- Email verification enforced — users cannot sign in without verifying
- User Pool ID and App Client ID are output for injection into application environment variables

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The App Client must not have a client secret. React SPAs running in the browser cannot keep a secret confidential; using a secret would be a security vulnerability.
