### BE-009 — Create Category `POST /api/v1/categories`

#### Background
Users need to create categories to label their transactions. Category names must be unique per user, enforced at the service layer for a clean error response and at the database via a `UNIQUE(owner_id, name)` constraint as a safety net.

#### User Story
As an authenticated user, I want to create a new category with a unique name, so that I can use it to label my transactions.

#### Tasks
- [ ] Implement `CategoryRepository.get_by_name(owner_id: str, name: str) -> Category | None`
- [ ] Implement `CategoryRepository.create(owner_id: str, payload: CategoryCreate) -> Category`
- [ ] Implement `CategoryService.create_category(user_id: str, payload: CategoryCreate) -> CategoryRead`:
  - Check `get_by_name`; raise `AppError(409, "category-already-exists", "Category already exists", "A category with this name already exists")` if found
  - Otherwise create and return `CategoryRead`
- [ ] Add `POST /api/v1/categories` route with status code 201
- [ ] Validate `name` max 50 chars in `CategoryCreate`
- [ ] Log `category.create.start` and `category.create.success` using structlog
- [ ] Create test fixture files:
  - `tests/fixtures/categories/create_category_request.json`
  - `tests/fixtures/categories/create_category_response.json`

#### Testing and Verification

**Unit tests** — mock `CategoryRepository`, test `CategoryService` logic in isolation:
- `test_create_category_raises_409_when_name_already_exists` — mock `repo.get_by_name` returns existing `Category`; assert `AppError(409, "category-already-exists")` raised
- `test_create_category_calls_repo_create_when_name_is_unique` — mock `repo.get_by_name` returns `None`; assert `repo.create` is called with correct `owner_id` and payload
- `test_create_category_returns_category_read_schema` — mock `repo.create` returns `Category`; assert service returns `CategoryRead` with correct fields

**Integration tests** — real ASGI app + real database via `AsyncClient`, using JSON fixture files:
- `test_post_category_returns_201_with_category_read` — POST with `create_category_request.json`; assert 201 and response matches `create_category_response.json` shape
- `test_post_category_duplicate_name_for_same_user_returns_409`
- `test_post_category_same_name_for_different_users_returns_201` — two users can each create a category with the same name
- `test_post_category_name_exceeds_50_chars_returns_422`
- `test_post_category_empty_name_returns_422`
- `test_post_category_missing_name_field_returns_422`
- `test_post_category_returns_401_without_token`

#### Dependencies
- BE-008

#### Open Questions
- None

#### Acceptance Criteria
- `POST /api/v1/categories` with valid body → 201 with `CategoryRead`
- Duplicate name for the same user → 409 `{"type": "category-already-exists"}`
- Name exceeding 50 chars → 422
- Two different users can each have a category with the same name

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- None
