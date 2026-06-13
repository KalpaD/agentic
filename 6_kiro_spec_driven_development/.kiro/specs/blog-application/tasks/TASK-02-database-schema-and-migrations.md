# Task 02 — Database Schema and Migrations

## Background

The application needs a well-defined relational schema to store users, refresh tokens, articles, and image metadata. This task sets up the migration tooling and creates the initial schema. All backend service tasks depend on this being in place.

## User Story

As a developer, I want a versioned database migration system, so that schema changes are reproducible and the database is automatically initialised on `make dev`.

## Tasks

- [ ] Add Knex.js (or equivalent migration tool) as a dependency to the `api` project
- [ ] Configure Knex to connect to PostgreSQL using environment variables
- [ ] Create migration: `users` table (id UUID, username, password_hash, created_at)
- [ ] Create migration: `refresh_tokens` table (id, user_id FK, token_hash, expires_at, created_at)
- [ ] Create migration: `articles` table (id, user_id FK, title VARCHAR(200), body JSONB, status, created_at, updated_at)
- [ ] Create index: `idx_articles_user_updated` on `(user_id, updated_at DESC)`
- [ ] Create migration: `article_images` table (id, article_id FK, user_id FK, storage_key, url, size_bytes, mime_type, uploaded_at)
- [ ] Configure `api` startup to run pending migrations automatically on boot
- [ ] Add `make migrate` and `make migrate-rollback` targets to Makefile for manual control
- [ ] Write seed script for local dev: create 2 test users with known credentials

## Testing and Verification

### Unit Tests
- Migration rollback: verify each migration's `down` function restores the previous schema state

### Integration Tests
- After `make dev`, all 4 tables exist in PostgreSQL with correct columns and constraints
- `article_images.article_id` ON DELETE SET NULL cascade behaves correctly when an article is deleted
- `articles.user_id` ON DELETE CASCADE removes all articles when a user is deleted
- `refresh_tokens.user_id` ON DELETE CASCADE removes tokens when a user is deleted
- Seed script creates 2 test users accessible with known credentials

## Dependencies

### Internal
- TASK-01 (Docker Compose stack must be running)

### External
- Knex.js (or chosen migration library)
- `pg` Node.js PostgreSQL driver

## Open Questions

None

## Acceptance Criteria

1. Running `make dev` on a fresh database applies all migrations automatically
2. All 4 tables exist with the correct columns, types, constraints, and foreign keys
3. The `idx_articles_user_updated` index exists on the `articles` table
4. `make migrate-rollback` reverses the last migration cleanly
5. Seed data creates 2 test users with known usernames and passwords

## Relative Estimation

3 points

## Special Notes

- Store `updated_at` as `TIMESTAMPTZ` and update it automatically via a trigger or ORM hook on every `UPDATE` to the `articles` table
- The `body` JSONB column should default to an empty TipTap document `{"type":"doc","content":[]}` rather than `{}`
