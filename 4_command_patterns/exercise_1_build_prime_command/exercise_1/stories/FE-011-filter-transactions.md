### FE-011 — Filter Transactions by Date Range

#### Background
Users need to narrow their transaction view to a specific time period. The date range filter passes `start_date` and `end_date` query parameters to the backend. The selected filter state is reflected in the URL so it can be bookmarked and shared.

#### User Story
As an authenticated user, I want to filter my transaction list by a date range, so that I can focus on a specific period such as the current month.

#### Tasks
- [ ] Add a date-range picker component to `AccountDetailPage.tsx` using a shadcn/ui `DateRangePicker` (or two `DatePicker` inputs for start and end)
- [ ] Store selected date range in URL search params (`?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`) using `useSearchParams`
- [ ] Pass `start_date` and `end_date` from URL params to `useGetTransactions`; TanStack Query automatically refetches when params change
- [ ] Add a "Clear filter" button that removes date params from the URL and resets to the unfiltered view
- [ ] When a date range is active, display a visible badge or label indicating the active filter

#### Testing and Verification

**Unit tests** — test filter state logic and component behaviour in isolation:
- `test_date_range_picker_calls_onChange_handler_with_selected_dates` — render picker; simulate date selection; assert `onChange` called with correct start and end dates
- `test_clear_filter_button_calls_handler_to_remove_date_params`
- `test_active_filter_badge_is_visible_when_date_range_is_set` — render component with start/end date props; assert badge visible
- `test_active_filter_badge_is_hidden_when_no_date_range_set`

**Integration tests** — render full page with mocked hooks:
- `test_selecting_date_range_updates_url_search_params` — simulate date selection; assert URL contains `start_date` and `end_date`
- `test_selecting_date_range_refetches_transactions_with_new_params` — assert `useGetTransactions` is called with updated date params
- `test_clear_filter_removes_date_params_from_url`
- `test_page_loads_with_existing_date_params_from_url` — render with pre-set URL params; assert picker shows the pre-selected range

#### Dependencies
- FE-010

#### Open Questions
- None

#### Acceptance Criteria
- Date-range picker on the Account Detail page controls which transactions are displayed
- Selected date range is reflected in the URL search params
- Changing the filter triggers a new API call with the updated `start_date` and `end_date`
- "Clear filter" resets the view to all transactions
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- Dates sent to the backend must be formatted as `YYYY-MM-DD` ISO strings. Ensure the date picker output is serialised correctly before being appended to the URL.
