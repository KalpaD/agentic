# Task 10 — Image Upload UI (TipTap Plugin)

## Background

The ImageUploadPlugin extends TipTap to allow users to insert images inline within the article body. It handles file selection, client-side pre-validation, upload to the Image API, and embedding the returned URL at the cursor position — all without modifying the document on failure.

## User Story

As a User, I want to add images to my articles, so that I can illustrate my content visually.

## Tasks

- [ ] Create a custom TipTap extension `ImageUploadPlugin` that adds an image insert action to the editor
- [ ] Add an "Insert Image" button to the `ArticleEditor` toolbar that triggers the file picker
- [ ] On file selection, pre-validate on the client: file size must be <= 10 MB and MIME type must be in `{image/jpeg, image/png, image/gif, image/webp}`
- [ ] Show appropriate client-side error messages for oversized files and unsupported formats before any upload is attempted
- [ ] For valid files, call `POST /api/images` with the file as `multipart/form-data`
- [ ] Show an inline loading indicator in the editor while the upload is in progress
- [ ] On success, insert a TipTap image node at the current cursor position with `src` set to the returned URL
- [ ] On API error (400, 502, network failure), display an error message and leave the document unchanged
- [ ] Implement image deletion: when a user deletes an image node in the editor, remove it from the TipTap document (Property 12)

## Testing and Verification

### Unit Tests
- Selecting a valid JPEG under 10 MB triggers `POST /api/images`
- Selecting a file over 10 MB shows size error message without calling the API (Property 11)
- Selecting a `.bmp` file shows format error listing JPEG, PNG, GIF, WebP without calling the API (Property 11)
- On successful API response, image node is inserted at cursor with the correct `src` URL and document is otherwise unchanged (Property 10)
- On 502 API response, no image node is inserted and document remains unchanged
- On network failure, no image node is inserted and error message is shown
- Deleting an image node removes it from the document — no image node with that URL remains (Property 12)

### Integration Tests
- Selecting a valid PNG, clicking insert, and saving the article — reloading shows the image embedded in the body
- The image URL returned by the API is accessible in the browser (MinIO serving the object)
- Selecting a 10.1 MB file shows the size error and does not upload

## Dependencies

### Internal
- TASK-05 (Image Upload API)
- TASK-08 (ArticleEditor and TipTap setup)

### External
- `@tiptap/extension-image` (base image node)

## Open Questions

None

## Acceptance Criteria

1. Valid images (JPEG/PNG/GIF/WebP, <= 10 MB) are uploaded and embedded inline at the cursor position
2. Oversized files are rejected client-side before upload with a message stating the 10 MB limit
3. Unsupported file formats are rejected client-side with a message listing accepted formats
4. API errors (400, 502, network failure) display an error message and leave the article body unchanged
5. Deleting an embedded image from the editor removes it from the document content

## Relative Estimation

5 points

## Special Notes

- Pre-validate on the client for a better UX — but the API also validates server-side; client validation does not replace server-side validation
- Show a spinner or placeholder at the cursor while the upload is in progress so the user knows something is happening
- The `ImageUploadPlugin` should use a hidden `<input type="file">` element triggered programmatically, rather than a drag-and-drop zone, to keep the implementation simple for MVP
