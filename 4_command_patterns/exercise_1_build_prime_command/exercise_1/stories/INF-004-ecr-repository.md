### INF-004 — ECR Repository

#### Background
The FastAPI backend Docker image must be stored in a private ECR repository before it can be deployed to ECS Fargate. This story provisions the repository and validates that an image can be pushed and pulled from it.

#### User Story
As an engineer, I want a private ECR repository for the backend Docker image, so that ECS can pull the image securely during deployment.

#### Tasks
- [ ] Implement `infra/modules/compute/ecr.tf` — `aws_ecr_repository` with image tag mutability `IMMUTABLE` and scan on push enabled
- [ ] Add a lifecycle policy to expire untagged images after 7 days and keep only the last 10 tagged images
- [ ] Output `ecr_repository_url` from the module
- [ ] Document the manual first-push process in `infra/README.md`: `aws ecr get-login-password | docker login`, `docker build`, `docker tag`, `docker push`

#### Testing and Verification

**Integration tests** — validate Terraform plan output and post-apply verification:
- `test_terraform_plan_creates_ecr_repository_with_immutable_tags`
- `test_terraform_plan_creates_ecr_lifecycle_policy`

After `terraform apply` in staging:
- `test_docker_image_can_be_pushed_to_ecr` — build the backend Docker image, push with a test tag; assert ECR reports the image as present
- `test_docker_image_can_be_pulled_from_ecr` — pull the image back; assert exit code 0

#### Dependencies
- INF-001

#### Open Questions
- None

#### Acceptance Criteria
- ECR repository created with immutable image tags and scan on push enabled
- Lifecycle policy configured to limit stored images
- Backend Docker image can be successfully pushed and pulled
- Repository URL is output for use by ECS task definition (INF-008)

#### Relative Estimation
- [ ] 1 point

#### Special Notes
- `IMMUTABLE` image tags prevent overwriting a deployed image tag, which is a critical safety property for rolling deployments. The CI/CD pipeline (INF-013) uses the git SHA as the image tag.
