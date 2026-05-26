### INF-011 — S3 Bucket for SPA

#### Background
The compiled React SPA is hosted from a private S3 bucket. Direct public access to the bucket is blocked; only CloudFront can read from it via Origin Access Control. This story provisions the bucket and its policy.

#### User Story
As an engineer, I want a private S3 bucket for hosting the compiled SPA, accessible only via CloudFront, so that the frontend is served securely without exposing the bucket directly to the internet.

#### Tasks
- [ ] Implement `infra/modules/cdn/s3.tf`:
  - `aws_s3_bucket` for the SPA
  - `aws_s3_bucket_public_access_block` — block all public access (all four settings `true`)
  - `aws_s3_bucket_versioning` — enabled (allows rollback of SPA deployments)
  - `aws_s3_bucket_policy` — allow `s3:GetObject` only from the CloudFront OAC principal (policy written after CloudFront distribution ARN is known — use a `depends_on` or reference the distribution in INF-012)
- [ ] Output `bucket_id`, `bucket_arn`, `bucket_regional_domain_name`

#### Testing and Verification

**Integration tests** — validate Terraform plan output:
- `test_terraform_plan_creates_s3_bucket`
- `test_terraform_plan_blocks_all_public_access`
- `test_terraform_plan_enables_versioning`

After `terraform apply`:
- `test_direct_public_access_to_bucket_is_denied` — `curl https://{bucket}.s3.amazonaws.com/index.html`; assert 403
- `test_object_can_be_uploaded_to_bucket` — `aws s3 cp index.html s3://{bucket}/`; assert exit code 0

#### Dependencies
- INF-002

#### Open Questions
- None

#### Acceptance Criteria
- S3 bucket created with all public access blocked
- Versioning enabled
- Bucket policy restricts `s3:GetObject` to CloudFront OAC only
- Direct public HTTP access returns 403

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The bucket policy referencing the CloudFront distribution ARN creates a dependency between INF-011 and INF-012. Structure the Terraform to handle this cleanly — either use a two-step apply or reference the CloudFront resource directly in the bucket policy.
