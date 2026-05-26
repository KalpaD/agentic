### INF-013 — GitHub Actions CI/CD Pipeline

#### Background
The CI/CD pipeline automates linting, type checking, testing, Docker image building, Alembic migration, ECS rolling deployment, and SPA publishing on every push to `main`. This is the final infrastructure story and ties all previous stories together into a fully automated delivery pipeline.

#### User Story
As an engineer, I want a GitHub Actions pipeline that automatically tests, builds, and deploys the application on every push to main, so that shipping a change requires only a git push with no manual steps.

#### Tasks
- [ ] Create `.github/workflows/ci.yml` — runs on every PR and push to `main`:
  - **Lint + type check:** `uv run ruff check .`, `uv run mypy app`, `pnpm lint`, `pnpm tsc --noEmit`
  - **Tests:** `uv run pytest --cov=app --cov-fail-under=80`, `pnpm test:run`
  - **orval check:** run `pnpm orval` and assert no file changes (spec drift detection)
- [ ] Create `.github/workflows/deploy.yml` — runs on push to `main` only, after `ci.yml` passes:
  - **Build + push backend image:** `docker build`, tag with `$GITHUB_SHA`, push to ECR
  - **Build + push frontend:** `pnpm build` with production env vars injected; sync `dist/` to S3; create CloudFront invalidation for `/*`
  - **Pre-deploy migration:** register and run a one-off ECS task using the new image and `alembic upgrade head`; wait for task completion; fail pipeline if exit code != 0
  - **ECS deploy:** update ECS service task definition to new image SHA; wait for rolling deployment to stabilise (`aws ecs wait services-stable`)
- [ ] Configure GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or use OIDC role), `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] Configure GitHub environment protection rules: `production` environment requires manual approval before deploy

#### Testing and Verification

**Integration tests** — validate the pipeline configuration and behaviour:
- `test_ci_workflow_lint_step_fails_on_ruff_error` — introduce a lint error on a branch; assert CI lint job fails
- `test_ci_workflow_fails_if_coverage_below_80_percent` — reduce test coverage; assert pytest coverage gate fails
- `test_ci_workflow_fails_if_orval_output_has_drift` — change the OpenAPI spec without re-running orval; assert CI detects uncommitted changes
- `test_deploy_workflow_runs_only_on_main_branch` — assert deploy workflow is not triggered on feature branches
- `test_deploy_workflow_runs_migration_before_ecs_update` — inspect workflow step order in the YAML; assert migration step precedes ECS update step

After a real push to `main`:
- `test_new_image_is_deployed_and_health_endpoint_returns_200` — after deploy completes; `curl https://api.{domain}/health`; assert 200 with new deployment timestamp in logs

#### Dependencies
- INF-010
- INF-012

#### Open Questions
- None

#### Acceptance Criteria
- `ci.yml` runs lint, type check, and tests on every PR; fails fast on any error
- `deploy.yml` runs on push to `main` only; requires `ci.yml` to pass first
- Alembic migration runs as a pre-deploy step before ECS task definition is updated
- Rolling deployment completes with zero downtime (min 50% healthy during deploy)
- S3 sync and CloudFront cache invalidation run after backend deployment
- Pipeline fails and does NOT update ECS if the migration task exits non-zero

#### Relative Estimation
- [ ] 8 points

#### Special Notes
- The Alembic migration running before the ECS update is a critical ordering constraint. Migrations must be backwards-compatible with the currently running version so that a failed deployment (which triggers rollback) does not leave the database in an incompatible state. This is an architectural discipline that must be maintained for every future migration.
- Prefer GitHub OIDC role federation over long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets for the production deployment. Document the OIDC setup in `infra/README.md`.
