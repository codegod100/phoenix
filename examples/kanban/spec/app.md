# Kanban Board

A simple task management board with columns and cards.

## Board

- REQUIREMENT: A board has multiple columns (e.g., Todo, In Progress, Done)
- REQUIREMENT: Columns are ordered left to right
- REQUIREMENT: Board persists state in SQLite database between sessions

- CONSTRAINT: Default columns: "Todo", "In Progress", "Done"
- CONSTRAINT: Columns can be renamed but not deleted below 1 column

## Cards

- REQUIREMENT: A card has a title (required, 1-200 chars) and optional description
- REQUIREMENT: URLs in card descriptions MUST be rendered as clickable links at all times, including after editing
- CONSTRAINT: URLs displayed as link text MUST show the original unescaped URL (not HTML entities like &amp;)
- CONSTRAINT: Card description text MUST NOT be HTML-escaped when editing - textarea receives raw text
- CONSTRAINT: Each URL in a multi-line description MUST be independently linkified (URLs separated by newlines must each be clickable)

## URL Linkification Implementation

- DEFINITION: `linkify(text)` converts raw URLs to clickable anchor tags
- CONSTRAINT: `linkify()` MUST handle multiple URLs separated by newlines as separate links
- CONSTRAINT: Server-side uses regex literal: `/https?:\/\/[^\s<\n\r]+/gi`
- CONSTRAINT: Client-side (RegExp constructor) uses: `new RegExp('https?://[^\\s<\\n\\r]+', 'gi')` - NOTE: 4 backslashes for \s, 2 backslashes for \n\r in string

### Test Cases
- SCENARIO: Multi-URL linkification
  - GIVEN card description: "Check https://google.com\n\nAnd https://semble.so"
  - WHEN rendered in column view
  - THEN output contains: `<a href="https://google.com">https://google.com</a>` AND `<a href="https://semble.so">https://semble.so</a>`
  - AND each URL is a separate clickable link (not merged into one broken link)

- SCENARIO: URL linkification after edit
  - GIVEN card with multi-URL description is edited and saved
  - WHEN edit modal closes and DOM updates
  - THEN all URLs remain independently clickable (regression test for client-side linkify)

- CONSTRAINT: URL regex MUST stop at newline characters - pattern `[^\s<\n\r]+` not `[^\s<]+`
- CONSTRAINT: Client-side RegExp string escaping MUST use `\\n` not `\n` (2 backslashes for string → 1 for regex newline)
- REQUIREMENT: Cards belong to exactly one column
- REQUIREMENT: Cards can be moved between columns via drag-and-drop
- REQUIREMENT: Columns can be reordered via drag-and-drop left to right
- REQUIREMENT: Cards have a display order within each column

- CONSTRAINT: Cards must have created_at timestamp
- CONSTRAINT: Maximum 100 cards per board (performance guard)

## API

- REQUIREMENT: GET /board returns full board state with columns and cards
- REQUIREMENT: POST /cards creates a new card with title and optional description
- REQUIREMENT: PATCH /cards/:id updates card title/description
- REQUIREMENT: PATCH /cards/:id/move moves card to different column with new order
- REQUIREMENT: DELETE /cards/:id removes a card
- REQUIREMENT: POST /columns creates a new column
- REQUIREMENT: DELETE /columns/:id removes a column and all its cards
- REQUIREMENT: PATCH /columns/:id/move reorders column to new position
- REQUIREMENT: PATCH /columns/:id renames a column

- CONSTRAINT: Moving card validates column exists (400 if not)
- CONSTRAINT: Card order is 0-indexed integer, automatically rebalanced on conflicts
- CONSTRAINT: Column order is 0-indexed integer, automatically rebalanced on conflicts
- CONSTRAINT: Deleting column requires at least 2 columns exist (minimum 1 must remain)

## UI

- REQUIREMENT: Display board as horizontal row of columns
- REQUIREMENT: Each column shows cards stacked vertically
- REQUIREMENT: Each column header shows edit (✏️) and delete (🗑️) buttons on hover, positioned left of count badge
- REQUIREMENT: Column header widget order from left to right: edit button, delete button, card count badge
- REQUIREMENT: Clicking column edit button opens styled modal to rename column
- REQUIREMENT: Clicking column delete button opens confirmation modal (destructive action)
- REQUIREMENT: Modal on confirm deletes column, removes all cards in it, updates UI dynamically
- REQUIREMENT: Show add-card button at bottom of each column
- REQUIREMENT: Clicking add-card button opens styled modal for card creation
- REQUIREMENT: Show add-column button at right of board
- REQUIREMENT: Clicking add-column button opens styled modal for column creation
- REQUIREMENT: Cards show edit (✏️) and delete (🗑️) buttons on hover, positioned top-right corner
- REQUIREMENT: Clicking card body initiates drag-and-drop to move card
- REQUIREMENT: Clicking card edit button opens styled modal to edit title and description
- REQUIREMENT: Clicking card delete button opens confirmation modal (destructive action)
- REQUIREMENT: Drag-and-drop cards between columns with visual feedback
- REQUIREMENT: Dragging column header (title bar) initiates drag-and-drop to reorder columns left-to-right
- REQUIREMENT: While dragging a column, other columns show drop zones between them for reordering
- REQUIREMENT: Dropping a column between two other columns reorders it to that position
- REQUIREMENT: Styled modal dialogs have: title, input fields, confirm button, cancel button
- REQUIREMENT: Modal on confirm calls API and updates the board UI dynamically without page reload
- REQUIREMENT: Modal on cancel closes without API call
- REQUIREMENT: Modal closes on backdrop click (cancel action)
- REQUIREMENT: Modal closes on ESC key (cancel action)
- REQUIREMENT: Drag-and-drop cards between columns calls move API and updates UI dynamically without page reload
- REQUIREMENT: UI updates must re-render the affected card/column in place

- CONSTRAINT: Card edit/delete buttons visible only on card hover, positioned absolute top-right
- CONSTRAINT: Column edit/delete buttons visible only on column header hover, positioned absolute right
- CONSTRAINT: Button icons use emoji: ✏️ for edit, 🗑️ for delete
- CONSTRAINT: Edit button hover color: #89b4fa (accent blue), delete button hover color: #f38ba8 (red)
- CONSTRAINT: Board fills viewport width, columns scroll horizontally if needed
- CONSTRAINT: Board fills viewport height without vertical scroll - vertical space is managed by column internals
- CONSTRAINT: Column height fixed with internal scroll for many cards
- CONSTRAINT: Card max-height 200px with scroll for long descriptions
- CONSTRAINT: Newlines in card descriptions MUST be preserved and displayed in column view
- CONSTRAINT: Card count badge updates in real-time when cards are added/moved/deleted
- CONSTRAINT: When card moved between columns via drag-and-drop, source column count decrements by 1, destination column count increments by 1
- CONSTRAINT: When card moved within same column (reordering), counts remain unchanged
- CONSTRAINT: Dragging a card MUST move only the card - column position MUST remain unchanged
- CONSTRAINT: All cards (initial and dynamically created) MUST have identical drag behavior and event handlers
- CONSTRAINT: Card dragstart handler MUST set global draggedCard variable for proper detection by column handlers
- CONSTRAINT: Card count updates must NOT require page reload for drag-and-drop operations
- CONSTRAINT: Column count badge DOM element id format: "count-{columnId}"
- CONSTRAINT: Do not use browser native alert(), prompt(), or confirm() - use DOM-based modals only
- CONSTRAINT: Dark theme: bg #1e1e2e, cards #1e1e2e (uniform dark), accents #89b4fa
- CONSTRAINT: All cards (initial and dynamically created) MUST use identical background color
- CONSTRAINT: JavaScript event handlers must call fetch() to hit API endpoints

## Design System

- CONSTRAINT: Theme MUST use ONLY Catppuccin Mocha palette
- CONSTRAINT: Background SHALL be #1e1e2e (base), #181825 (mantle) for headers
- CONSTRAINT: Cards MUST use #1e1e2e (same as background for seamless look)
- CONSTRAINT: Card hover/edit buttons MUST use #1e1e2e background to match card
- CONSTRAINT: Primary accent MUST be #89b4fa (blue) for buttons and interactive elements
- CONSTRAINT: Destructive actions MUST use #f38ba8 (pink) for delete/remove
- CONSTRAINT: Text MUST use #cdd6f4 (primary), #a6adc8 (secondary)
- CONSTRAINT: Success states MUST use #a6e3a1 (green)
- CONSTRAINT: Warning states MUST use #f9e2af (yellow)

### Modal Dialog Design
- CONSTRAINT: Modal backdrop MUST use rgba(0,0,0,0.7) with blur effect
- CONSTRAINT: Modal container MUST use #181825 background, 8px border-radius
- CONSTRAINT: Modal header MUST have title with close button (X) top-right
- CONSTRAINT: Modal footer MUST have action buttons right-aligned
- CONSTRAINT: Primary action button MUST use #89b4fa background, #1e1e2e text
- CONSTRAINT: Secondary/cancel button MUST use transparent background, #a6adc8 border
- CONSTRAINT: Input fields MUST have visible labels above (not just placeholders)
- CONSTRAINT: Backdrop click MUST close modal (cancel action)
- CONSTRAINT: ESC key MUST close modal (cancel action)
- CONSTRAINT: Enter key in input fields MUST submit modal (confirm action), except in textareas where it creates newline
- CONSTRAINT: First input field in modal MUST auto-focus when dialog opens
- CONSTRAINT: When editing existing items, cursor MUST be positioned at end of input value

### Input Design
- CONSTRAINT: All form inputs MUST have visible labels (not placeholders only)
- CONSTRAINT: Input background MUST be #313244
- CONSTRAINT: Input border MUST be 1px solid #45475a, #89b4fa on focus
- CONSTRAINT: Textarea MUST allow vertical resize only

### Button Design
- CONSTRAINT: Primary button: #89b4fa bg, #1e1e2e text, 6px border-radius
- CONSTRAINT: Secondary button: transparent bg, #a6adc8 border, #cdd6f4 text
- CONSTRAINT: Destructive button: #f38ba8 bg, #1e1e2e text
- CONSTRAINT: Ghost button: transparent bg, #a6adc8 text (for cancel/close)

## Database

- REQUIREMENT: Use SQLite database for data persistence
- REQUIREMENT: Database file path: `data/app.db`
- REQUIREMENT: Store columns: id, name, order_index, created_at
- REQUIREMENT: Store cards: id, title, description, column_id, order_index, created_at

- CONSTRAINT: Foreign key: cards.column_id → columns.id (ON DELETE CASCADE)
- CONSTRAINT: Unique constraint: (column_id, order_index) for card ordering
