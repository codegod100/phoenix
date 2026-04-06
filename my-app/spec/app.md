# My App

## Items

- REQUIREMENT: An item has a name (1-200 chars) and quantity (non-negative integer)
- REQUIREMENT: An item has optional minimum quantity threshold for low stock alerts (default: 0)
- REQUIREMENT: An item is "low stock" when quantity <= minimum quantity
- REQUIREMENT: Items support create, view, update, delete operations

- CONSTRAINT: Items must have created_at timestamp
- CONSTRAINT: When creating an item, quantity defaults to 0 if not provided
- CONSTRAINT: When creating an item, minimum quantity defaults to 0 if not provided
- CONSTRAINT: When updating an item, only provided fields are updated (partial update)
- CONSTRAINT: When creating/updating with category_id, it must exist or return 400

## Categories

- REQUIREMENT: A category has a name (1-200 chars) and optional description
- REQUIREMENT: Items can optionally belong to a category
- REQUIREMENT: Categories support create, view, update, delete operations
- REQUIREMENT: When fetching items, include the category name
- REQUIREMENT: Deleting a category unassigns its items

- CONSTRAINT: Category description defaults to empty string if not provided
- CONSTRAINT: When updating a category, only provided fields are updated (partial update)
- CONSTRAINT: GET /categories returns results ordered by name ascending

## Items Dashboard

- REQUIREMENT: Display items in a sortable, filterable table
- REQUIREMENT: Table shows: name, quantity, min quantity, category, edit/delete buttons
- REQUIREMENT: Highlight low stock items with visual indicator (#f38ba8)
- REQUIREMENT: Show low stock count indicator
- REQUIREMENT: Support filtering by category and searching by name
- REQUIREMENT: Provide create/edit/delete item buttons and category management button
- REQUIREMENT: Open modal forms for creating/editing items and categories
- REQUIREMENT: Modal forms must be pre-populated when editing
- REQUIREMENT: Dashboard served at root path "/" redirecting to /ui/items-dashboard

### UI Theme (Catppuccin Mocha)

- CONSTRAINT: Colors must be: Base #1e1e2e, Text #cdd6f4, Button #cba6f7, Surface #45475a, Input #313244, Border #585b70, Low Stock #f38ba8

### Dashboard Behaviors

- CONSTRAINT: Real-time filtering/sorting without page reload
- CONSTRAINT: Client-side validation matching API validation rules
- CONSTRAINT: Modal forms close after successful submission

## Design System

- CONSTRAINT: Use Catppuccin Mocha aesthetic: soft, rounded, elevated surfaces with warm pastels on dark backgrounds
- CONSTRAINT: Spacing: 8px base unit (0.5rem), section margins 24px (1.5rem), component padding 16px (1rem), element gap 12px (0.75rem)
- CONSTRAINT: Border radius: 8px for cards/containers, 6px for inputs/selects, 4px for buttons
- CONSTRAINT: Elevation: cards get 0 4px 6px -1px rgba(0,0,0,0.1) shadow, modals get 0 25px 50px -12px rgba(0,0,0,0.5) shadow
- CONSTRAINT: Typography: system-ui sans-serif family, 14px base size (0.875rem), 1.5 line-height, 18px headings (1.125rem)
- CONSTRAINT: Hover states: interactive elements lighten background 10% (use var(--surface1) instead of var(--surface0))
- CONSTRAINT: Layout: max-width 1400px container, centered with 24px padding
- CONSTRAINT: Filter bar: search input, category select, sort field, sort order, and action buttons arranged horizontally in a single row with gap
- CONSTRAINT: All form inputs and selects must have visible labels - use floating labels or inline label+input pairs where the label text is always visible
- CONSTRAINT: Table: row height comfortable, cell padding 14px horizontal (0.875rem), 1px solid borders between rows
- CONSTRAINT: Focus states: blue (#89b4fa) outline for accessibility on inputs and buttons
- CONSTRAINT: Dialog/Modal: backdrop blur 4px with 60% black overlay, centered content, max-width 500px, max-height 90vh with scroll
- CONSTRAINT: Dialog header: flex layout with title (h2, 20px size) and close button (× icon), bottom border 1px solid surface0
- CONSTRAINT: Dialog body: padding 24px (1.5rem), form groups with label above input, 16px margin-bottom between groups
- CONSTRAINT: Dialog footer: top border 1px solid surface0, flex row with gap, right-aligned action buttons
- CONSTRAINT: Form layout: inputs full-width within container, two-column grid for related fields (quantity/min-quantity)
- CONSTRAINT: Close button: top-right positioned, inherits text color, 24px font-size, no background

## Low Stock

- REQUIREMENT: Show notification when items are low stock
- REQUIREMENT: Toggle to show only low stock items
- REQUIREMENT: Low stock count shown in page title

## API

- REQUIREMENT: REST API endpoints for CRUD operations on items and categories
- REQUIREMENT: Endpoints validate input using zod schemas
- REQUIREMENT: GET /items supports: search, categoryid, lowstock, sort, order
- REQUIREMENT: Sortable columns: name, quantity, created_at (ascending or descending)
- REQUIREMENT: POST returns 201 with created object; PATCH returns updated object
- REQUIREMENT: Include low_stock boolean and category_name in item responses
- REQUIREMENT: Return 400 for validation errors, 404 for not found

- CONSTRAINT: GET /categories returns list ordered by name
- CONSTRAINT: Invalid JSON returns 400 with error message

## Database

- REQUIREMENT: Foreign key constraint between items.category_id and categories.id
- REQUIREMENT: Auto-incrementing primary keys for items and categories tables

## Error Handling

- REQUIREMENT: Invalid JSON requests return 400 with descriptive message
- REQUIREMENT: Validation errors return 400 with specific field errors
- REQUIREMENT: Non-existent resources return 404
