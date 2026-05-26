### INF-009 — ALB + ACM Certificate

#### Background
The Application Load Balancer terminates TLS, performs health checks, and routes traffic from CloudFront to the ECS Fargate tasks. An ACM certificate is provisioned for the domain and attached to the HTTPS listener. HTTP (port 80) is redirected to HTTPS.

#### User Story
As an engineer, I want an Application Load Balancer with a valid ACM TLS certificate and health checks configured, so that HTTPS traffic is securely routed to the ECS backend tasks.

#### Tasks
- [ ] Implement `infra/modules/alb/main.tf`:
  - `aws_lb` in the public subnets with the ALB security group from INF-003
  - `aws_lb_target_group` — type `ip`, port 8000, protocol HTTP; health check `GET /health` expecting 200, interval 30s, healthy threshold 2, unhealthy threshold 3
  - `aws_lb_listener` on port 443 (HTTPS) forwarding to the target group; requires ACM certificate
  - `aws_lb_listener` on port 80 redirecting to 443
- [ ] Implement `infra/modules/alb/certificate.tf`:
  - `aws_acm_certificate` for `api.{domain}` using DNS validation
  - `aws_route53_record` for DNS validation (assumes a Route 53 hosted zone exists — document as prerequisite)
  - `aws_acm_certificate_validation` to wait for validation to complete
- [ ] Output `alb_arn`, `alb_dns_name`, `target_group_arn`

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_alb_in_public_subnets`
- `test_terraform_plan_creates_https_listener_on_port_443`
- `test_terraform_plan_creates_http_to_https_redirect_on_port_80`
- `test_terraform_plan_creates_health_check_targeting_health_endpoint`
- `test_terraform_plan_creates_acm_certificate_for_api_domain`

After `terraform apply` in staging:
- `test_alb_health_check_passes_after_ecs_service_deployed` (tested together with INF-010)
- `test_https_request_to_alb_returns_valid_tls_certificate` — `curl --verbose https://api.staging.{domain}/health`; assert cert is valid and response is 200
- `test_http_request_redirects_to_https` — `curl -I http://api.staging.{domain}/health`; assert 301 redirect to HTTPS

#### Dependencies
- INF-003

#### Open Questions
- None

#### Acceptance Criteria
- ALB provisioned in public subnets with the ALB security group
- HTTPS listener on 443 with a valid ACM certificate for the API domain
- HTTP on 80 redirects to HTTPS (no plain HTTP access)
- Health check targets `GET /health` and expects HTTP 200
- Target group ARN output for use by ECS service (INF-010)

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- ACM DNS validation requires a Route 53 hosted zone for the domain. This is a prerequisite that must be created manually before applying this module. Document it in `infra/README.md`.
- ACM certificate validation can take up to 30 minutes on first apply. The `aws_acm_certificate_validation` resource makes Terraform wait for it — do not skip it.
