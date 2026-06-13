# Task 07 — Article Dashboard UI

## Background

The Dashboard is the primary landing page after login. It lists all of the user's articles sorted by last modified, supports pagination, and provides entry points to create, open, and delete articles.

## User Story

As a User, I want to manage multiple articles from a dashboard, so that I can maintain a portfolio of content over time.

## Tasks

- [ ] Create `Dashboard` component that fetches `GET /api/articles?page=1&limit=20` on mount
- [ ] Render article list sorted by `updated_at` descending, showing title and last-modified date
- [ ] Show a "No articles yet" empty state when the list is empty
- [ ] Implement "New Article" button that calls `POST /api/articles` and navigates to the editor on success
- [ ] Show an error toast if article creation fails, without navigating away
- [ ] Implement pagination controls when total articles exceed 20 — show current page and navigate between pages
- [ ] Implement "Open" / row click to navigate to `/articles/:id/edit`
- [ ] Implement "Delete" button per article row with a confirmation dialog before calling `DELETE /api/articles/:id`
- [ ] On successful delete, remove article from the list without a full page reload
- [ ] On failed delete, show error message and retain the article in the list
- [ ] Show a loading skeleton while articles are being fetched

## Testing and Verification

### Unit Tests
- Dashboard renders article list with title and last-modified date for each item
- Articles are displayed in `updated_at` descending order
- Empty state renders "No articles yet" when list is empty
- "New Article" button calls `POST /api/articles`
- Article creation failure shows error toast and dashboard remains visible
- Pagination controls appear only when total exceeds 20
- Clicking a page number fetches the correct page from the API
- "Delete" button shows a confirmation dialog before proceeding
- Confirmed delete calls `DELETE /api/articles/:id` and removes the item from the list
- Failed delete shows error message and retains article in list

### Integration Tests
- Dashboard load with 25 seeded articles shows 20 on page 1 with pagination controls
- Clicking page 2 fetches and displays the remaining 5 articles
- Creating a new article navigates to the editor and the article appears on the dashboard when returning
- Deleting an article removes it from the dashboard and from the database

## Dependencies

### Internal
- TASK-04 (Article CRUD API)
- TASK-06 (AuthContext and ProtectedRoute)

### External
- React Router v6
- Vitest + React Testing Library

## Open Questions

None

## Acceptance Criteria

1. Dashboard displays all articles owned by the authenticated user, sorted by last-modified descending
2. Pagination controls appear and function correctly when more than 20 articles exist
3. "New Article" creates an article and navigates to the editor; creation failure shows an error without navigating
4. Deleting an article requires confirmation, removes it from the list on success, and shows an error on failure
5. Dashboard loads within 3 seconds with up to 1,000 articles seeded (first page only)

## Relative Estimation

5 points

## Special Notes

- Use optimistic UI for delete: remove the item immediately from the list and restore it if the API call fails
- Article titles that are still empty (blank) should display as "Untitled" in the dashboard list
