# Task 09 — Article Save and Auto-Save

## Background

Articles must be persisted reliably — both via explicit save and via an auto-save timer that fires every 30 seconds while the user is actively editing. The editor must also guard against accidental data loss when navigating away with unsaved changes.

## User Story

As a User, I want to edit and save my articles, so that I can refine my content and preserve my changes.

## Tasks

- [ ] Implement manual save: on Ctrl+S or Save button click, call `PATCH /api/articles/:id` with current title and body
- [ ] Implement auto-save timer: every 30 seconds while the user has interacted with the editor within the last 60 seconds, trigger a save automatically
- [ ] Reset the 60-second inactivity clock on any keypress or editor interaction
- [ ] Display a "Saved" toast indicator on successful save: non-overlapping with editor canvas, auto-dismisses after 3 seconds
- [ ] Display a retry error message if save fails (network error or 5xx) — retain all unsaved content in the editor
- [ ] Implement unsaved-changes guard using React Router's `useBlocker` (or `beforeunload` event): show confirmation dialog when navigating away with unsaved changes
- [ ] Confirmation dialog: "Confirm" discards unsaved changes and navigates; "Cancel" returns to the editor with changes intact
- [ ] Track unsaved changes state: set dirty flag on any title or body edit; clear it on successful save

## Testing and Verification

### Unit Tests
- Auto-save timer fires after 30 s when editor has been interacted with within the last 60 s
- Auto-save timer does NOT fire when there has been no interaction for over 60 s
- Successful save clears the dirty flag and shows "Saved" indicator
- "Saved" indicator disappears after 3 seconds
- "Saved" indicator does not overlap the editor canvas
- Failed save retains dirty flag and shows retry error message
- Navigation guard triggers confirmation dialog when dirty flag is set
- Confirming the dialog navigates away and discards unsaved content
- Cancelling the dialog returns to the editor with content intact (Property 8 — round-trip after cancel)

### Integration Tests
- After 30 s of editing inactivity, auto-save calls `PATCH /api/articles/:id` with current content
- After a manual save, reloading the article shows the saved title and body (Property 8)
- Simulating a network error on save shows the retry message and preserves editor content

## Dependencies

### Internal
- TASK-04 (Article PATCH endpoint)
- TASK-08 (ArticleEditor component and TipTap instance)

### External
- React Router v6 `useBlocker` (navigation guard)

## Open Questions

None

## Acceptance Criteria

1. Auto-save triggers every 30 seconds while the user is actively editing (interaction within last 60 s)
2. "Saved" indicator appears on successful save, does not overlay the editor, and disappears after 3 seconds
3. A save failure retains all unsaved content in the editor and shows a retry error
4. Navigating away with unsaved changes shows a confirmation dialog; confirming discards changes, cancelling returns to the editor
5. Saving and reloading the article returns the exact same title and body that was saved

## Relative Estimation

5 points

## Special Notes

- Use `useRef` for the auto-save timer and inactivity clock to avoid stale closure issues
- The dirty flag should be set at the React state level, not derived from a diff against the last saved content, to ensure the guard works even for whitespace-only changes
- Auto-save and manual save should share the same underlying `save()` function to avoid divergent logic
