# Task 11 — Property-Based Test Suite

## Background

The design document defines 17 formal correctness properties. This task implements all of them as executable property-based tests using fast-check and Vitest. These tests provide machine-verifiable evidence that the system meets its correctness specification across a wide input space, not just for hand-picked examples.

## User Story

As a developer, I want property-based tests for all correctness properties, so that I have evidence the system behaves correctly for arbitrary inputs.

## Tasks

- [ ] Install and configure `fast-check` in both `api/` and `frontend/` projects
- [ ] Implement Property 1: Auth error indistinguishability — `authService.login()` returns byte-identical error for wrong username and wrong password
- [ ] Implement Property 2: Active session grants access — any non-expired JWT passes JWT middleware with non-401
- [ ] Implement Property 3: Article creation invariants — created article has empty title, empty body, correct `user_id`
- [ ] Implement Property 4: Multiple articles per user — N creates yields N retrievable articles
- [ ] Implement Property 5: Formatting scoped to selection — format applied to a selection only modifies nodes within the selection
- [ ] Implement Property 6: Formatting toggle round-trip — applying a format twice returns the document to its original state
- [ ] Implement Property 7: Hyperlink URL validation — any non-HTTP/HTTPS string is rejected; no link is applied
- [ ] Implement Property 8: Article save/load round-trip — PATCH then GET returns identical title and body
- [ ] Implement Property 9: Ownership access control — user B cannot read or modify user A's article
- [ ] Implement Property 10: Valid image upload embeds in document — valid file produces a URL that is inserted at cursor
- [ ] Implement Property 11: Invalid image upload rejected — oversized or wrong-format file is rejected; body unchanged
- [ ] Implement Property 12: Image deletion removes node — no image node with URL U remains after deletion
- [ ] Implement Property 13: Dashboard sort order — list is always ordered by `updated_at` descending
- [ ] Implement Property 14: Pagination invariant — page 1 with limit 20 returns exactly 20 items when total > 20
- [ ] Implement Property 15: Delete consistency — after delete, GET returns 404 and `article_images` records are gone
- [ ] Implement Property 16: Concurrent save isolation — concurrent saves for different users do not cross-contaminate
- [ ] Implement Property 17: Session independence on logout — U1 logout does not affect U2's session
- [ ] Configure each test to run minimum 100 iterations (`numRuns: 100`)
- [ ] Tag each test with a comment: `// Feature: blog-application, Property N: <name>`
- [ ] Add `make test:pbt` target to run only property-based tests

## Testing and Verification

### Unit Tests
- Each of the 17 properties is its own test, all passing with 100 iterations

### Integration Tests
- None — all PBTs use in-memory repos, pure functions, or mocked service boundaries

## Dependencies

### Internal
- TASK-03 (Auth Service — Properties 1, 2, 17)
- TASK-04 (Article Service — Properties 3, 4, 8, 9, 13, 14, 15, 16)
- TASK-05 (Image Service — Properties 10, 11)
- TASK-08 (TipTap editor logic — Properties 5, 6, 7, 12)

### External
- `fast-check` (property-based testing library)
- Vitest (test runner)

## Open Questions

None

## Acceptance Criteria

1. All 17 property tests are implemented and pass with `numRuns: 100`
2. Each test file is tagged with the property number it validates
3. `make test` includes property-based tests in its output
4. `make test:pbt` runs only the property-based test suite
5. No property test uses a live database, live S3/MinIO, or live network connection — all external dependencies are mocked or in-memory

## Relative Estimation

8 points

## Special Notes

- Properties 5, 6, 7, and 12 target pure TipTap document transformation functions — extract these as pure utility functions from the React component layer so they can be tested without a DOM
- Property 16 (concurrent save isolation) uses simulated async concurrency with `Promise.all` and an in-memory repo with async delays, not actual parallel processes
- If a property-based test fails, fast-check will shrink the counterexample — always log the minimal failing case before investigating
