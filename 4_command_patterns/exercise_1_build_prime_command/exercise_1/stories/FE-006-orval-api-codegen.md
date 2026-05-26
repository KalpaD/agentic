### FE-006 — orval API Codegen

#### Background
The frontend must never contain hand-written API types. All TypeScript types and TanStack Query hooks are generated from the backend's OpenAPI spec (BE-003) using orval. This story configures orval and verifies that the generated output compiles cleanly and exposes the correct hooks for all backend endpoints.

#### User Story
As a frontend engineer, I want all API types and TanStack Query hooks auto-generated from the OpenAPI spec, so that the frontend stays in sync with the backend contract automatically and I never hand-write API types.

#### Tasks
- [ ] Install `orval` as a dev dependency
- [ ] Create `orval.config.ts` at the project root pointing at `../openapi.yaml` (or the FastAPI `/openapi.json` endpoint) with output to `src/api/generated/`
- [ ] Configure orval to generate TanStack Query v5 hooks (`client: "react-query"`)
- [ ] Run `pnpm orval` and commit the generated output under `src/api/generated/`
- [ ] Add `pnpm orval` to the project scripts and document it in the project README
- [ ] Add `src/api/generated/` to `.gitignore` with a note explaining it is regenerated in CI (or keep it committed — decide and document the choice)
- [ ] Install `@tanstack/react-query` and wrap `<App>` with `<QueryClientProvider>` in `main.tsx`

#### Testing and Verification

**Unit tests** — not applicable; this story produces generated code, not hand-written logic.

**Integration tests:**
- `test_orval_generates_hooks_for_all_expected_endpoints` — run `pnpm orval` as a subprocess; assert `src/api/generated/` contains files for accounts, categories, and transactions
- `test_generated_code_compiles_without_typescript_errors` — run `pnpm tsc --noEmit` after generation; assert exit code 0
- `test_generated_hooks_include_useGetAccounts` — assert the generated file exports `useGetAccounts`
- `test_generated_hooks_include_useCreateAccount`, `useDeleteAccount`
- `test_generated_hooks_include_useGetTransactions`, `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction`
- `test_generated_hooks_include_useGetCategories`, `useCreateCategory`, `useDeleteCategory`

#### Dependencies
- FE-001
- BE-003 (OpenAPI spec must exist before orval can run)

#### Open Questions
- None

#### Acceptance Criteria
- `pnpm orval` runs without errors and generates hooks for all endpoints defined in `openapi.yaml`
- `pnpm tsc --noEmit` passes on the generated output
- No API types or hook types exist anywhere in `src/` outside of `src/api/generated/`
- `pnpm lint` passes on generated files (or generated files are excluded from linting with a documented exception)

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- `src/api/generated/` must not be edited manually. Add a `// DO NOT EDIT` header comment (orval can be configured to add this automatically).
- Every time the backend OpenAPI spec changes, `pnpm orval` must be re-run. This will be automated in the CI/CD pipeline (INF-013).
