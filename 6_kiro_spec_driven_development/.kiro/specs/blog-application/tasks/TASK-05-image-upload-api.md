# Task 05 — Image Upload API

## Background

The Image Service handles file uploads from the editor, validates them, stores them in MinIO (local) or S3 (production), and returns a hosted URL that the editor embeds inline. The service is entirely environment-variable driven so no code changes are needed to switch from MinIO to S3.

## User Story

As a User, I want to add images to my articles, so that I can illustrate my content visually.

## Tasks

- [ ] Implement `POST /api/images` — accept `multipart/form-data` with a single file field
- [ ] Validate file size: reject files larger than 10 MB with HTTP 400 and descriptive message
- [ ] Validate MIME type: accept only `image/jpeg`, `image/png`, `image/gif`, `image/webp`; reject others with HTTP 400 listing accepted formats
- [ ] Upload valid file to MinIO/S3 using AWS SDK v3 with endpoint from `STORAGE_ENDPOINT` env var
- [ ] On successful upload, insert record into `article_images` table (storage_key, url, size_bytes, mime_type, user_id)
- [ ] Return `{ url: "<STORAGE_PUBLIC_URL>/<bucket>/<key>" }` on success
- [ ] Return HTTP 502 on S3/MinIO timeout or error
- [ ] Configure upload timeout: abort S3 upload after 10 s and return 502
- [ ] Apply JWT middleware to `POST /api/images`

## Testing and Verification

### Unit Tests
- `validate()` accepts files with size 1 byte through 10 MB and MIME types jpeg/png/gif/webp (Property 10 — valid cases)
- `validate()` rejects files larger than 10 MB with correct error message (Property 11)
- `validate()` rejects unsupported MIME types with message listing all accepted formats (Property 11)
- `validate()` rejects files that are both oversized and wrong format — error references size constraint
- S3 client mock: on success, `upload()` returns the correct public URL
- S3 client mock: on timeout, `upload()` throws and service returns 502

### Integration Tests
- `POST /api/images` with a valid JPEG under 10 MB uploads to MinIO and returns a reachable public URL
- The returned URL is accessible via HTTP (MinIO serves the object)
- `article_images` record is created in the database with correct metadata
- `POST /api/images` with a 10.1 MB file returns 400 with size error message
- `POST /api/images` with a `.txt` file returns 400 listing accepted image formats
- `POST /api/images` without a valid JWT returns 401

## Dependencies

### Internal
- TASK-01 (Docker Compose stack with MinIO running)
- TASK-02 (article_images table)
- TASK-03 (JWT middleware)

### External
- `@aws-sdk/client-s3` (AWS SDK v3 — works with MinIO via custom endpoint)
- `multer` (multipart/form-data parsing and size limiting)

## Open Questions

None

## Acceptance Criteria

1. `POST /api/images` with a valid file returns 200 with `{ url: "..." }` pointing to a publicly accessible object
2. Files exceeding 10 MB are rejected with HTTP 400 and a message stating the maximum allowed size
3. Files with unsupported MIME types are rejected with HTTP 400 listing JPEG, PNG, GIF, WebP
4. S3/MinIO timeout or error returns HTTP 502
5. In all error cases, no `article_images` record is created in the database

## Relative Estimation

5 points

## Special Notes

- Use `multer`'s `limits.fileSize` to reject oversized files before they are fully buffered in memory
- Generate a unique S3 object key using `uuid` + original file extension — never use the user-supplied filename directly to avoid path traversal
- `STORAGE_PUBLIC_URL` must be set correctly in `.env` for returned URLs to be accessible from the browser in local dev (`http://localhost:9000/blog-images`)
