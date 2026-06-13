# Task 04 — Article CRUD API

## Background

The Article Service exposes the core REST endpoints for creating, reading, updating, and deleting articles. All operations are owner-scoped — a user can only access their own articles. This is the primary data layer for the editor and dashboard.

## User Story

As a User, I want to create, edit, save, and delete my articles, so that I can manage my writing on the platform.

## Tasks

- [ ] Implement `POST /api/articles` — create new blank article (title `""`, body empty TipTap doc) owned by `req.userId`, return 201 with new article
- [ ] Implement `GET /api/articles` — list articles for `req.userId`, paginated (`page`, `limit=20`), sorted by `updated_at DESC`, return total count and page metadata
- [ ] Implement `GET /api/articles/:id` — fetch single article; return 404 if not found or not owned by `req.userId`
- [ ] Implement `PATCH /api/articles/:id` — update `title` and/or `body`; validate title max 200 chars; only allow if `user_id` matches `req.userId`; update `updated_at`; respond within 2 s
- [ ] Implement `DELETE /api/articles/:id` — delete article and cascade to `article_images` records; only allow if `user_id` matches `req.userId`; enqueue async MinIO object cleanup
- [ ] Add a DB write timeout guard on `PATCH` — return 504 if the write exceeds 2 s
- [ ] Validate all request bodies with a schema validator (e.g., Zod or Joi)

## Testing and Verification

### Unit Tests
- `create()` returns article with empty title, empty body, and `user_id` equal to the requesting user (Property 3)
- `create()` called N times for the same user produces N distinct retrievable articles (Property 4)
- `get(:id)` for an article owned by a different user returns 404 (Property 9)
- `update()` followed by `get()` returns the exact title and body that was saved (Property 8)
- `list()` returns articles sorted by `updated_at` descending (Property 13)
- `list()` with more than 20 articles returns exactly 20 on page 1 with correct pagination metadata (Property 14)
- `delete()` removes article record; subsequent `get()` returns 404 (Property 15)
- `update()` with title exceeding 200 characters returns 400

### Integration Tests
- `POST /api/articles` creates article in database with correct `user_id`
- `GET /api/articles` returns paginated list sorted by `updated_at DESC`
- `PATCH /api/articles/:id` persists updated title and body within 2 s
- `DELETE /api/articles/:id` removes article and all `article_images` records from database
- Two concurrent `PATCH` requests for different articles by different users do not overwrite each other (Property 16)

## Dependencies

### Internal
- TASK-01 (Docker Compose stack)
- TASK-02 (articles and article_images tables)
- TASK-03 (JWT middleware must be applied to all these routes)

### External
- `zod` or `joi` (request body validation)

## Open Questions

None

## Acceptance Criteria

1. `POST /api/articles` returns 201 with a new article owned by the authenticated user
2. `GET /api/articles/:id` returns 404 for articles owned by a different user
3. `PATCH /api/articles/:id` persists changes and responds within 2 seconds under normal load
4. `DELETE /api/articles/:id` removes the article and cascades to image metadata records
5. `GET /api/articles` paginates at 20 items per page and includes `total`, `page`, and `pages` in the response

## Relative Estimation

5 points

## Special Notes

- The owner check must use `WHERE id = :id AND user_id = :userId` — never fetch then check in application code, to avoid time-of-check/time-of-use issues
- Return 404 (not 403) for articles owned by another user to avoid existence disclosure
- The async MinIO cleanup on delete should be resilient — log failures but do not fail the HTTP response if S3 deletion fails
