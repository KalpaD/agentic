### FE-007 — Dashboard — Account List

#### Background
The dashboard is the first page an authenticated user sees. It displays all their financial accounts as cards showing the account name and computed balance. This story wires up the generated `useGetAccounts` hook to render real data from the backend.

#### User Story
As an authenticated user, I want to see all my financial accounts with their computed balances on a dashboard, so that I can get an immediate overview of my finances.

#### Tasks
- [ ] Create `src/pages/DashboardPage.tsx` — fetches accounts using `useGetAccounts`; renders a grid of `AccountCard` components; shows an empty state when no accounts exist
- [ ] Create `src/components/accounts/AccountCard.tsx` — displays account name and balance; balance shown in green for positive, red for negative, grey for zero
- [ ] Create `src/components/accounts/EmptyAccountsState.tsx` — placeholder with a "Create your first account" prompt
- [ ] Register `/dashboard` in the router wrapped by `<ProtectedRoute>`
- [ ] Handle loading and error states: show a skeleton loader while fetching; show an error message if the API call fails

#### Testing and Verification

**Unit tests** — render components in isolation with mocked props, no network:
- `test_AccountCard_renders_account_name` — render `<AccountCard>` with mock `AccountRead`; assert name visible
- `test_AccountCard_renders_positive_balance_in_green`
- `test_AccountCard_renders_negative_balance_in_red`
- `test_AccountCard_renders_zero_balance_in_grey`
- `test_EmptyAccountsState_renders_create_prompt`

**Integration tests** — render full page with mocked TanStack Query hooks:
- `test_dashboard_shows_skeleton_loader_while_accounts_are_loading` — mock `useGetAccounts` returns `{ isLoading: true }`
- `test_dashboard_renders_account_cards_after_successful_fetch` — mock `useGetAccounts` returns list of accounts; assert correct number of cards
- `test_dashboard_renders_empty_state_when_accounts_list_is_empty` — mock returns `[]`
- `test_dashboard_shows_error_message_when_api_call_fails` — mock `useGetAccounts` returns `{ isError: true }`

#### Dependencies
- FE-005
- FE-006

#### Open Questions
- None

#### Acceptance Criteria
- Authenticated user at `/dashboard` sees their accounts as cards with name and balance
- New user with no accounts sees the empty state prompt
- Loading skeleton is shown while the API call is in flight
- Balance is colour-coded: green (positive), red (negative), grey (zero)
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 3 points

#### Special Notes
- None
