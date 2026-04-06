# Kanban Board

A simple task management board with columns and cards.

## Board

- REQUIREMENT: A board has multiple columns (e.g., Todo, In Progress, Done)
- REQUIREMENT: Columns are ordered left to right
- REQUIREMENT: Board persists state between sessions

- CONSTRAINT: Default columns: "Todo", "In Progress", "Done"
- CONSTRAINT: Columns can be renamed but not deleted below 1 column

## Cards

- REQUIREMENT: A card has a title (required, 1-200 chars) and optional description
- REQUIREMENT: Cards belong to exactly one column
- REQUIREMENT: Cards can be moved between columns via drag-and-drop
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
- REQUIREMENT: PATCH /columns/:id renames a column

- CONSTRAINT: Moving card validates column exists (400 if not)
- CONSTRAINT: Card order is 0-indexed integer, automatically rebalanced on conflicts

## UI

- REQUIREMENT: Display board as horizontal row of columns
- REQUIREMENT: Each column shows cards stacked vertically
- REQUIREMENT: Show add-card button at bottom of each column
- REQUIREMENT: Show add-column button at right of board
- REQUIREMENT: Inline editing: click card title to edit
- REQUIREMENT: Drag-and-drop cards between columns

- CONSTRAINT: Board fills viewport width, columns scroll horizontally if needed
- CONSTRAINT: Column height fixed with internal scroll for many cards
- CONSTRAINT: Card max-height 200px with scroll for long descriptions
- CONSTRAINT: Dark theme: bg #1e1e2e, cards #313244, accents #89b4fa

## Database

- REQUIREMENT: Store columns: id, name, order_index, created_at
- REQUIREMENT: Store cards: id, title, description, column_id, order_index, created_at

- CONSTRAINT: Foreign key: cards.column_id → columns.id (ON DELETE CASCADE)
- CONSTRAINT: Unique constraint: (column_id, order_index) for card ordering
