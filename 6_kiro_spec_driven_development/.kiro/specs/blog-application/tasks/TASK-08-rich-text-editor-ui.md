# Task 08 — Rich Text Editor UI

## Background

The ArticleEditor is the core user-facing feature of the application. It provides a full-page TipTap-based editing canvas with inline and block formatting, keyboard shortcuts, and a floating or fixed toolbar. The editor must support all formatting types required by the spec.

## User Story

As a User, I want a rich text editor for authoring articles, so that I can format my content with headings, emphasis, lists, and other typographic styles similar to Medium.

## Tasks

- [ ] Install and configure TipTap with the required extensions: `StarterKit`, `Underline`, `Link`, `Image`
- [ ] Create `ArticleEditor` component with a plain-text title `<input>` (max 200 chars) and a TipTap editor canvas below
- [ ] Implement toolbar with buttons for: Bold, Italic, Underline, Inline Code, H1, H2, H3, Blockquote, Ordered List, Unordered List, Hyperlink, Image Insert
- [ ] Wire keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline), Ctrl+K (hyperlink), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- [ ] Implement formatting toggle: applying the same format twice removes it (relies on TipTap's built-in toggle behaviour)
- [ ] Implement hyperlink insertion: on Ctrl+K or toolbar click, prompt user for a URL; validate it is a valid HTTP/HTTPS URL before applying; show validation error if invalid
- [ ] Render all formatted content visually in the editor without showing raw markup
- [ ] Load existing article content on mount: populate title input and TipTap editor from article data
- [ ] Update title in local state on every keystroke (debounced display, within 500 ms)

## Testing and Verification

### Unit Tests
- Editor renders title input and TipTap canvas
- Applying bold to selected text makes it bold; applying bold again removes it (Property 6)
- Applying a format only modifies the selected text nodes, leaving unselected text unchanged (Property 5)
- Hyperlink prompt accepts a valid `https://example.com` URL and applies the link
- Hyperlink prompt rejects a string that is not a valid HTTP/HTTPS URL and shows a validation error (Property 7)
- Hyperlink prompt rejection leaves the document unchanged
- All 6 keyboard shortcuts trigger their respective TipTap commands
- Title input enforces 200-character max length

### Integration Tests
- Loading an existing article populates the title input and editor body with saved content
- Applying each of the 11 formatting types renders correctly in the editor canvas
- Undo (Ctrl+Z) reverses the last formatting action
- Redo (Ctrl+Shift+Z) reapplies the reversed action

## Dependencies

### Internal
- TASK-04 (Article CRUD API — GET to load content)
- TASK-06 (AuthContext)

### External
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-image`
- Vitest + React Testing Library

## Open Questions

None

## Acceptance Criteria

1. All 5 inline formats (bold, italic, underline, inline code, hyperlink) and 6 block formats (H1, H2, H3, blockquote, OL, UL) are available from the toolbar
2. Each format toggles off when applied to already-formatted text
3. Keyboard shortcuts Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+Z, Ctrl+Shift+Z all work correctly
4. Hyperlink insertion validates the URL and shows an error for non-HTTP/HTTPS strings without modifying the document
5. Formatted content renders visually in the editor without showing markup

## Relative Estimation

5 points

## Special Notes

- TipTap's `Link` extension should be configured with `openOnClick: false` in the editor so users can edit existing links rather than following them
- The URL validation regex should be `^https?://` — do not accept relative URLs or `ftp://`
- Consider using a floating bubble menu (TipTap `BubbleMenu`) for inline formatting to achieve a Medium-like editing feel
