### FE-016 — Category List + Create Category

#### Background
Users manage their categories from a dedicated Category Management page. This story covers listing existing categories and creating new ones via an inline form. Categories created here become available in the transaction form dropdowns (FE-013, FE-014).

#### User Story
As an authenticated user, I want to view my existing categories and create new ones, so that I can organise my transactions with meaningful labels.

#### Tasks
- [ ] Create `src/pages/CategoryPage.tsx` — fetches categories using `useGetCategories`; renders a list of `CategoryItem` components; shows an empty state when no categories exist
- [ ] Create `src/components/categories/CategoryItem.tsx` — displays category name and a delete button
- [ ] Create `src/components/categories/CreateCategoryForm.tsx` — inline form with a `name` field; Zod schema: min 1 char, max 50 chars; calls `useCreateCategory` on submit
- [ ] On create success: `queryClient.invalidateQueries(["categories"])`; clear the form input; show success toast
- [ ] On 409 conflict: show toast "A category with this name already exists"
- [ ] Register `/categories` route in the router wrapped by `<ProtectedRoute>`; add link in `AppLayout` navigation

#### Testing and Verification

**Unit tests** — mock `useGetCategories` and `useCreateCategory`, test with React Testing Library:
- `test_category_list_renders_empty_state_when_no_categories`
- `test_category_list_renders_correct_number_of_category_items` — mock returns 3 categories; assert 3 items
- `test_CategoryItem_renders_category_name`
- `test_create_category_form_shows_validation_error_for_empty_name`
- `test_create_category_form_shows_validation_error_for_name_exceeding_50_chars`
- `test_create_category_form_calls_useCreateCategory_with_correct_name_on_submit`
- `test_create_category_form_shows_409_error_toast_on_duplicate_name` — mock mutation rejects with 409 `ApiError`
- `test_create_category_form_clears_input_on_success`

**Integration tests** — render full page with mocked hooks:
- `test_category_page_renders_list_and_inline_create_form`
- `test_creating_category_adds_it_to_the_list`

#### Dependencies
- FE-009
- FE-015

#### Open Questions
- None

#### Acceptance Criteria
- `/categories` page shows the authenticated user's categories
- Inline form creates a new category; duplicates show a 409 error toast
- Name too long or empty is caught by Zod validation before any API call
- New category appears in the list immediately after successful creation
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- None
