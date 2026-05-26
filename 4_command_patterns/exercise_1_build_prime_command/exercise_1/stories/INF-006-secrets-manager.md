### INF-006 — Secrets Manager

#### Background
Database credentials must never be stored in code, environment files, or Docker images. AWS Secrets Manager stores the RDS credentials securely, and the ECS task role is granted read-only access so the backend can retrieve them at startup without any manual secret distribution.

#### User Story
As an engineer, I want database credentials stored in AWS Secrets Manager and accessible to ECS tasks via IAM role, so that no secrets ever appear in code, configuration files, or container images.

#### Tasks
- [ ] Implement `infra/modules/secrets/main.tf`:
  - `aws_secretsmanager_secret` for the RDS database URL (connection string)
  - `aws_secretsmanager_secret_version` with the initial placeholder value (actual password set after RDS is provisioned in INF-007)
- [ ] Create an `aws_iam_policy` granting `secretsmanager:GetSecretValue` on this specific secret ARN
- [ ] Output `secret_arn` and `iam_policy_arn` for attachment to the ECS task execution role (INF-008)
- [ ] Document the manual step of updating the secret value with the real RDS password after INF-007 completes

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_secretsmanager_secret`
- `test_terraform_plan_creates_iam_policy_granting_get_secret_value`
- `test_iam_policy_is_scoped_to_specific_secret_arn_not_wildcard`

After `terraform apply` in staging:
- `test_secret_is_accessible_via_iam_role` — assume the ECS task role and call `aws secretsmanager get-secret-value`; assert success
- `test_secret_is_not_accessible_without_role` — call without assuming the role; assert `AccessDeniedException`

#### Dependencies
- INF-002

#### Open Questions
- None

#### Acceptance Criteria
- Secrets Manager secret created for the database connection string
- IAM policy grants `secretsmanager:GetSecretValue` scoped to the specific secret ARN only — no wildcards
- ECS task role (created in INF-008) can retrieve the secret; all other principals cannot
- Secret ARN is output for attachment to the ECS task execution role

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The IAM policy must use the specific secret ARN as the resource, never `"Resource": "*"`. Using a wildcard would grant access to all secrets in the account, which is a critical security misconfiguration.
