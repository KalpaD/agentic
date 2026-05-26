### INF-001 — Terraform Project Setup

#### Background
Before any AWS resources can be provisioned, the Terraform project structure must be initialised with the correct module layout, remote state backend, and environment configurations. This story creates the skeleton that all subsequent infrastructure stories build into.

#### User Story
As an engineer, I want a properly structured Terraform project with remote state and environment-specific configurations, so that infrastructure changes can be applied safely and consistently across staging and production.

#### Tasks
- [ ] Create `infra/` directory with the module structure defined in HLD §9: `main.tf`, `variables.tf`, `outputs.tf`, `modules/` (cognito, networking, compute, database, cdn, alb, secrets), `environments/staging/`, `environments/production/`
- [ ] Create an S3 bucket and DynamoDB table for Terraform remote state and state locking (bootstrap step — done manually or via a separate `bootstrap/` Terraform config)
- [ ] Configure Terraform backend in `main.tf` to use the S3 + DynamoDB remote state
- [ ] Define shared variables in `variables.tf`: `aws_region`, `environment`, `app_name`, `vpc_cidr`
- [ ] Create `environments/staging/terraform.tfvars` and `environments/production/terraform.tfvars` with environment-specific values
- [ ] Add `infra/` Terraform formatting and validation to the CI checks (INF-013 dependency noted)
- [ ] Document Terraform usage in `infra/README.md`: how to init, plan, and apply for each environment

#### Testing and Verification

**Integration tests** — run Terraform CLI commands against the project:
- `test_terraform_fmt_check_passes` — `terraform fmt -check -recursive` exits 0 (no formatting errors)
- `test_terraform_validate_passes` — `terraform validate` exits 0
- `test_terraform_init_succeeds_with_remote_backend` — `terraform init` exits 0 using the S3 backend
- `test_terraform_plan_staging_produces_no_errors` — `terraform plan -var-file=environments/staging/terraform.tfvars` exits 0

#### Dependencies
- INT-002 (infrastructure work begins after the application is fully tested locally)

#### Open Questions
- None

#### Acceptance Criteria
- `terraform init` succeeds and connects to the S3 remote backend
- `terraform validate` passes with zero errors
- `terraform fmt -check` passes (all files are correctly formatted)
- Module directory structure matches HLD §9 exactly
- `environments/staging/terraform.tfvars` and `environments/production/terraform.tfvars` exist with documented variables

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The S3 bucket and DynamoDB table for remote state are bootstrapped manually once and are not managed by the main Terraform config (to avoid the chicken-and-egg problem). Document this clearly in `infra/README.md`.
