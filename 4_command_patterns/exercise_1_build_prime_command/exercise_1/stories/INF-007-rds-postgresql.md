### INF-007 — RDS PostgreSQL

#### Background
The application requires a managed PostgreSQL 16 database with Multi-AZ for high availability. The RDS instance runs in the private subnets and is accessible only from ECS tasks via the RDS security group. Database schema is applied by an Alembic migration task (part of the CI/CD pipeline in INF-013) as a pre-deploy step.

#### User Story
As an engineer, I want a Multi-AZ RDS PostgreSQL 16 instance in the private subnets with SSL enforced, so that the application has a durable, highly available data store.

#### Tasks
- [ ] Implement `infra/modules/database/main.tf`:
  - `aws_db_subnet_group` using the private subnet IDs from the networking module
  - `aws_db_parameter_group` for PostgreSQL 16 with `ssl = 1` enforced
  - `aws_db_instance`: engine `postgres`, engine_version `16`, `multi_az = true`, `storage_encrypted = true`, `deletion_protection = true`, instance class `db.t3.small` (staging) / `db.t3.medium` (production)
  - Password sourced from a randomly generated `random_password` resource; stored to Secrets Manager (updates the secret version created in INF-006)
- [ ] Output `db_endpoint`, `db_name`, `db_port`
- [ ] Enable automated backups with 7-day retention

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_rds_instance_with_postgresql_16`
- `test_terraform_plan_sets_multi_az_true`
- `test_terraform_plan_sets_storage_encrypted_true`
- `test_terraform_plan_sets_deletion_protection_true`
- `test_terraform_plan_creates_db_subnet_group_in_private_subnets`

After `terraform apply` in staging:
- `test_rds_instance_is_available` — `aws rds describe-db-instances`; assert status `available`
- `test_database_connection_works_from_private_network` — from an ECS task (or bastion) in the private subnet, connect to RDS via `psql`; assert success
- `test_ssl_is_required_for_rds_connection` — attempt connection without SSL (`sslmode=disable`); assert connection refused

#### Dependencies
- INF-003
- INF-006

#### Open Questions
- None

#### Acceptance Criteria
- RDS PostgreSQL 16 Multi-AZ instance provisioned in private subnets
- Storage encrypted at rest; SSL enforced for connections
- Deletion protection enabled
- Database endpoint output for use by ECS task definition and Alembic migration
- 7-day automated backup retention configured

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- `deletion_protection = true` means the database cannot be deleted via Terraform `destroy` without first disabling it. This is intentional — it prevents accidental data loss. Document the manual disablement process for decommissioning.
