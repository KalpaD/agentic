### BE-003 — OpenAPI Specification

#### Background
Before implementing any API endpoints, a comprehensive OpenAPI specification must be authored to act as the implementation contract for all backend stories and the code-generation source for the frontend (FE-006 orval). This ensures every engineer has a shared, unambiguous definition of every endpoint's behaviour — happy path, validation errors, authentication errors, and edge cases — with concrete example request and response bodies.

#### User Story
As an engineer working on the PFM application, I want a comprehensive OpenAPI YAML specification covering all endpoints with complete positive, negative, and edge-case examples, so that backend implementation stories have a clear contract to conform to and the frontend can generate typed API clients without ambiguity.

#### Tasks
- [ ] Create `openapi.yaml` in the project root
- [ ] Define the Bearer JWT security scheme
- [ ] Document the `Account` domain: `GET /api/v1/accounts`, `POST /api/v1/accounts`, `DELETE /api/v1/accounts/{account_id}`
- [ ] Document the `Category` domain: `GET /api/v1/categories`, `POST /api/v1/categories`, `DELETE /api/v1/categories/{category_id}`
- [ ] Document the `Transaction` domain: `GET /api/v1/accounts/{id}/transactions`, `POST /api/v1/accounts/{id}/transactions`, `PUT /api/v1/accounts/{id}/transactions/{txn_id}`, `DELETE /api/v1/accounts/{id}/transactions/{txn_id}`
- [ ] For every request body schema document: field descriptions, types, constraints (max length, positive-only amounts, ISO date format, enum values)
- [ ] For every endpoint add named `examples` covering:
  - Positive case: valid request + successful response
  - 401 Unauthorized: missing or invalid Bearer token
  - 404 Not Found: resource does not exist or belongs to another user
  - 409 Conflict: duplicate name (accounts and categories)
  - 422 Unprocessable Entity: each individual validation rule broken (one example per rule — empty name, name too long, zero amount, negative amount, invalid UUID, missing required field)
- [ ] Add edge-case examples: empty list response, pagination at last page, date range that returns zero results, deleting a category that has assigned transactions (transactions remain, `category_id` becomes null)
- [ ] Validate the spec: `npx @redocly/cli lint openapi.yaml` exits 0
- [ ] Configure FastAPI to expose the spec at `/openapi.json` by pointing it to the authored `openapi.yaml` (or verify the auto-generated spec matches completely)

#### Testing and Verification

**Unit tests** — not applicable; this story produces a documentation artifact, not application code.

**Integration tests:**
- `test_openapi_yaml_passes_redocly_lint` — run `redocly lint openapi.yaml` as a subprocess in the test suite; assert exit code 0
- `test_fastapi_openapi_json_matches_authored_spec` — fetch `/openapi.json` from the running test app and assert it matches the content of `openapi.yaml` (field by field for paths and schemas)
- `test_every_endpoint_has_401_response_documented` — parse `openapi.yaml` and assert every path operation under `/api/v1/` includes a `401` response
- `test_every_mutating_endpoint_has_422_response_documented` — assert every `POST` and `PUT` operation includes a `422` response with at least one named example

#### Dependencies
- BE-001
- BE-002

#### Open Questions
- None

#### Acceptance Criteria
- `openapi.yaml` exists in the project root and passes `redocly lint` with zero errors or warnings
- Every endpoint has at minimum: one success example, one 401 example, one 422 example (where applicable), one 404 example (where applicable), one 409 example (where applicable)
- All schema field constraints are documented (max lengths, positive amount, enum values, UUID format, ISO date format)
- The spec is used as the single source of truth for FE-006 orval codegen — no frontend API types are hand-written

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- This spec is the contract between backend and frontend. Any deviation discovered during implementation must result in the spec being updated and reviewed first — never the other way around.
- The `Page[TransactionRead]` generic response schema must be fully expanded in the spec (OpenAPI does not support generics natively); define it as `TransactionPage` with concrete `items`, `total`, `page`, `size` fields.
