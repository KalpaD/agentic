### INF-010 — ECS Service + Autoscaling

#### Background
The ECS service manages the desired count of running Fargate tasks, registers them with the ALB target group, and handles rolling deployments. CPU-based autoscaling adjusts capacity between 1 and 4 tasks based on load.

#### User Story
As an engineer, I want an ECS Fargate service registered to the ALB with CPU-based autoscaling, so that the backend automatically scales under load and new deployments are rolled out with zero downtime.

#### Tasks
- [ ] Implement `infra/modules/compute/ecs_service.tf`:
  - `aws_ecs_service` using the task definition from INF-008; launch type Fargate; desired count 1; network configuration using private subnets and ECS SG; load balancer config pointing to ALB target group from INF-009
  - `deployment_circuit_breaker` enabled with rollback on failure
  - `deployment_maximum_percent = 200`, `deployment_minimum_healthy_percent = 50` for rolling deploy
- [ ] Implement `infra/modules/compute/autoscaling.tf`:
  - `aws_appautoscaling_target` for the ECS service; min 1, max 4
  - `aws_appautoscaling_policy` — target tracking on `ECSServiceAverageCPUUtilization`, target 60%

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_ecs_service_with_fargate_launch_type`
- `test_terraform_plan_configures_deployment_circuit_breaker_with_rollback`
- `test_terraform_plan_creates_autoscaling_target_with_min_1_max_4`
- `test_terraform_plan_creates_cpu_target_tracking_policy_at_60_percent`

After `terraform apply` in staging:
- `test_ecs_service_reaches_steady_state` — `aws ecs describe-services`; assert `runningCount == desiredCount == 1` and `status == ACTIVE`
- `test_alb_health_check_marks_task_as_healthy` — `aws elbv2 describe-target-health`; assert target is `healthy`
- `test_health_endpoint_reachable_via_alb` — `curl https://api.staging.{domain}/health`; assert 200

#### Dependencies
- INF-008
- INF-009
- INF-005

#### Open Questions
- None

#### Acceptance Criteria
- ECS service running with at least 1 healthy Fargate task registered to the ALB
- ALB health check marks the task as healthy
- `GET https://api.staging.{domain}/health` returns 200
- Autoscaling policy configured to scale between 1 and 4 tasks at 60% CPU
- Deployment circuit breaker enabled — a failing deployment automatically rolls back

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The deployment circuit breaker (rollback on failure) is critical for production safety. A failed Alembic migration or a crashing container will trigger an automatic rollback to the previous stable task definition instead of taking the service down.
