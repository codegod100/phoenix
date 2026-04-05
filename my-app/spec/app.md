# My App

## Items

- An item has a name and a quantity
- An item has an optional minimum quantity threshold for low stock alerts
- Users can create, view, update, and delete items
- Name must not be empty and maximum 200 characters
- Quantity must be a non-negative integer
- Minimum quantity must be a non-negative integer (default: 0)
- An item is "low stock" when quantity falls below minimum quantity

- CONSTRAINT: Items must have a created_at timestamp field that records creation time
- CONSTRAINT: Low stock condition is defined as quantity <= minimum quantity (not strictly less than)

## Categories

- A category has a name and optional description
- Items can belong to a category (optional)
- Users can create, view, update, and delete categories
- When fetching items, include the category name
- Deleting a category unassigns its items

- CONSTRAINT: Category names must be between 1 and 200 characters
- CONSTRAINT: Category descriptions are optional and default to empty string

## Items Dashboard

- Display items in a sortable table
- Show item name, quantity, minimum quantity, and category
- Highlight low stock items visually
- Show low stock count
- Allow filtering by category
- Include search for item names
- Provide create, edit, and delete item buttons
- Include category management button
- Editing opens a modal form

### UI Theme

- Dark theme using Catppuccin Mocha colors
- Background: dark purple/black
- Surface/cards: slightly lighter purple
- Primary accent: mauve/purple
- Destructive actions: pink/red
- Primary text: light, secondary text: muted
- Low stock warning: yellow accent

- REQUIREMENT: Dashboard must be served as an HTML page with embedded CSS styling
- REQUIREMENT: Dashboard must include client-side form validation that matches server-side validation rules
- REQUIREMENT: Editing items must be done via modal forms without page refresh
- REQUIREMENT: Dashboard must support real-time filtering and sorting without page reload

## Low Stock

- Dashboard shows notification when items are low stock
- Users can toggle to show only low stock items
- Low stock items have visual indicator (badge or highlight)
- Low stock count shown in page title


## API

- REQUIREMENT: The application must provide REST API endpoints for CRUD operations on items and categories
- REQUIREMENT: API endpoints must validate input data using schema validation
- REQUIREMENT: GET /items endpoint must support query parameters: search (string), categoryid (integer), sort (string), order (asc/desc), lowstock (boolean)
- REQUIREMENT: API must return appropriate HTTP status codes (400 for validation errors, 404 for not found resources)
- REQUIREMENT: When fetching items via API, include calculated low_stock boolean field and category_name from join


## Database

- REQUIREMENT: Database must have foreign key constraint between items.category_id and categories.id
- REQUIREMENT: Items table must have auto-incrementing primary key id
- REQUIREMENT: Categories table must have auto-incrementing primary key id


## Error Handling

- REQUIREMENT: Invalid JSON requests must return 400 error with descriptive message
- REQUIREMENT: Validation errors must return 400 error with specific field error messages
- REQUIREMENT: Attempting to access non-existent resources must return 404 error
