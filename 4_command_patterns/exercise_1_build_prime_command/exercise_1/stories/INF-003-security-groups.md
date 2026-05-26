### INF-003 — Security Groups

#### Background
Least-privilege security groups restrict traffic flow between components. The ALB accepts HTTPS from the internet; ECS accepts HTTP only from the ALB; RDS accepts PostgreSQL only from ECS. No other inbound traffic is permitted.

#### User Story
As an engineer, I want least-privilege security groups for the ALB, ECS tasks, and RDS instance, so that each component only accepts traffic from its authorised source.

#### Tasks
- [ ] Implement `infra/modules/networking/security_groups.tf` (or a separate `infra/modules/networking/` sub-file):
  - `aws_security_group` for ALB: inbound 443 from `0.0.0.0/0`; outbound all (to reach ECS)
  - `aws_security_group` for ECS: inbound 8000 from ALB SG only; outbound all (to reach RDS, Cognito JWKS, Secrets Manager)
  - `aws_security_group` for RDS: inbound 5432 from ECS SG only; no outbound rules needed
- [ ] Output `alb_sg_id`, `ecs_sg_id`, `rds_sg_id` from the networking module for use by compute, ALB, and database modules

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_alb_security_group_with_443_inbound`
- `test_terraform_plan_creates_ecs_security_group_with_8000_inbound_from_alb_sg_only`
- `test_terraform_plan_creates_rds_security_group_with_5432_inbound_from_ecs_sg_only`

After `terraform apply` in staging:
- `test_rds_port_5432_not_reachable_from_internet` — attempt TCP connection from outside VPC; assert connection refused
- `test_ecs_port_8000_not_reachable_from_internet_directly` — assert connection refused when targeting ECS private IP directly

#### Dependencies
- INF-002

#### Open Questions
- None

#### Acceptance Criteria
- ALB SG allows inbound 443 from `0.0.0.0/0`
- ECS SG allows inbound 8000 from ALB SG only; no direct internet inbound
- RDS SG allows inbound 5432 from ECS SG only
- Module outputs the three SG IDs for consumption by other modules

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- Do not use `0.0.0.0/0` as an inbound source for ECS or RDS security groups under any circumstances. All internal traffic must be scoped to the source security group ID, not a CIDR range.
