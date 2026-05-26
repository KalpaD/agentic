### FE-012 — Paginate Transactions

#### Background
The backend returns a paged response with `items`, `total`, `page`, and `size`. The frontend needs pagination controls (previous/next) so users can navigate through large transaction lists. The current page is stored in URL params so it survives a browser refresh.

#### User Story
As an authenticated user, I want to navigate through my transaction list one page at a time, so that I can browse large numbers of transactions without the page becoming unwieldy.

#### Tasks
- [ ] Create `src/components/transactions/PaginationControls.tsx` — "Previous" and "Next" buttons; displays "Page X of Y"; disables "Previous" on page 1 and "Next" on the last page
- [ ] Store current page in URL search params (`?page=2`) using `useSearchParams`; default to page 1 if absent
- [ ] Pass `page` and `size` (hardcoded 20) from URL params to `useGetTransactions`; query refetches automatically on page change
- [ ] Add `PaginationControls` below the transaction list in `AccountDetailPage.tsx`
- [ ] Reset page to 1 when the date filter changes (FE-011) to avoid invalid page state

#### Testing and Verification

**Unit tests** — test `PaginationControls` component in isolation with props:
- `test_pagination_controls_renders_current_page_and_total_pages` — pass `page=2, total=45, size=20`; assert "Page 2 of 3" displayed
- `test_previous_button_is_disabled_on_page_1` — pass `page=1`; assert Previous button has `disabled` attribute
- `test_next_button_is_disabled_on_last_page` — pass `page=3, total=45, size=20`; assert Next disabled
- `test_previous_button_calls_onPageChange_with_decremented_page` — click Previous; assert `onPageChange(1)` called (from page 2)
- `test_next_button_calls_onPageChange_with_incremented_page` — click Next; assert `onPageChange(3)` called (from page 2)

**Integration tests** — render full page with mocked hooks:
- `test_clicking_next_page_updates_url_param_and_refetches` — assert URL contains `?page=2` and `useGetTransactions` is called with `page=2`
- `test_changing_date_filter_resets_page_to_1`

#### Dependencies
- FE-011

#### Open Questions
- None

#### Acceptance Criteria
- Pagination controls appear below the transaction list showing current page and total pages
- Previous is disabled on page 1; Next is disabled on the last page
- Changing page updates the URL `?page` param and triggers a new API call
- Changing the date filter resets the page back to 1
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- None
