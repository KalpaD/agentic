### INF-008 — ECS Cluster + Task Definition

#### Background
The FastAPI backend runs as a Docker container on ECS Fargate. This story provisions the ECS cluster, the IAM execution role, and the task definition that references the ECR image, injects environment variables, retrieves secrets from Secrets Manager, and configures CloudWatch logging.

#### User Story
As an engineer, I want an ECS Fargate task definition that runs the FastAPI backend container with all required environment variables and secrets injected at runtime, so that the application can be deployed without any secrets in the image or code.

#### Tasks
- [ ] Implement `infra/modules/compute/ecs_cluster.tf` — `aws_ecs_cluster` with Container Insights enabled
- [ ] Implement `infra/modules/compute/iam.tf`:
  - `aws_iam_role` for ECS task execution (trust: `ecs-tasks.amazonaws.com`); attach `AmazonECSTaskExecutionRolePolicy` + the Secrets Manager read policy from INF-006
  - `aws_iam_role` for ECS task (application role — for any future AWS SDK calls from the app)
- [ ] Implement `infra/modules/compute/task_definition.tf` — `aws_ecs_task_definition`:
  - Fargate launch type, CPU 512, memory 1024 (staging)
  - Container: image `{ecr_repository_url}:{image_tag}`, port 8000
  - Environment variables: `AWS_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, `DATABASE_URL` (from Secrets Manager via `secrets` block)
  - Log driver: `awslogs` to CloudWatch log group `/pfm/{environment}/backend`
- [ ] Create `aws_cloudwatch_log_group` for backend logs with 30-day retention
- [ ] Output `ecs_cluster_arn`, `task_definition_arn`, `task_execution_role_arn`

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_ecs_cluster_with_container_insights`
- `test_terraform_plan_creates_task_execution_iam_role`
- `test_terraform_plan_task_definition_references_ecr_image`
- `test_terraform_plan_task_definition_injects_database_url_from_secrets_manager`
- `test_terraform_plan_creates_cloudwatch_log_group_with_30_day_retention`

After `terraform apply` in staging:
- `test_ecs_task_can_start_and_reach_health_endpoint` — register a standalone task using the task definition; wait for it to start; curl `GET /health`; assert 200
- `test_task_logs_appear_in_cloudwatch` — after running the task; assert log events in CloudWatch log group

#### Dependencies
- INF-007

#### Open Questions
- None

#### Acceptance Criteria
- ECS cluster created with Container Insights enabled
- Task definition pulls image from ECR with the correct tag
- `DATABASE_URL` injected from Secrets Manager — never in plaintext in the task definition
- All application logs written to CloudWatch with 30-day retention
- Task execution IAM role follows least privilege

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- The `image_tag` variable defaults to `"latest"` in Terraform but is overridden to the git SHA by the CI/CD pipeline (INF-013) on each deployment. Never deploy `latest` in production.
