# Implementation Tasks — Blog Application

## Task 1: Project Scaffold and Local Dev Setup

Set up the monorepo structure, Docker Compose stack, and Makefile developer interface. All subsequent tasks depend on this foundation.

### Sub-tasks
- [ ] Initialise monorepo directory structure: `frontend/`, `api/`, `docker/`, `Makefile`
- [ ] Create `api/` Node.js + Express skeleton with TypeScript config, ESLint, and Prettier
- [ ] Create `frontend/` React + Vite skeleton with TypeScript config, ESLint, and Prettier
- [ ] Write `docker-compose.yml` with services: `frontend`, `api`, `db` (PostgreSQL 16), `minio`, `minio-init`
- [ ] Write `Dockerfile` for `api` (development target with nodemon hot-reload, production target)
- [ ] Write `Dockerfile` for `frontend` (development target with Vite, production target with Nginx)
- [ ] Configure Docker internal networking so `api` reaches `db:5432` and `minio:9000` by service name
- [ ] Seed MinIO `minio-init` one-shot container to create the `blog-images` bucket on first run
- [ ] Create `.env.example` documenting all required environment variables
- [ ] Write `Makefile` with targets: `dev`, `build`, `test`, `test-integration`, `down`, `logs`
- [ ] Add a `GET /health` endpoint to the API that returns 200

### Acceptance Criteria
- Running `make dev` from the repo root starts all services within 60 seconds on a clean machine
- `GET http://localhost:4000/health` returns `200 OK`
- `GET http://localhost:3000` serves the React app shell
- MinIO console is accessible at `http://localhost:9001`
- `make down` stops all containers cleanly with exit code 0
- `.env.example` documents every required environment variable with a description

## Task 2: Database Schema and Migrations

Set up Knex migrations and create the initial schema for users, refresh tokens, articles, and image metadata.

### Sub-tasks
- [ ] Add Knex.js as a dependency to the `api` project
- [ ] Configure Knex to connect to PostgreSQL using environment variables
- [ ] Create migration: `users` table (id UUID, username, password_hash, created_at)
- [ ] Create migration: `refresh_tokens` table (id, user_id FK, token_hash, expires_at, created_at)
- [ ] Create migration: `articles` table (id, user_id FK, title VARCHAR(200), body JSONB, status, created_at, updated_at)
- [ ] Create index: `idx_articles_user_updated` on `(user_id, updated_at DESC)`
- [ ] Create migration: `article_images` table (id, article_id FK, user_id FK, storage_key, url, size_bytes, mime_type, uploaded_at)
- [ ] Configure `api` startup to run pending migrations automatically on boot
- [ ] Add `make migrate` and `make migrate-rollback` targets to Makefile
- [ ] Write seed script for local dev: create 2 test users with known credentials

### Acceptance Criteria
- Running `make dev` on a fresh database applies all migrations automatically
- All 4 tables exist with the correct columns, types, constraints, and foreign keys
- The `idx_articles_user_updated` index exists on the `articles` table
- `make migrate-rollback` reverses the last migration cleanly
- Seed data creates 2 test users with known usernames and passwords

## Task 3: User Authentication API

Implement credential validation, JWT issuance, token refresh, logout, and the JWT middleware used by all protected routes.

### Sub-tasks
- [ ] Implement `POST /api/auth/login` — validate username/password, issue JWT access token (15 min) and refresh token (7 days), set as `httpOnly` cookies
- [ ] Implement JWT middleware — validate Bearer token or cookie, attach `req.userId`, return 401 on invalid/expired token
- [ ] Implement `POST /api/auth/refresh` — validate refresh token hash, issue new access token
- [ ] Implement `POST /api/auth/logout` — delete refresh token, clear cookies
- [ ] Implement `GET /api/auth/me` — return current user info
- [ ] Return identical error message for wrong username and wrong password (no field enumeration)
- [ ] Hash all refresh tokens with SHA-256 before storing
- [ ] Apply JWT middleware to all `/api/articles` and `/api/images` routes

### Acceptance Criteria
- `POST /api/auth/login` with valid credentials returns 200 and sets `httpOnly` cookies
- `POST /api/auth/login` with invalid credentials returns 401 with a message that does not indicate which field failed
- The error message body is byte-identical regardless of whether the username or password is wrong
- JWT middleware blocks unauthenticated requests with 401
- `POST /api/auth/logout` clears both cookies and invalidates the refresh token in the database

## Task 4: Article CRUD API

Implement the REST endpoints for creating, reading, updating, and deleting articles with full owner-scoping.

### Sub-tasks
- [ ] Implement `POST /api/articles` — create blank article owned by `req.userId`, return 201
- [ ] Implement `GET /api/articles` — list articles paginated (page, limit=20), sorted by `updated_at DESC`, with total count
- [ ] Implement `GET /api/articles/:id` — fetch single article; return 404 if not found or not owned
- [ ] Implement `PATCH /api/articles/:id` — update title and/or body; validate title max 200 chars; owner-only; respond within 2s
- [ ] Implement `DELETE /api/articles/:id` — delete article and cascade to `article_images`; owner-only; enqueue async MinIO cleanup
- [ ] Add DB write timeout guard on `PATCH` — return 504 if write exceeds 2s
- [ ] Validate all request bodies with Zod

### Acceptance Criteria
- `POST /api/articles` returns 201 with a new article owned by the authenticated user
- `GET /api/articles/:id` returns 404 for articles owned by a different user
- `PATCH /api/articles/:id` persists changes and responds within 2 seconds under normal load
- `DELETE /api/articles/:id` removes the article and cascades to image metadata records
- `GET /api/articles` paginates at 20 items per page and includes `total`, `page`, and `pages` in the response

## Task 5: Image Upload API

Implement file upload validation, MinIO/S3 storage, and the hosted URL response for the image service.

### Sub-tasks
- [ ] Implement `POST /api/images` — accept `multipart/form-data` with a single file field
- [ ] Validate file size: reject files larger than 10 MB with HTTP 400
- [ ] Validate MIME type: accept only jpeg/png/gif/webp; reject others with HTTP 400
- [ ] Upload valid file to MinIO using AWS SDK v3 with endpoint from `STORAGE_ENDPOINT` env var
- [ ] On successful upload, insert record into `article_images` table
- [ ] Return `{ url: "..." }` on success
- [ ] Return HTTP 502 on S3/MinIO timeout or error
- [ ] Configure upload timeout: abort S3 upload after 10s
- [ ] Apply JWT middleware to `POST /api/images`

### Acceptance Criteria
- `POST /api/images` with a valid file returns 200 with `{ url: "..." }` pointing to a publicly accessible object
- Files exceeding 10 MB are rejected with HTTP 400 and a message stating the maximum allowed size
- Files with unsupported MIME types are rejected with HTTP 400 listing JPEG, PNG, GIF, WebP
- S3/MinIO timeout or error returns HTTP 502
- In all error cases, no `article_images` record is created in the database

## Task 6: Frontend Authentication UI

Build the login page, auth context, protected route guard, and transparent token refresh.

### Sub-tasks
- [ ] Create `AuthPage` component with username, password fields and submit button
- [ ] On submit, call `POST /api/auth/login`; on success redirect to `/dashboard`; on failure show generic error
- [ ] Create `AuthContext` / auth state hook to track current session
- [ ] On app load, call `GET /api/auth/me` to restore session from cookie
- [ ] Create `ProtectedRoute` component that redirects to `/login` if no session
- [ ] Wrap `/dashboard` and `/articles/:id/edit` with `ProtectedRoute`
- [ ] Implement logout button calling `POST /api/auth/logout` and redirecting to `/login`
- [ ] Implement token refresh: on 401, attempt `POST /api/auth/refresh` once and retry; on failure redirect to `/login`

### Acceptance Criteria
- Submitting valid credentials navigates the user to `/dashboard`
- Submitting invalid credentials shows a generic error with no field-specific hint
- Unauthenticated access to `/dashboard` redirects to `/login`
- The logout button ends the session and redirects to `/login`
- Refreshing the page while logged in does not log the user out

## Task 7: Article Dashboard UI

Build the paginated article list dashboard with create, open, and delete actions.

### Sub-tasks
- [ ] Create `Dashboard` component that fetches `GET /api/articles?page=1&limit=20` on mount
- [ ] Render article list sorted by `updated_at` descending with title and last-modified date
- [ ] Show "No articles yet" empty state when list is empty
- [ ] Implement "New Article" button calling `POST /api/articles`; navigate to editor on success; show error toast on failure
- [ ] Implement pagination controls when total articles exceed 20
- [ ] Implement row click / "Open" to navigate to `/articles/:id/edit`
- [ ] Implement "Delete" button with confirmation dialog; on success remove from list; on failure show error
- [ ] Show loading skeleton while articles are being fetched

### Acceptance Criteria
- Dashboard displays all articles owned by the authenticated user, sorted by last-modified descending
- Pagination controls appear and function correctly when more than 20 articles exist
- Creating a new article navigates to the editor; failure shows an error without navigating
- Deleting an article requires confirmation; success removes it from list; failure shows error
- Dashboard loads within 3 seconds with up to 1,000 articles seeded (first page only)

## Task 8: Rich Text Editor UI

Build the TipTap-based ArticleEditor with full formatting support, keyboard shortcuts, and hyperlink validation.

### Sub-tasks
- [ ] Install and configure TipTap with extensions: `StarterKit`, `Underline`, `Link`, `Image`
- [ ] Create `ArticleEditor` component with title input (max 200 chars) and TipTap canvas
- [ ] Implement toolbar: Bold, Italic, Underline, Code, H1, H2, H3, Blockquote, OL, UL, Hyperlink, Image Insert
- [ ] Wire keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+Z, Ctrl+Shift+Z
- [ ] Implement formatting toggle (apply same format twice removes it)
- [ ] Implement hyperlink insertion with URL validation (must be http/https); show error for invalid URLs
- [ ] Render formatted content visually without showing markup
- [ ] Load existing article content on mount from article data

### Acceptance Criteria
- All 5 inline formats and 6 block formats are available from the toolbar
- Each format toggles off when applied to already-formatted text
- All 6 keyboard shortcuts work correctly
- Hyperlink insertion validates URL and shows error for non-HTTP/HTTPS strings without modifying the document
- Formatted content renders visually without showing markup

## Task 9: Article Save and Auto-Save

Implement manual save, 30-second auto-save, the "Saved" indicator, and the unsaved-changes navigation guard.

### Sub-tasks
- [ ] Implement manual save on Ctrl+S or Save button: call `PATCH /api/articles/:id`
- [ ] Implement auto-save timer: every 30s while user has interacted within the last 60s
- [ ] Reset 60s inactivity clock on any keypress or editor interaction
- [ ] Display "Saved" toast on successful save: non-overlapping, auto-dismisses after 3s
- [ ] Display retry error message on save failure; retain all unsaved content
- [ ] Implement unsaved-changes guard using React Router `useBlocker`
- [ ] Confirmation dialog: "Confirm" discards and navigates; "Cancel" returns to editor with changes intact
- [ ] Track dirty flag: set on any edit, clear on successful save

### Acceptance Criteria
- Auto-save triggers every 30 seconds while user is actively editing
- "Saved" indicator appears, does not overlay the editor, and disappears after 3 seconds
- Save failure retains unsaved content and shows retry error
- Navigating away with unsaved changes shows confirmation dialog
- Saving and reloading returns the exact same title and body

## Task 10: Image Upload UI (TipTap Plugin)

Build the ImageUploadPlugin TipTap extension for inline image insertion, with client-side validation and error handling.

### Sub-tasks
- [ ] Create custom TipTap extension `ImageUploadPlugin`
- [ ] Add "Insert Image" button to `ArticleEditor` toolbar
- [ ] Client-side pre-validate: size <= 10 MB and MIME type in accepted set; show errors without uploading
- [ ] For valid files, call `POST /api/images` and show inline loading indicator
- [ ] On success, insert TipTap image node at cursor with returned URL
- [ ] On API error (400, 502, network failure), show error and leave document unchanged
- [ ] Implement image deletion: deleting an image node removes it from the document

### Acceptance Criteria
- Valid images are uploaded and embedded inline at the cursor position
- Oversized files are rejected client-side with a message stating the 10 MB limit
- Unsupported formats are rejected client-side listing accepted formats
- API errors display an error message and leave the article body unchanged
- Deleting an embedded image removes it from the document content

## Task 11: Property-Based Test Suite

Implement all 17 correctness properties as property-based tests using fast-check and Vitest.

### Sub-tasks
- [ ] Install and configure `fast-check` in both `api/` and `frontend/` projects
- [ ] Implement all 17 properties as described in design.md (Properties 1–17)
- [ ] Configure each test to run minimum 100 iterations (`numRuns: 100`)
- [ ] Tag each test with `// Feature: blog-application, Property N: <name>`
- [ ] Add `make test:pbt` target to run only property-based tests

### Acceptance Criteria
- All 17 property tests are implemented and pass with `numRuns: 100`
- Each test file is tagged with the property number it validates
- `make test` includes property-based tests in its output
- `make test:pbt` runs only the property-based test suite
- No property test uses a live database, live S3/MinIO, or live network connection
