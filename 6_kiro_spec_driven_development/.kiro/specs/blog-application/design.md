# Design Document — Blog Application

## Overview

The blog application is a multi-user, Medium-like web platform that lets authenticated users create, edit, and manage articles through a rich-text editing experience. The system supports:

- User authentication with session management
- A WYSIWYG editor with inline and block-level formatting
- Image uploads embedded directly inside article bodies
- Auto-save and manual save for articles
- A paginated per-user article dashboard
- Concurrent access by 100+ simultaneous users

The architecture follows a three-tier web application model: a React single-page application (SPA) frontend, a Node.js/Express REST API backend, and a PostgreSQL relational database. Image storage uses an S3-compatible object storage service — **MinIO** in local/dev (run via Docker Compose) and a real S3-compatible provider in production. The entire stack is containerised and orchestrated with Docker Compose so it runs from a single command on any developer machine. A Makefile exposes `dev`, `build`, and `test` targets as the primary developer interface. The backend enforces authentication via JWT-based sessions, and all user data is strictly scoped to the authenticated owner.

---

## Architecture

### System Context Diagram (C4 Level 1)

The blog application as a black box, its primary user, and the external systems it depends on.

```mermaid
C4Context
    title System Context — Blog Application

    Person(user, "User / Visitor", "An authenticated or anonymous person who reads, writes, and manages blog articles via a web browser.")

    System(blog, "Blog Application", "Multi-user, Medium-like web platform. Allows users to authenticate, create and edit rich-text articles, upload images, and manage a personal article portfolio.")

    System_Ext(postgres, "PostgreSQL", "Relational database. Stores users, sessions, articles, and image metadata.")
    System_Ext(minio, "MinIO / S3-compatible Storage", "Object storage for uploaded images. MinIO in local dev; any S3-compatible provider in production.")

    Rel(user, blog, "Uses", "HTTPS / Browser")
    Rel(blog, postgres, "Reads / writes user, article & session data", "TCP / SQL")
    Rel(blog, minio, "Uploads & retrieves image objects", "HTTPS / S3 API")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Component Diagram (C4 Level 2 / 3)

Internal components of the Blog Application and their relationships.

```mermaid
C4Component
    title Component Diagram — Blog Application

    Person(user, "User", "Authenticated person in a web browser")

    Container_Boundary(spa, "Browser — React SPA") {
        Component(authPage, "AuthPage", "React component", "Renders login form; calls Auth Service")
        Component(dashboard, "Dashboard", "React component", "Lists, opens, and deletes articles; calls Article Service")
        Component(editor, "ArticleEditor", "React component + TipTap", "Full-page rich-text editor with toolbar, auto-save timer, and unsaved-changes guard")
        Component(imagePlugin, "ImageUploadPlugin", "TipTap Extension", "Intercepts image insertion, posts file to Image Service, embeds returned URL")
    }

    Container_Boundary(api, "Backend API — Node.js / Express") {
        Component(jwtMw, "JWT Middleware", "Express middleware", "Validates Bearer token / httpOnly cookie; attaches req.userId")
        Component(authSvc, "Auth Service", "Express router", "Credential validation, bcrypt password check, JWT issuance and refresh")
        Component(articleSvc, "Article Service", "Express router", "CRUD for articles; owner-scoped queries; 2 s save SLA")
        Component(imageSvc, "Image Service", "Express router", "Validates file size/type; uploads to S3-compatible storage; returns hosted URL")
    }

    System_Ext(postgres, "PostgreSQL", "Stores users, refresh_tokens, articles, article_images")
    System_Ext(minio, "MinIO / S3", "Stores image binary objects")

    Rel(user, authPage, "Submits credentials", "HTTPS")
    Rel(user, dashboard, "Manages articles", "HTTPS")
    Rel(user, editor, "Writes and edits", "HTTPS")

    Rel(authPage, jwtMw, "POST /api/auth/login")
    Rel(dashboard, jwtMw, "GET/DELETE /api/articles")
    Rel(editor, jwtMw, "GET/POST/PATCH /api/articles")
    Rel(imagePlugin, jwtMw, "POST /api/images")

    Rel(jwtMw, authSvc, "Routes /api/auth/*")
    Rel(jwtMw, articleSvc, "Routes /api/articles/*")
    Rel(jwtMw, imageSvc, "Routes /api/images")

    Rel(authSvc, postgres, "Reads/writes users & refresh_tokens", "SQL")
    Rel(articleSvc, postgres, "Reads/writes articles & article_images", "SQL")
    Rel(imageSvc, postgres, "Writes article_images metadata", "SQL")
    Rel(imageSvc, minio, "PUT / GET objects", "S3 API")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="2")
```

### High-Level Flow Diagram

```mermaid
graph TD
    subgraph Browser
        SPA[React SPA]
        RTE[Rich Text Editor - TipTap]
    end

    subgraph Backend API - Node.js/Express
        AuthSvc[Auth Service]
        ArticleSvc[Article Service]
        ImageSvc[Image Service]
        MW[JWT Middleware]
    end

    subgraph Data Layer
        PG[(PostgreSQL)]
        MINIO[(MinIO - local dev\nS3-compatible)]
    end

    SPA --> MW
    MW --> AuthSvc
    MW --> ArticleSvc
    MW --> ImageSvc
    AuthSvc --> PG
    ArticleSvc --> PG
    ImageSvc --> MINIO
    RTE --> ImageSvc
    RTE --> ArticleSvc
```

### Key Architectural Decisions

- **SPA + REST API separation**: Frontend and backend are independently deployable. The SPA communicates exclusively through versioned REST endpoints.
- **JWT sessions**: Stateless authentication via short-lived JWTs (15 min access token + 7-day refresh token) stored in `httpOnly` cookies. This avoids shared server-side session state, which aids horizontal scaling.
- **TipTap (ProseMirror-based) editor**: Open-source, extensible rich-text editor with built-in support for all required formatting features and a well-tested keyboard shortcut system.
- **PostgreSQL**: Relational integrity between users, articles, and image metadata. JSONB column for article body content (stored as TipTap's JSON document format), allowing rich queries while preserving document structure.
- **MinIO for local object storage**: MinIO is an S3-compatible object storage server that runs as a Docker container. It exposes the same AWS S3 API, so the Image Service code does not change between local dev and production — only the endpoint URL and credentials differ (via environment variables). This eliminates any dependency on a real AWS account to develop and test locally.
- **Docker Compose for local orchestration**: All services (frontend dev server, backend API, PostgreSQL, MinIO) are defined in `docker-compose.yml`. A single `make dev` spins up the full stack.
- **Makefile as developer interface**: Three primary targets — `make dev` (start all services), `make build` (production build), `make test` (run full test suite). Keeps the developer workflow consistent and discoverable.
- **Horizontal scaling via stateless API**: Because sessions are JWT-based and article state is in PostgreSQL, multiple API instances can run behind a load balancer without sticky sessions.

---

## Diagrams

Sequence diagrams covering all seven user stories in the requirements.

---

### Req 1 — User Authentication (Login Flow)

```mermaid
sequenceDiagram
    actor Visitor
    participant AuthPage as AuthPage (React)
    participant API as Backend API
    participant AuthSvc as Auth Service
    participant DB as PostgreSQL

    Visitor->>AuthPage: Enter username + password, click Login
    AuthPage->>API: POST /api/auth/login {username, password}
    API->>AuthSvc: validate credentials

    AuthSvc->>DB: SELECT user WHERE username = ?
    DB-->>AuthSvc: user row (or empty)

    alt Valid credentials
        AuthSvc->>AuthSvc: bcrypt.compare(password, hash) ✓
        AuthSvc->>DB: INSERT refresh_token (hashed, expires 7d)
        DB-->>AuthSvc: ok
        AuthSvc-->>API: {accessToken (15 min), refreshToken (7d)}
        API-->>AuthPage: 200 OK, set httpOnly cookies
        AuthPage->>Visitor: Redirect → /dashboard
    else Invalid credentials
        AuthSvc->>AuthSvc: bcrypt.compare fails OR user not found
        AuthSvc-->>API: authentication failure
        API-->>AuthPage: 401 "Invalid username or password"
        AuthPage->>Visitor: Show generic error (no field hint)
    end
```

---

### Req 2 — Article Creation

```mermaid
sequenceDiagram
    actor User
    participant Dashboard as Dashboard (React)
    participant API as Backend API
    participant MW as JWT Middleware
    participant ArticleSvc as Article Service
    participant DB as PostgreSQL
    participant Editor as ArticleEditor (React)

    User->>Dashboard: Click "New Article"
    Dashboard->>API: POST /api/articles (Bearer token)
    API->>MW: validate JWT
    MW-->>API: userId attached

    API->>ArticleSvc: create article for userId

    alt Creation succeeds
        ArticleSvc->>DB: INSERT articles (user_id, title='', body={}, status='draft')
        DB-->>ArticleSvc: new article row
        ArticleSvc-->>API: article {id, title, body, user_id}
        API-->>Dashboard: 201 Created {articleId}
        Dashboard->>Editor: navigate to /articles/:id/edit
        Editor->>User: Display blank title field + TipTap canvas
    else Creation fails
        ArticleSvc-->>API: 500 error
        API-->>Dashboard: 500 Internal Server Error
        Dashboard->>User: Show error message, stay on dashboard
    end
```

---

### Req 3 — Rich Text Editing (Formatting Flow)

```mermaid
sequenceDiagram
    actor User
    participant Editor as ArticleEditor
    participant TipTap as TipTap ProseMirror

    User->>Editor: Select text range in body
    User->>Editor: Click Bold in toolbar or press Ctrl+B
    Editor->>TipTap: toggleMark bold on selection

    alt Text not already bold
        TipTap->>TipTap: Apply bold mark to selected nodes only
        TipTap-->>Editor: Updated document, selected text is bold
        Editor->>User: Selected text renders bold, rest unchanged
    else Text already bold, toggle off
        TipTap->>TipTap: Remove bold mark from selected nodes only
        TipTap-->>Editor: Updated document, bold removed
        Editor->>User: Selected text renders plain, rest unchanged
    end

    Note over User,TipTap: Same flow applies for italic, underline, code, H1, H2, H3, blockquote, OL, UL

    User->>Editor: Select text, click Hyperlink or press Ctrl+K
    Editor->>User: Prompt Enter URL
    User->>Editor: Submit URL string

    alt Valid HTTP or HTTPS URL
        Editor->>TipTap: setLink href on selection
        TipTap-->>Editor: Link mark applied
        Editor->>User: Selected text rendered as hyperlink
    else Invalid URL
        Editor->>Editor: validateHyperlinkUrl returns false
        Editor->>User: Show validation error, document unchanged
    end
```

---

### Req 4 — Article Editing and Saving (including Auto-Save)

```mermaid
sequenceDiagram
    actor User
    participant Editor as ArticleEditor
    participant Timer as Auto-Save Timer
    participant API as Backend API
    participant ArticleSvc as Article Service
    participant DB as PostgreSQL

    User->>Editor: Open existing article
    Editor->>API: GET /api/articles/:id with Bearer token
    API->>ArticleSvc: fetch article with owner check
    ArticleSvc->>DB: SELECT article WHERE id and user_id match

    alt Article owned by user
        DB-->>ArticleSvc: article row
        ArticleSvc-->>API: article data
        API-->>Editor: 200 with id, title, body
        Editor->>Editor: Load title and body into TipTap canvas
    else Article not owned by user
        DB-->>ArticleSvc: no rows
        ArticleSvc-->>API: not found
        API-->>Editor: 404
        Editor->>User: Show access denied error
    end

    User->>Editor: Type in title or body
    Editor->>Timer: Reset inactivity clock
    Timer-->>Editor: 30s elapsed, trigger auto-save
    Editor->>API: PATCH /api/articles/:id with title and body
    API->>ArticleSvc: update article
    ArticleSvc->>DB: UPDATE articles SET title, body, updated_at

    alt Save succeeds
        DB-->>ArticleSvc: ok
        ArticleSvc-->>API: 200 updated article
        API-->>Editor: 200 OK
        Editor->>User: Show Saved indicator for 3s
    else Save fails due to network error
        API-->>Editor: network error or 5xx
        Editor->>User: Show retry error, retain unsaved changes
    end

    User->>Editor: Attempt to close or navigate away with unsaved changes
    Editor->>User: Confirm dialog, discard unsaved changes?

    alt User confirms discard
        Editor->>Editor: Discard local changes
        Editor->>User: Navigate away
    else User cancels
        Editor->>User: Return to editor with changes intact
    end
```

---

### Req 5 — Image Management (Upload Flow including Error Cases)

```mermaid
sequenceDiagram
    actor User
    participant Editor as ArticleEditor
    participant Plugin as ImageUploadPlugin
    participant API as Backend API
    participant ImageSvc as Image Service
    participant DB as PostgreSQL
    participant MinIO as MinIO S3

    User->>Editor: Click image insert button in toolbar
    Editor->>Plugin: triggerImageInsert
    Plugin->>User: Open file picker
    User->>Plugin: Select file
    Plugin->>Plugin: Check file size and MIME type

    alt File exceeds 10 MB
        Plugin-->>Editor: Reject oversized file
        Editor->>User: Error, file exceeds the 10 MB maximum
    else Unsupported format
        Plugin-->>Editor: Reject unsupported format
        Editor->>User: Error, accepted formats are JPEG PNG GIF WebP
    else Valid file, size ok and MIME accepted
        Plugin->>API: POST /api/images multipart with Bearer token
        API->>ImageSvc: validate and upload

        alt S3 upload succeeds within 10s
            ImageSvc->>MinIO: PUT object
            MinIO-->>ImageSvc: object key and public URL
            ImageSvc->>DB: INSERT article_images record
            DB-->>ImageSvc: ok
            ImageSvc-->>API: 200 with url
            API-->>Plugin: url
            Plugin->>Editor: Insert image node at cursor with src url
            Editor->>User: Image renders inline in article body
        else S3 timeout or error
            ImageSvc-->>API: 502 error
            API-->>Plugin: 502 image upload failed
            Plugin->>Editor: No document change
            Editor->>User: Show upload failure error, article body unchanged
        end
    end

    User->>Editor: Delete embedded image from body
    Editor->>Plugin: removeImageNode
    Plugin->>Editor: Delete image node from TipTap document
    Editor->>User: Image removed from canvas and article body
```

---

### Req 6 — Multiple Articles / Dashboard (List, Open, Delete)

```mermaid
sequenceDiagram
    actor User
    participant Dashboard as Dashboard React
    participant API as Backend API
    participant ArticleSvc as Article Service
    participant DB as PostgreSQL
    participant Editor as ArticleEditor React

    User->>Dashboard: Navigate to /dashboard
    Dashboard->>API: GET /api/articles?page=1&limit=20 with Bearer token
    API->>ArticleSvc: list articles for userId page 1
    ArticleSvc->>DB: SELECT articles WHERE user_id ORDER BY updated_at DESC LIMIT 20
    DB-->>ArticleSvc: articles array and total count
    ArticleSvc-->>API: articles, total, page, pages
    API-->>Dashboard: 200 paginated list
    Dashboard->>User: Render article list sorted by last modified

    alt More than 20 articles exist
        Dashboard->>User: Show pagination controls
        User->>Dashboard: Click page 2
        Dashboard->>API: GET /api/articles?page=2&limit=20
        API-->>Dashboard: 200 next page
        Dashboard->>User: Render page 2 articles
    end

    User->>Dashboard: Click article row to open
    Dashboard->>API: GET /api/articles/:id with Bearer token
    API->>ArticleSvc: fetch article with owner check
    ArticleSvc->>DB: SELECT article WHERE id and user_id match
    DB-->>ArticleSvc: article row
    ArticleSvc-->>API: article data
    API-->>Dashboard: 200 article
    Dashboard->>Editor: Navigate to article editor within 2s

    User->>Dashboard: Click Delete on an article
    Dashboard->>User: Confirm delete this article?
    User->>Dashboard: Confirm delete

    Dashboard->>API: DELETE /api/articles/:id with Bearer token
    API->>ArticleSvc: delete article

    alt Deletion succeeds
        ArticleSvc->>DB: DELETE article WHERE id and user_id match
        DB-->>ArticleSvc: ok, cascade deletes article_images
        ArticleSvc->>ArticleSvc: Enqueue async MinIO object cleanup
        ArticleSvc-->>API: 200 ok
        API-->>Dashboard: 200
        Dashboard->>User: Article removed from list within 5s
    else Deletion fails
        ArticleSvc-->>API: 500 error
        API-->>Dashboard: 500
        Dashboard->>User: Show error, article retained in list
    end
```

---

### Req 7 — Concurrent Multi-User Support (Two Users Saving Simultaneously)

```mermaid
sequenceDiagram
    actor U1 as User 1
    actor U2 as User 2
    participant API as Backend API
    participant MW as JWT Middleware
    participant ArticleSvc as Article Service
    participant DB as PostgreSQL

    Note over U1,DB: User 1 and User 2 each own separate articles.<br/>Both begin saving at the same time.

    par User 1 saves Article A1
        U1->>API: PATCH /api/articles/A1 {title, body} (JWT for U1)
        API->>MW: validate JWT → userId = U1
        MW->>ArticleSvc: update A1 for U1
        ArticleSvc->>DB: UPDATE articles SET body=? WHERE id='A1' AND user_id='U1'
    and User 2 saves Article A2
        U2->>API: PATCH /api/articles/A2 {title, body} (JWT for U2)
        API->>MW: validate JWT → userId = U2
        MW->>ArticleSvc: update A2 for U2
        ArticleSvc->>DB: UPDATE articles SET body=? WHERE id='A2' AND user_id='U2'
    end

    DB-->>ArticleSvc: A1 updated (U1's content)
    ArticleSvc-->>API: 200 A1 saved
    API-->>U1: 200 OK "Saved" indicator shown

    DB-->>ArticleSvc: A2 updated (U2's content)
    ArticleSvc-->>API: 200 A2 saved
    API-->>U2: 200 OK "Saved" indicator shown

    Note over U1,DB: A1 contains only U1's changes.<br/>A2 contains only U2's changes.<br/>No cross-contamination.

    Note over U1,DB: If >100 concurrent users, requests are queued.<br/>Queued requests respond within 10 s.<br/>If queue timeout exceeded → 503 "Service temporarily unavailable."
```

---

## Local Development Setup

### Docker Compose Services

```yaml
# docker-compose.yml (summary)
services:
  frontend:      # React dev server (Vite), port 3000
  api:           # Node.js/Express, port 4000, hot-reload via nodemon
  db:            # PostgreSQL 16, port 5432, data persisted in named volume
  minio:         # MinIO object storage, API port 9000, console port 9001
  minio-init:    # One-shot container: creates the 'blog-images' bucket on first run
```

- The `api` service connects to `db` and `minio` over the internal Docker network using service-name hostnames (`db:5432`, `minio:9000`).
- MinIO credentials in dev are fixed to `minioadmin / minioadmin` via environment variables.
- The `STORAGE_ENDPOINT` environment variable on the `api` service controls whether to point at MinIO (local) or a real S3 endpoint (production). No code change is required to switch.
- Database migrations run automatically on `api` startup using a migration tool (e.g., `node-postgres-migrate` or `Knex` migrations).

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make dev` | `docker compose up --build` — starts all services with hot-reload |
| `make build` | Builds production Docker images for `frontend` and `api` |
| `make test` | Runs the full test suite (unit + property-based) inside the `api` and `frontend` containers |
| `make test-integration` | Brings up the Compose stack and runs integration tests against live services |
| `make down` | `docker compose down` — stops and removes containers |
| `make logs` | Tails logs from all running Compose services |

### Environment Variables

The Image Service is configured entirely through environment variables, enabling zero-code switching between local MinIO and production S3:

| Variable | Local (dev) | Production |
|----------|------------|------------|
| `STORAGE_ENDPOINT` | `http://minio:9000` | `https://s3.amazonaws.com` |
| `STORAGE_ACCESS_KEY` | `minioadmin` | AWS access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | AWS secret key |
| `STORAGE_BUCKET` | `blog-images` | `<prod-bucket-name>` |
| `STORAGE_REGION` | `us-east-1` | AWS region |
| `STORAGE_PUBLIC_URL` | `http://localhost:9000/blog-images` | CDN / S3 public URL |

The `STORAGE_PUBLIC_URL` variable is used to construct the hosted image URLs returned to the frontend. In local dev, images are served directly from MinIO on `localhost:9000`.

---

## Components and Interfaces

### Frontend Components

#### `AuthPage`
- Renders username/password form
- On submit calls `POST /api/auth/login`
- On success stores JWT and redirects to `/dashboard`
- On failure displays error without revealing which field was wrong

#### `Dashboard`
- Fetches `GET /api/articles?page=N&limit=20` for the authenticated user
- Renders paginated article list sorted by `updated_at` descending
- Provides "New Article", "Edit", and "Delete" actions per row

#### `ArticleEditor`
- Hosts the TipTap editor instance
- Title field: plain-text `<input>` bound to article title, max 200 chars
- Body field: TipTap editor canvas
- Toolbar: bold, italic, underline, code, H1/H2/H3, blockquote, OL, UL, hyperlink, image insert
- Auto-save timer: triggers `PATCH /api/articles/:id` every 30 s while editing activity detected
- Unsaved-changes guard: beforeunload + React Router navigation block
- "Saved" indicator: non-overlapping toast that auto-dismisses after 3 s

#### `ImageUploadPlugin` (TipTap extension)
- Intercepts image insertion
- Posts file to `POST /api/images`
- On success inserts an image node at cursor with the returned URL
- On error (size/format/timeout) surfaces error message without modifying document

### Backend Services

#### Auth Service (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Validate credentials, issue JWT access + refresh tokens |
| POST | `/api/auth/refresh` | Exchange valid refresh token for new access token |
| POST | `/api/auth/logout` | Invalidate refresh token, clear cookies |

- Password hashed with bcrypt (cost factor 12)
- Returns identical error messages for wrong username or wrong password (no field enumeration)
- JWT payload: `{ sub: userId, iat, exp }`

#### Article Service (`/api/articles`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | List user's articles, paginated (`page`, `limit`) |
| POST | `/api/articles` | Create new blank article |
| GET | `/api/articles/:id` | Fetch single article (owner-only) |
| PATCH | `/api/articles/:id` | Update title and/or body (owner-only) |
| DELETE | `/api/articles/:id` | Delete article and associated images (owner-only) |

- All endpoints require valid JWT via `JWT Middleware`
- Owner check: `WHERE id = :id AND user_id = :userId`
- Save SLA: PATCH must complete within 2 s; guarded by a DB write timeout
- Delete cascades to `article_images` table; MinIO/S3 object deletion is async (enqueued)

#### Image Service (`/api/images`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/images` | Upload image, return hosted URL |

- Accepts multipart/form-data
- Validates: file size ≤ 10 MB, MIME type in `{image/jpeg, image/png, image/gif, image/webp}`
- On validation failure: 400 with descriptive message
- On S3 upload success: returns `{ url: "https://..." }`
- On S3 timeout/error: returns 502 with error payload
- Stores image metadata in `article_images` after successful upload
- Uses the S3-compatible AWS SDK client; `STORAGE_ENDPOINT` points to MinIO in local dev and real S3 in production

#### JWT Middleware
- Validates `Authorization: Bearer <token>` header or `access_token` httpOnly cookie
- On invalid/expired token: 401
- Attaches `req.userId` for downstream handlers

---

## Data Models

### PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,     -- bcrypt hash
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens (for session management)
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,       -- SHA-256 of the raw refresh token
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articles
CREATE TABLE articles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL DEFAULT '',
    body        JSONB NOT NULL DEFAULT '{}', -- TipTap JSON document
    status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_user_updated ON articles(user_id, updated_at DESC);

-- Image metadata
CREATE TABLE article_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id  UUID REFERENCES articles(id) ON DELETE SET NULL,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key VARCHAR(512) NOT NULL,       -- S3 object key
    url         TEXT NOT NULL,               -- Public / pre-signed URL
    size_bytes  BIGINT NOT NULL,
    mime_type   VARCHAR(64) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### TipTap Document Format (JSONB body)

Article bodies are stored as TipTap's native JSON document tree, e.g.:

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Hello" }] },
    { "type": "paragraph", "content": [
      { "type": "text", "marks": [{ "type": "bold" }], "text": "Bold text" }
    ]}
  ]
}
```

Storing as JSONB preserves the full document structure without requiring a custom serialization format, and allows future server-side content queries.

### Session / JWT Claims

```json
{
  "sub": "<userId UUID>",
  "iat": 1700000000,
  "exp": 1700000900
}
```

Access token TTL: 15 minutes. Refresh token TTL: 7 days, stored hashed in `refresh_tokens`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Authentication Error Indistinguishability

*For any* combination of (username, password) that fails authentication — whether the username is unknown, the password is wrong, or both — the error message returned by the Auth_Service SHALL be identical and SHALL NOT reference which specific field caused the failure.

**Validates: Requirements 1.2**

---

### Property 2: Active Session Grants Uninterrupted Access

*For any* freshly issued, non-expired JWT, every protected API endpoint SHALL respond with a non-401 status code when that token is presented, without requiring the user to re-authenticate.

**Validates: Requirements 1.3**

---

### Property 3: Article Creation Invariants

*For any* authenticated user, creating a new article SHALL produce an article whose title is empty, whose body is empty, and whose `user_id` equals exactly the creating user's ID.

**Validates: Requirements 2.1, 2.5**

---

### Property 4: Multiple Articles Per User

*For any* authenticated user and any integer N > 1, creating N distinct articles for that user SHALL result in all N articles being retrievable from that user's article list.

**Validates: Requirements 2.6**

---

### Property 5: Formatting Scoped to Selection

*For any* TipTap document and *for any* selection range within it, applying an inline or block format SHALL modify only the nodes within the selection and leave all text outside the selection unchanged.

**Validates: Requirements 3.3**

---

### Property 6: Formatting Toggle (Round-Trip)

*For any* text node in a TipTap document that has a format F applied, applying format F a second time SHALL remove format F from that text, returning the node to its pre-formatted state.

**Validates: Requirements 3.5**

---

### Property 7: Hyperlink URL Validation

*For any* string that is not a valid HTTP or HTTPS URL (i.e., does not match `^https?://`), attempting to apply it as a hyperlink in the Rich_Text_Editor SHALL be rejected with a validation error, and no link SHALL be applied to the document.

**Validates: Requirements 3.7**

---

### Property 8: Article Save/Load Round-Trip

*For any* article with an arbitrary title (≤ 200 characters) and arbitrary body content, saving the article via PATCH and then loading it via GET SHALL return a title and body identical to what was saved.

**Validates: Requirements 4.1**

---

### Property 9: Article Ownership Access Control

*For any* two distinct users U1 and U2 where U1 is the owner of article A, any request by U2 to read or modify article A SHALL be denied (HTTP 403 or 404), regardless of A's content or state.

**Validates: Requirements 4.2**

---

### Property 10: Valid Image Upload Embeds in Document

*For any* image file with size in (0, 10 MB] and MIME type in `{image/jpeg, image/png, image/gif, image/webp}`, the Image_Service SHALL return a valid hosted URL, and the Rich_Text_Editor SHALL insert an image node at the cursor position containing that URL, leaving the rest of the document unchanged.

**Validates: Requirements 5.2, 5.3**

---

### Property 11: Invalid Image Upload Rejected

*For any* file that violates at least one upload constraint — size > 10 MB OR MIME type not in `{image/jpeg, image/png, image/gif, image/webp}` — the Image_Service SHALL reject the upload with a descriptive error message, and the article body SHALL remain unchanged.

**Validates: Requirements 5.4, 5.5**

---

### Property 12: Image Deletion Removes Node from Document

*For any* TipTap document containing an image node with URL U, deleting that image SHALL result in no image nodes with URL U remaining anywhere in the document's content tree.

**Validates: Requirements 5.6**

---

### Property 13: Dashboard Sort Order

*For any* authenticated user with N ≥ 1 articles having distinct `updated_at` timestamps, the dashboard article list SHALL be ordered by `updated_at` descending (most recently modified first), and SHALL contain only articles owned by that user.

**Validates: Requirements 6.1**

---

### Property 14: Dashboard Pagination Invariant

*For any* authenticated user with N > 20 articles, requesting page 1 with a page size of 20 SHALL return exactly 20 articles, and the response SHALL include pagination metadata indicating the total count and available pages.

**Validates: Requirements 6.3**

---

### Property 15: Article Deletion Consistency

*For any* article A with any number of associated image records, after a successful DELETE request for A, a subsequent GET for A SHALL return 404 and all `article_images` records associated with A SHALL be removed.

**Validates: Requirements 6.5**

---

### Property 16: Concurrent Save Isolation

*For any* two distinct users U1 and U2 each owning distinct articles A1 and A2 respectively, concurrent PATCH requests updating A1 and A2 simultaneously SHALL result in A1 containing only U1's saved content and A2 containing only U2's saved content, with no cross-contamination.

**Validates: Requirements 7.2**

---

### Property 17: Session Independence on Logout

*For any* two distinct users U1 and U2 both holding valid active JWTs, the act of U1 logging out (invalidating U1's refresh token) SHALL NOT affect the validity of U2's JWT or U2's ability to access protected endpoints.

**Validates: Requirements 7.3**

---

## Error Handling

### Authentication Errors
- Invalid credentials → HTTP 401 with a generic, field-agnostic message (e.g., "Invalid username or password")
- Expired access token → HTTP 401; client should attempt token refresh
- Expired refresh token → HTTP 401; client redirects to login

### Article Service Errors
- Article not found → HTTP 404
- Article not owned by requester → HTTP 404 (preferred over 403 to avoid existence disclosure)
- Title exceeds 200 chars → HTTP 400 with field validation message
- Save timeout → HTTP 504; client retains local unsaved state and shows retry prompt
- Create failure → HTTP 500; client shows error without navigating away

### Image Service Errors
- File size > 10 MB → HTTP 400: "File exceeds the 10 MB maximum allowed size"
- Unsupported MIME type → HTTP 400: "Unsupported file format. Accepted formats: JPEG, PNG, GIF, WebP"
- S3 timeout/error → HTTP 502: "Image upload failed. Please try again."
- In all error cases the Rich_Text_Editor leaves the article body content unchanged

### Concurrency / Overload Errors
- Service temporarily overloaded (queue full) → HTTP 503: "Service temporarily unavailable. Please try again."
- Clients should implement exponential back-off on 503 responses

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used in tandem:

- **Unit tests** cover specific examples, edge cases, integration points, and error conditions where input variation does not add diagnostic value
- **Property-based tests** verify universal correctness properties across a wide input space

### Property-Based Testing

The project uses **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript/TypeScript) for all property-based tests, integrated with **Vitest** as the test runner.

Each property test:
- Runs a minimum of **100 iterations** (configured via `{ numRuns: 100 }`)
- Is tagged with a comment referencing the design property it validates:
  ```ts
  // Feature: blog-application, Property 8: Article Save/Load Round-Trip
  ```
- Targets pure business logic functions or mocked service boundaries (no live database or S3 calls in property tests)

Properties to implement as property-based tests:

| Property | Test Focus | Mocking Strategy |
|----------|-----------|-----------------|
| 1 – Error Indistinguishability | `authService.login()` return values | In-memory user store |
| 2 – Active Session Access | JWT validation middleware | In-memory token |
| 3 – Article Creation Invariants | `articleService.create()` return value | In-memory repo |
| 4 – Multiple Articles Per User | `articleService.list()` after N creates | In-memory repo |
| 5 – Formatting Scoped to Selection | TipTap document transform functions | No mocking (pure) |
| 6 – Formatting Toggle | TipTap mark toggle functions | No mocking (pure) |
| 7 – URL Validation | `validateHyperlinkUrl()` utility | No mocking (pure) |
| 8 – Article Round-Trip | `articleService.update()` + `.get()` | In-memory repo |
| 9 – Ownership Access Control | `articleService.get()` ownership check | In-memory repo |
| 10 – Valid Upload Embeds | `imageService.upload()` + editor insert | Mock S3 client |
| 11 – Invalid Upload Rejected | `imageService.validate()` | No mocking (pure) |
| 12 – Image Deletion from Document | TipTap image node deletion | No mocking (pure) |
| 13 – Dashboard Sort Order | `articleService.list()` ordering | In-memory repo |
| 14 – Pagination Invariant | `articleService.list()` pagination | In-memory repo |
| 15 – Delete Consistency | `articleService.delete()` cascade | In-memory repo |
| 16 – Concurrent Save Isolation | Concurrent `articleService.update()` | In-memory repo with async sim |
| 17 – Session Independence | `authService.logout()` side effects | In-memory token store |

### Unit / Example-Based Tests

Cover:
- All happy-path CRUD flows with concrete data
- Each formatting type (bold, italic, underline, code, H1–H3, blockquote, OL, UL, hyperlinks)
- Each keyboard shortcut binding
- Auto-save timer triggering at 30 s with edit activity detected
- "Saved" indicator appearance and 3 s auto-dismiss
- Unsaved-changes confirmation dialog (confirm discards, cancel returns to editor)
- Image upload UI (file picker appears, success inserts image, all error states)
- Delete failure retains article data and shows error

### Integration Tests

Cover:
- End-to-end authentication flow (login → access protected route → logout)
- Article save latency ≤ 2 s with realistic payload sizes
- Article load from dashboard within 2 s
- Dashboard first-page load with 1,000 articles seeded ≤ 3 s
- Image upload to local MinIO instance (via `make test-integration`) and URL retrieval within 10 s
- All integration tests run against the full Docker Compose stack (`make test-integration`)

### Load Tests

- 100 concurrent users performing mixed operations (login, dashboard load, article save, image upload)
- P95 response time ≤ 3 s for all operations
- Overload scenario (>100 concurrent) returns responses within 10 s (not immediate errors)
