# Task 06 — Frontend Authentication UI

## Background

The AuthPage is the entry point for all users. It collects credentials, calls the login API, handles errors without leaking field information, and redirects to the dashboard on success. It also protects all other routes via a React auth guard.

## User Story

As a visitor, I want to log in with my credentials, so that I can access my personal articles and the authoring tools.

## Tasks

- [ ] Create `AuthPage` component with username and password fields and a Submit button
- [ ] On submit, call `POST /api/auth/login` with credentials
- [ ] On success (200), redirect to `/dashboard`
- [ ] On failure (401), display a generic error message that does not reference which field is wrong
- [ ] Create an `AuthContext` / auth state hook to track the current session (userId, username)
- [ ] On application load, call `GET /api/auth/me` to restore session from existing cookie
- [ ] Create a `ProtectedRoute` component that redirects to `/login` if no active session exists
- [ ] Wrap `/dashboard` and `/articles/:id/edit` routes with `ProtectedRoute`
- [ ] Implement a logout button (visible in the app header) that calls `POST /api/auth/logout` and redirects to `/login`
- [ ] Handle token refresh transparently: if any API call returns 401, attempt `POST /api/auth/refresh` once and retry; on refresh failure, redirect to `/login`

## Testing and Verification

### Unit Tests
- `AuthPage` renders username field, password field, and submit button
- Submitting the form calls `POST /api/auth/login` with the entered credentials
- A 401 response displays a generic error message (text does not contain "username" or "password")
- A 200 response triggers navigation to `/dashboard`
- `ProtectedRoute` renders children when session is active
- `ProtectedRoute` redirects to `/login` when no session is present
- Logout button calls `POST /api/auth/logout` and navigates to `/login`

### Integration Tests
- Full login flow: enter seeded test user credentials, submit, verify redirect to `/dashboard`
- Invalid credentials: enter wrong password, verify error message appears and no redirect occurs
- Navigating to `/dashboard` without a session redirects to `/login`
- After login, refreshing the page preserves the session (cookie-based restore via `/api/auth/me`)

## Dependencies

### Internal
- TASK-01 (frontend Vite scaffold)
- TASK-03 (Auth API endpoints)

### External
- React Router v6 (routing and navigation)
- Vitest + React Testing Library (component tests)

## Open Questions

None

## Acceptance Criteria

1. Submitting valid credentials navigates the user to `/dashboard`
2. Submitting invalid credentials shows a generic error message with no field-specific hint
3. Unauthenticated access to `/dashboard` or `/articles/:id/edit` redirects to `/login`
4. The logout button ends the session and redirects to `/login`
5. Refreshing the page while logged in does not log the user out

## Relative Estimation

5 points

## Special Notes

- Do not store JWT tokens in `localStorage` or `sessionStorage` — rely entirely on the `httpOnly` cookie set by the API
- The token refresh logic (interceptor) should be implemented at the HTTP client layer (e.g., an Axios interceptor or a custom `fetch` wrapper) so all API calls benefit from it automatically
