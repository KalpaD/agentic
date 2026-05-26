### BE-008 — List Categories `GET /api/v1/categories`

#### Background
Categories are user-defined labels scoped to the owning user and reusable across all their accounts. This story establishes the full Category module layer structure (router, service, repository, schemas) and returns the authenticated user's category list.

#### User Story
As an authenticated user, I want to retrieve all my categories, so that I can see what labels are available to assign to transactions.

#### Tasks
- [ ] Create `app/api/v1/categories/schemas.py` — define `CategoryCreate` and `CategoryRead` Pydantic models matching the OpenAPI spec
- [ ] Create `app/api/v1/categories/repository.py` — `CategoryRepository.list_by_owner(owner_id: str) -> list[Category]`
- [ ] Create `app/api/v1/categories/service.py` — `CategoryService.list_categories(user_id: str) -> list[CategoryRead]`
- [ ] Create `app/api/v1/categories/router.py` — `GET /api/v1/categories` with `Depends(get_current_user_id)`
- [ ] Register category router in `app/api/v1/router.py`
- [ ] Add `get_category_repo` and `get_category_service` dependency factories to `app/dependencies.py`
- [ ] Log `category.list.start` and `category.list.success` using structlog

#### Testing and Verification

**Unit tests** — mock `CategoryRepository`, test `CategoryService` logic in isolation:
- `test_list_categories_calls_repo_with_correct_owner_id` — assert `repo.list_by_owner` is called with the correct `user_id`
- `test_list_categories_returns_empty_list_when_repo_returns_empty` — mock repo returns `[]`; assert service returns `[]`
- `test_list_categories_maps_repo_result_to_category_read_schema` — mock repo returns `Category` models; assert service returns `CategoryRead` list with correct `id`, `name`, `created_at` fields

**Integration tests** — real ASGI app + real database via `AsyncClient`:
- `test_get_categories_returns_200_with_empty_list_for_new_user`
- `test_get_categories_returns_only_categories_owned_by_requesting_user` — insert categories for two users; assert each sees only their own
- `test_get_categories_returns_401_without_token`

#### Dependencies
- BE-002
- BE-004

#### Open Questions
- None

#### Acceptance Criteria
- `GET /api/v1/categories` with valid token returns 200 with `list[CategoryRead]`
- New user with no categories receives `[]` — not a 404
- A user cannot see categories belonging to another user
- Response schema matches `CategoryRead` from the OpenAPI spec exactly

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- Categories are global to a user — they are not scoped to a specific account. A category created by a user is available to assign to any of their transactions across all their accounts.
