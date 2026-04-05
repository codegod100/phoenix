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

## Low Stock

- REQUIREMENT: Show notification when items are low stock
- REQUIREMENT: Toggle to show only low stock items
- REQUIREMENT: Low stock count shown in page title

## API

- REQUIREMENT: REST API endpoints for CRUD operations on items and categories
- REQUIREMENT: Endpoints validate input using zod schemas
- REQUIREMENT: GET /items supports: search, categoryid, lowstock, sort, order
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
