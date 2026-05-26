### INF-012 — CloudFront Distribution

#### Background
CloudFront serves the compiled SPA from S3 globally with low latency and proxies `/api/*` requests to the ALB. A single CloudFront distribution handles both the frontend and API traffic, so the browser never needs CORS headers — all requests go to the same origin.

#### User Story
As an engineer, I want a CloudFront distribution that serves the SPA from S3 and proxies API calls to the ALB, so that the application is delivered globally with a single origin and no CORS complexity.

#### Tasks
- [ ] Implement `infra/modules/cdn/cloudfront.tf`:
  - `aws_cloudfront_origin_access_control` (OAC) for the S3 bucket origin
  - `aws_cloudfront_distribution` with:
    - S3 origin (OAC) as the default origin for `/*`
    - ALB origin for `/api/*` behaviour (forward all headers, no caching)
    - Default root object `index.html`
    - Custom error response: 403 and 404 from S3 return `index.html` with status 200 (required for React Router client-side routing)
    - HTTPS only (`redirect-to-https`)
    - Price class `PriceClass_100` (US, Europe, Asia) for MVP
  - `aws_acm_certificate` for the frontend domain (must be in `us-east-1` — CloudFront requires it)
- [ ] Output `cloudfront_distribution_domain`, `cloudfront_distribution_id`

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_cloudfront_distribution`
- `test_terraform_plan_sets_https_only_viewer_protocol_policy`
- `test_terraform_plan_creates_api_behaviour_for_api_prefix`
- `test_terraform_plan_creates_custom_error_response_for_spa_routing`
- `test_terraform_plan_creates_oac_for_s3_origin`

After `terraform apply`:
- `test_spa_is_served_from_cloudfront_domain` — `curl https://{cloudfront_domain}/`; assert HTML response with `<div id="root">`
- `test_api_requests_are_proxied_to_alb` — `curl https://{cloudfront_domain}/api/v1/health`; wait for ECS tasks (INF-010) to be running; assert 200
- `test_direct_s3_access_returns_403` — confirm OAC is working; bucket direct access still denied

#### Dependencies
- INF-011

#### Open Questions
- None

#### Acceptance Criteria
- CloudFront distribution serves SPA from S3 via OAC
- `/api/*` requests proxied to the ALB backend
- Client-side React Router routes work — navigating directly to `/dashboard` returns `index.html` with 200
- HTTPS enforced at CloudFront; HTTP redirects to HTTPS
- Distribution domain name output for DNS configuration

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- The ACM certificate for CloudFront **must** be created in the `us-east-1` region regardless of where the rest of the infrastructure lives. This is an AWS constraint. Use a provider alias (`aws.us_east_1`) in Terraform for this resource.
