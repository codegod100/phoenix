# Implementation Plan

## IU-1: Database Layer (HIGH RISK)
**Requirements:**
- node-2b7f5e3c: board persists state in sqlite database between sessions
- node-7a4f9c3e: use sqlite database for data persistence
- node-5c8f3b9e: database file path: `data/app.db`
- node-9f6e4c2b: store columns: id, name, order_index, created_at
- node-3c8f5a9e: store cards: id, title, description, column_id, order_index, created_at
- node-8e5a3f7c: foreign key: cards.column_id -> columns.id (on delete cascade)
- node-2b9f6c4e: unique constraint: (column_id, order_index) for card ordering
- node-6e5a1c9d: cards must have created_at timestamp
- node-5e8d2a1b: default columns are "todo", "in progress", "done"
- node-5e8a3b1d: deleting column requires at least 2 columns exist (minimum 1 must remain)

**Contract:**
- Input: Database path string
- Output: Initialized SQLite database with tables, seed data
- Invariants: Foreign key constraints enforced, default columns created on first run

**Output File:** `src/generated/app/database.ts`

---

## IU-2: Data Models & Operations (HIGH RISK)
**Requirements:**
- node-4f8e2c7b: get /board returns full board state with columns and cards
- node-4d2e8a7c: card has a title (required, 1-200 chars) and optional description
- node-5c1a9f4b: cards belong to exactly one column
- node-3b8e2f7a: cards have a display order within each column
- node-8f3e2d1a: board has multiple columns (todo, in progress, done)
- node-9c4a1b8f: columns are ordered left to right
- node-1c9f6b4a: maximum 100 cards per board (performance guard)
- node-8f2c9e6b: moving card validates column exists (400 if not)
- node-4a7f3c8e: card order is 0-indexed integer, automatically rebalanced on conflicts
- node-9c5b2a7f: column order is 0-indexed integer, automatically rebalanced on conflicts
- node-7a3c9f2e: columns can be renamed but not deleted below 1 column

**Contract:**
- Input: Database instance, operation parameters
- Output: Typed data structures (Column, Card), CRUD operations
- Invariants: Order indexes maintained, validation enforced

**Output File:** `src/generated/app/models.ts`

---

## IU-3: URL Linkification (MEDIUM RISK)
**Requirements:**
- node-3a8b5c2f: `linkify(text)` converts raw urls to clickable anchor tags
- node-7e2d9b4a: `linkify()` must handle multiple urls separated by newlines as separate links
- node-1f4c7a8e: server-side uses regex literal: `/https?:\/\/[^\s<\n\r]+/gi`
- node-6b9e3d7c: client-side (regexp constructor) uses: `new regexp('https?://[^\s<\n\r]+', 'gi')`
- node-8a3e6c2b: url regex must stop at newline characters - pattern `[^\s<\n\r]+` not `[^\s<]+`
- node-2d7b5f1e: client-side regexp string escaping must use `\\n` not `\n`
- node-8c3a7f2b: urls displayed as link text must show the original unescaped url (not html entities like &amp;)
- node-2e7b4f1a: card description text must not be html-escaped when editing - textarea receives raw text
- node-5f1c8a3e: each url in a multi-line description must be independently linkified
- node-1b9f5e3d: urls in card descriptions must be rendered as clickable links at all times including after editing

**Contract:**
- Input: Raw text string with URLs
- Output: HTML string with anchor tags
- Invariants: URLs not double-escaped, newlines preserved as boundaries

**Output File:** `src/generated/app/linkify.ts`

---

## IU-4: API Layer (HIGH RISK)
**Requirements:**
- node-8b3a7f5e: post /cards creates a new card with title and optional description
- node-2c9f6a3d: patch /cards/:id updates card title/description
- node-6e1b8c5a: patch /cards/:id/move moves card to different column with new order
- node-3a7f4c8e: delete /cards/:id removes a card
- node-9f5e2b7c: post /columns creates a new column
- node-1d8a6c4f: delete /columns/:id removes a column and all its cards
- node-7c4b9f2a: patch /columns/:id/move reorders column to new position
- node-5e8a3b1d: patch /columns/:id renames a column
- node-7f3e8b2d: cards can be moved between columns via drag-and-drop
- node-9a6c4e1f: columns can be reordered via drag-and-drop left to right

**Contract:**
- Input: HTTP request (method, path, body)
- Output: JSON response, status codes
- Invariants: RESTful endpoints, proper error handling

**Output File:** `src/generated/app/api.ts`

---

## IU-5: Design System / CSS (MEDIUM RISK)
**Requirements:**
- node-7c4f9e2a: theme must use only catppuccin mocha palette
- node-5a8f3c7b: background shall be #1e1e2e (base), #181825 (mantle) for headers
- node-9c6f4e3a: cards must use #1e1e2e (same as background for seamless look)
- node-3b8e2f7c: card hover/edit buttons must use #1e1e2e background to match card
- node-7f5c9a4e: primary accent must be #89b4fa (blue) for buttons and interactive elements
- node-2c9f7b5a: destructive actions must use #f38ba8 (pink) for delete/remove
- node-6f4c8e3b: text must use #cdd6f4 (primary), #a6adc8 (secondary)
- node-1f8c5a9e: success states must use #a6e3a1 (green)
- node-5b9f4c7e: warning states must use #f9e2af (yellow)
- node-3c9f5a8e: dark theme: bg #1e1e2e, cards #1e1e2e (uniform dark), accents #89b4fa
- node-9e5b8f2a: all cards (initial and dynamically created) must use identical background color

**Contract:**
- Input: None (static CSS)
- Output: CSS string with design tokens
- Invariants: Catppuccin Mocha palette only

**Output File:** `src/generated/app/styles.css.ts`

---

## IU-6: Modal System (HIGH RISK)
**Requirements:**
- node-5e9a4c8f: styled modal dialogs have: title, input fields, confirm button, cancel button
- node-9e4c8f2b: modal backdrop must use rgba(0,0,0,0.7) with blur effect
- node-4a7f9c3e: modal container must use #181825 background, 8px border-radius
- node-8d3e7f9b: modal container max-width must be 500px
- node-8c5f2a7b: modal header must have title with close button (x) top-right
- node-3e9b8f5a: modal footer must have action buttons right-aligned
- node-7c4a9f2e: primary action button must use #89b4fa background, #1e1e2e text
- node-2f8b6c5a: secondary/cancel button must use transparent background, #a6adc8 border
- node-6e4c9a3f: input fields must have visible labels above (not just placeholders)
- node-1b9f7c5e: backdrop click must close modal (cancel action)
- node-5c3a8f9b: esc key must close modal (cancel action)
- node-9f7b4e2a: enter key in input fields must submit modal (confirm action), except in textareas where it creates newline
- node-4e8c5f3b: first input field in modal must auto-focus when dialog opens
- node-8a3f9c7e: when editing existing items, cursor must be positioned at end of input value
- node-2c9f5a8b: all form inputs must have visible labels (not placeholders only)
- node-7f4e9c3b: input background must be #313244
- node-5b9f2c8e: input border must be 1px solid #45475a, #89b4fa on focus
- node-1c8a6f4e: textarea must allow vertical resize only
- node-2d8f7c5b: textarea min-height must be 200px
- node-9e5c3f7b: primary button: #89b4fa bg, #1e1e2e text, 6px border-radius
- node-4b9f8c2a: secondary button: transparent bg, #a6adc8 border, #cdd6f4 text
- node-8f3c9e6b: destructive button: #f38ba8 bg, #1e1e2e text
- node-2e8b7c5f: ghost button: transparent bg, #a6adc8 text (for cancel/close)

**Contract:**
- Input: Modal configuration (title, fields, callbacks)
- Output: Modal HTML/JS, event handlers
- Invariants: Consistent styling, keyboard navigation

**Output File:** `src/generated/app/modal.ts`

---

## IU-7: Board UI (HIGH RISK)
**Requirements:**
- node-7b4f9e2c: display board as horizontal row of columns
- node-2a8e5c7b: each column shows cards stacked vertically
- node-7e4a9c8b: show add-column button at right of board
- node-9e6b4c2a: board fills viewport width, columns scroll horizontally if needed
- node-4c8f3b9e: board fills viewport height without vertical scroll
- node-2a7f5c9e: javascript event handlers must call fetch() to hit api endpoints
- node-6f4c9e3a: newlines in card descriptions must be preserved and displayed in column view
- node-6c8a4f3e: ui updates must re-render the affected card/column in place

**Contract:**
- Input: Board state (columns, cards)
- Output: HTML page with board layout
- Invariants: Responsive layout, proper scrolling

**Output File:** `src/generated/app/board.ui.ts`

---

## IU-8: Column UI Components (HIGH RISK)
**Requirements:**
- node-5f3c8a1e: each column header shows edit (✏️) and delete (🗑️) buttons on hover, positioned left of count badge
- node-9c6a4f3b: column header widget order from left to right: edit button, delete button, card count badge
- node-4e8b2a7f: clicking column edit button opens styled modal to rename column
- node-1f7c5e9a: clicking column delete button opens confirmation modal (destructive action)
- node-8a3f6c2e: modal on confirm deletes column, removes all cards in it, updates ui dynamically
- node-6b9e4c1a: show add-card button at bottom of each column
- node-3c8f5a2e: clicking add-card button opens styled modal for card creation
- node-7a3f8c6b: column height fixed with internal scroll for many cards
- node-7e4b8f1c: column edit/delete buttons visible only on column header hover, positioned absolute right
- node-4a7f9e3c: column count badge dom element id format: "count-{columnid}"
- node-1b8f5c9e: card count badge updates in real-time when cards are added/moved/deleted

**Contract:**
- Input: Column data, card count
- Output: Column HTML with header, cards, add button
- Invariants: Hover states, count updates

**Output File:** `src/generated/app/column.ui.ts`

---

## IU-9: Card UI Components (HIGH RISK)
**Requirements:**
- node-5a8c3f7e: cards show edit (✏️) and delete (🗑️) buttons on hover, positioned top-right corner
- node-9e2b7c5f: clicking card body initiates drag-and-drop to move card
- node-4c8f3a6b: clicking card edit button opens styled modal to edit title and description
- node-1a9f7e4c: clicking card delete button opens confirmation modal (destructive action)
- node-2f9c7b5a: card edit/delete buttons visible only on card hover, positioned absolute top-right
- node-5c3a9f7e: button icons use emoji: ✏️ for edit, 🗑️ for delete
- node-1f8a6c4b: edit button hover color: #89b4fa (accent blue), delete button hover color: #f38ba8 (red)
- node-2e9b7c5f: card max-height 200px with scroll for long descriptions
- node-3f8b6c1e: dragging a card must move only the card - column position must remain unchanged
- node-7e5a9c4f: all cards (initial and dynamically created) must have identical drag behavior and event handlers
- node-2b9f6c3a: card dragstart handler must set global draggedcard variable for proper detection by column handlers
- node-8f3c7b2e: do not use browser native alert(), prompt(), or confirm() - use dom-based modals only

**Contract:**
- Input: Card data, linkified description
- Output: Card HTML with drag handlers, edit/delete buttons
- Invariants: Consistent card styling, proper drag behavior

**Output File:** `src/generated/app/card.ui.ts`

---

## IU-10: Card Drag and Drop (HIGH RISK)
**Requirements:**
- node-7d3b8f2e: drag-and-drop cards between columns with visual feedback
- node-3e7b5f9a: drag-and-drop cards between columns calls move api and updates ui dynamically without page reload
- node-5a3f9c7e: when card moved between columns via drag-and-drop, source column count decrements by 1, destination column count increments by 1
- node-9c7f4e2b: when card moved within same column (reordering), counts remain unchanged
- node-6c8f4e1b: card count updates must not require page reload for drag-and-drop operations

**Contract:**
- Input: Drag events, card ID, source/destination columns
- Output: API calls, DOM updates, count badge updates
- Invariants: Visual feedback, real-time count updates

**Output File:** `src/generated/app/card-dragdrop.ts`

---

## IU-11: Main UI Page (HIGH RISK)
**Requirements:**
- node-2b8f6c3a: modal on confirm calls api and updates the board ui dynamically without page reload
- node-6c4f9e1b: modal on cancel closes without api call
- node-9a5e3b8f: modal closes on backdrop click (cancel action)
- node-4f8c2a7e: modal closes on esc key (cancel action)

**Contract:**
- Input: Full board state
- Output: Complete HTML page with all JS/CSS
- Invariants: Self-contained page, all interactions work

**Output File:** `src/generated/app/page.ui.ts`

---

## IU-12: Column Reorder System (HIGH RISK)
**Requirements:**
- node-a1b4c9d2: dragging column header (title bar) initiates drag-and-drop to reorder columns left-to-right
- node-b2c5d3e4: while dragging a column, drop zones appear on edges not touching the dragged column
- node-c3d6e4f5: dropping a column between two other columns reorders it to that position
- node-9a6c4e1f: columns can be reordered via drag-and-drop left to right
- node-d4e7f6a8: drop zones touching the dragged column are hidden (dropping there would be no-op)

**Contract:**
- Input: Column drag events, board layout
- Output: Reordered DOM, API calls to persist new order
- Invariants: Visual feedback during drag, smooth reordering, redundant drop zones hidden

**Output File:** `src/generated/app/column-reorder.ts`

---

## Summary

| IU | Name | Risk | Requirements | Output File |
|---|---|---|---|---|
| IU-1 | Database Layer | HIGH | 10 | `src/generated/app/database.ts` |
| IU-2 | Data Models | HIGH | 11 | `src/generated/app/models.ts` |
| IU-3 | URL Linkification | MEDIUM | 10 | `src/generated/app/linkify.ts` |
| IU-4 | API Layer | HIGH | 10 | `src/generated/app/api.ts` |
| IU-5 | Design System | MEDIUM | 11 | `src/generated/app/styles.css.ts` |
| IU-6 | Modal System | HIGH | 24 | `src/generated/app/modal.ts` |
| IU-7 | Board UI | HIGH | 7 | `src/generated/app/board.ui.ts` |
| IU-8 | Column UI | HIGH | 11 | `src/generated/app/column.ui.ts` |
| IU-9 | Card UI | HIGH | 12 | `src/generated/app/card.ui.ts` |
| IU-10 | Card Drag and Drop | HIGH | 5 | `src/generated/app/card-dragdrop.ts` |
| IU-11 | Main Page | HIGH | 4 | `src/generated/app/page.ui.ts` |
| IU-12 | Column Reorder | HIGH | 5 | `src/generated/app/column-reorder.ts` |

**Total: 12 IUs** (low: 0, medium: 2, high: 10)
