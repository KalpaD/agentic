### FE-005 — Sign Out + Protected Routes

#### Background
Unauthenticated users must be redirected to the login page when accessing protected routes. Authenticated users must be able to sign out, which clears the Amplify session. This story wires up the authentication guard that all subsequent page stories depend on.

#### User Story
As a user, I want unauthenticated access to protected pages to redirect me to login, and I want to be able to sign out to end my session securely.

#### Tasks
- [ ] Create `src/hooks/useAuthSession.ts` — custom hook that calls `fetchAuthSession()` from `aws-amplify/auth` and returns `{ isAuthenticated, isLoading, accessToken }`
- [ ] Create `src/components/ProtectedRoute.tsx` — renders children if authenticated; redirects to `/login` if not; shows a loading spinner while session is resolving
- [ ] Wrap all protected routes (`/dashboard`, `/accounts/:id`, `/categories`) with `<ProtectedRoute>` in the router
- [ ] Update the Axios request interceptor in `src/lib/axios.ts` to call `fetchAuthSession()` and inject the current access token on every request
- [ ] Add a sign-out button to `AppLayout` that calls `signOut()` from `aws-amplify/auth` and navigates to `/login`

#### Testing and Verification

**Unit tests** — mock `fetchAuthSession` and `signOut`, test with React Testing Library:
- `test_protected_route_renders_children_when_session_is_authenticated` — mock `fetchAuthSession` returns a valid session; assert children rendered
- `test_protected_route_redirects_to_login_when_session_is_unauthenticated` — mock `fetchAuthSession` returns no tokens; assert redirect to `/login`
- `test_protected_route_shows_loading_spinner_while_session_resolves` — mock `fetchAuthSession` returns a pending promise; assert spinner visible
- `test_sign_out_button_calls_amplify_signOut` — render `AppLayout`; click sign-out button; assert `signOut` called
- `test_sign_out_navigates_to_login_after_signOut_resolves`

**Integration tests** — render full app with router context:
- `test_navigating_to_dashboard_without_auth_redirects_to_login`
- `test_navigating_to_dashboard_with_valid_session_renders_dashboard`

#### Dependencies
- FE-004

#### Open Questions
- None

#### Acceptance Criteria
- Unauthenticated user navigating to `/dashboard` is redirected to `/login`
- Authenticated user navigating to `/login` or `/register` is redirected to `/dashboard`
- Sign-out clears the Amplify session and redirects to `/login`
- Axios request interceptor always injects a fresh access token on every API call
- `pnpm lint && pnpm tsc --noEmit` passes

#### Relative Estimation
- [ ] 2 points

#### Special Notes
- Token injection in the Axios interceptor must call `fetchAuthSession()` on every request — Amplify handles token refresh automatically, so this always returns a valid (refreshed if needed) token without additional logic in the interceptor.
