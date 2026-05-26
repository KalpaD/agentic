### INF-002 — Networking — VPC + Subnets

#### Background
All AWS resources must run inside a VPC with public and private subnets across two Availability Zones for high availability. Public subnets host the ALB; private subnets host ECS Fargate tasks and RDS. Internet access for private subnets is provided by a NAT gateway.

#### User Story
As an engineer, I want a VPC with public and private subnets across two AZs, a NAT gateway, and route tables configured, so that application components can communicate securely with the correct level of internet exposure.

#### Tasks
- [ ] Implement `infra/modules/networking/main.tf`:
  - `aws_vpc` with the CIDR from `variables.tf`
  - 2 public subnets (one per AZ) for ALB
  - 2 private subnets (one per AZ) for ECS and RDS
  - `aws_internet_gateway` attached to the VPC
  - `aws_nat_gateway` in one public subnet (single NAT is acceptable for MVP cost reasons)
  - Route tables: public subnets route `0.0.0.0/0` via IGW; private subnets route `0.0.0.0/0` via NAT
- [ ] Output `vpc_id`, `public_subnet_ids`, `private_subnet_ids` from the module
- [ ] Call the networking module from `infra/main.tf`

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_aws_vpc_resource` — parse `terraform plan -json` output; assert `aws_vpc` resource is planned for creation
- `test_terraform_plan_creates_two_public_subnets`
- `test_terraform_plan_creates_two_private_subnets`
- `test_terraform_plan_creates_nat_gateway_in_public_subnet`
- `test_terraform_plan_creates_correct_route_tables` — assert public and private route tables with correct gateway targets are planned

After `terraform apply` in staging:
- `test_private_subnet_has_internet_access_via_nat` — launch a test instance in a private subnet and verify it can reach the internet (curl example.com)
- `test_public_subnet_resources_are_reachable_from_internet`

#### Dependencies
- INF-001

#### Open Questions
- None

#### Acceptance Criteria
- VPC, 2 public subnets, 2 private subnets, IGW, NAT gateway, and route tables all provisioned
- Private subnets have outbound internet access via NAT (required for ECS to pull images from ECR and reach Cognito JWKS)
- Module outputs `vpc_id`, `public_subnet_ids`, `private_subnet_ids` for use by other modules

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- A single NAT gateway is used for MVP to reduce cost (~$32/month per NAT). For production HA, a NAT per AZ should be used post-MVP. Document this trade-off in `infra/README.md`.
