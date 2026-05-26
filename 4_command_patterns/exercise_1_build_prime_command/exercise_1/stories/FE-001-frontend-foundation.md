### FE-001 — Frontend Foundation

#### Background
Before any UI feature work begins, the React SPA skeleton must exist with all shared infrastructure configured: routing, the Axios client with error interceptors, the structured logger, the error mapping utility, and the base layout. Every subsequent frontend story builds on this foundation.

#### User Story
As an engineer working on the PFM frontend, I want a loadable React SPA with routing, an Axios API client, error mapping, and structured logging all configured, so that I can build feature pages on a consistent, well-structured foundation.

#### Tasks
- [ ] Initialise Vite + React + TypeScript project with `pnpm create vite`; configure strict TypeScript (`"strict": true` in `tsconfig.json`)
- [ ] Install and configure Tailwind CSS v4 and shadcn/ui
- [ ] Install and configure Biome for linting and formatting
- [ ] Set up React Router with a route skeleton: `/`, `/login`, `/register`, `/verify`, `/dashboard`, `/accounts/:id`, `/categories`
- [ ] Implement `src/lib/axios.ts` — Axios instance with `baseURL` from `import.meta.env.VITE_API_BASE_URL`; request interceptor to inject `Authorization: Bearer <token>`; response interceptor to transform errors into `ApiError`
- [ ] Implement `src/lib/errors.ts` — `ApiError` class; `toUserMessage(error)` function that maps RFC 9457 `type` strings to human-readable messages via a `switch` statement; default message for unknown types
- [ ] Implement `src/lib/logger.ts` — structured logger that calls `console.info` in dev and is a no-op in production; always calls `console.error` regardless of environment
- [ ] Create `src/components/ui/` directory for shadcn/ui primitives
- [ ] Create a base `AppLayout` component with a placeholder navigation bar
- [ ] Create `.env.example` with `VITE_API_BASE_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID`

#### Testing and Verification

**Unit tests** — test utility functions and classes in isolation, no rendering, no network:
- `test_toUserMessage_returns_correct_string_for_account_already_exists` — `toUserMessage({type: "account-already-exists"})` returns the expected user-facing string
- `test_toUserMessage_returns_correct_string_for_invalid_amount`
- `test_toUserMessage_returns_generic_fallback_for_unknown_error_type`
- `test_logger_info_is_noop_in_production` — mock `import.meta.env.DEV = false`; call `logger.info(...)`; assert `console.info` not called
- `test_logger_info_calls_console_in_development` — mock `import.meta.env.DEV = true`; assert `console.info` called with JSON string
- `test_logger_error_always_calls_console_error_regardless_of_env`

**Integration tests** — render components with React Testing Library:
- `test_app_renders_without_crashing` — render `<App />`; assert no thrown errors
- `test_unknown_route_renders_404_page` — navigate to `/nonexistent`; assert 404 content visible

#### Dependencies
- None

#### Open Questions
- None

#### Acceptance Criteria
- `pnpm dev` starts the Vite dev server on port 5173 without errors
- SPA loads in a browser and displays the base layout
- Navigating to all defined routes renders without crashing
- `pnpm lint && pnpm tsc --noEmit` passes with zero errors
- `pnpm test:run` passes

#### Relative Estimation
- [ ] 5 points

#### Special Notes
- All API error types must be mapped in `toUserMessage` from day one. Never parse error message strings in components — only use the `type` field from the RFC 9457 response.
- `src/api/generated/` is a reserved directory for orval output. It must not contain any hand-written files.
