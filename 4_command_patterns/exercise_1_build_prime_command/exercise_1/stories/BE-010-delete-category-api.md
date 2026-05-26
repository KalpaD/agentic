### BE-010 — Delete Category `DELETE /api/v1/categories/{category_id}`

#### Background
When a user deletes a category, the database `ON DELETE SET NULL` constraint automatically sets `category_id` to `NULL` on all transactions that referenced it. The transactions themselves are preserved. Ownership must be verified before deletion.

#### User Story
As an authenticated user, I want to delete a category I own, so that I can remove labels I no longer need — with the understanding that existing transactions will simply become uncategorised.

#### Tasks
- [ ] Implement `CategoryRepository.get_by_id(category_id: UUID) -> Category | None`
- [ ] Implement `CategoryRepository.delete(category_id: UUID) -> None`
- [ ] Implement `CategoryService.delete_category(user_id: str, category_id: UUID) -> None`:
  - Fetch by ID; if not found → `AppError(404, "category-not-found")`
  - If `category.owner_id != user_id` → `AppError(404, "category-not-found")`
  - Call `repo.delete(category_id)`
- [ ] Add `DELETE /api/v1/categories/{category_id}` route returning 204 No Content
- [ ] Log `category.delete.start` and `category.delete.success` using structlog

#### Testing and Verification

**Unit tests** — mock `CategoryRepository`, test `CategoryService` logic in isolation:
- `test_delete_category_calls_repo_delete_for_correct_owner` — mock `repo.get_by_id` returns category with matching `owner_id`; assert `repo.delete` called
- `test_delete_category_raises_404_when_category_not_found` — mock `repo.get_by_id` returns `None`; assert `AppError(404, "category-not-found")` raised
- `test_delete_category_raises_404_when_category_belongs_to_different_owner` — mock returns category with different `owner_id`; assert `AppError(404)` raised

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_delete_category_returns_204_no_content`
- `test_delete_category_sets_transaction_category_id_to_null` — create category, create transaction with that category, delete category; assert transaction still exists with `category_id = null`
- `test_delete_category_returns_404_for_nonexistent_id`
- `test_delete_category_returns_404_when_category_belongs_to_other_user`
- `test_delete_category_returns_401_without_token`

#### Dependencies
- BE-009

#### Open Questions
- None

#### Acceptance Criteria
- `DELETE /api/v1/categories/{id}` by the owning user → 204 No Content
- Transactions referencing the deleted category remain in the database with `category_id = NULL`
- Non-existent category ID → 404 `{"type": "category-not-found"}`
- Attempting to delete another user's category → 404

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- The SET NULL cascade is handled at the database level; no application code is needed to update transactions. Verify this behaviour with an integration test to guard against future migration changes.
