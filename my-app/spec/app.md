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

- CONSTRAINT: When creating an item, if quantity is not provided, it defaults to 0
- CONSTRAINT: When creating an item, if minimum quantity is not provided, it defaults to 0
- CONSTRAINT: When updating an item, only provided fields should be updated (partial update semantics)

- CONSTRAINT: When creating or updating an item, if a category_id is provided, it must correspond to an existing category; otherwise, the API must return a 400 error.

- CONSTRAINT: When creating an item, if quantity is not provided, it defaults to 0
- CONSTRAINT: When creating an item, if minimum quantity is not provided, it defaults to 0
- CONSTRAINT: When updating an item, only provided fields should be updated (partial update semantics)
- CONSTRAINT: When creating or updating an item, if a category_id is provided, it must correspond to an existing category; otherwise, the API must return a 400 error.

## Categories

- A category has a name and optional description
- Items can belong to a category (optional)
- Users can create, view, update, and delete categories
- When fetching items, include the category name
- Deleting a category unassigns its items

- CONSTRAINT: Category names must be between 1 and 200 characters
- CONSTRAINT: Category descriptions are optional and default to empty string

- CONSTRAINT: When creating a category, if description is not provided, it defaults to empty string
- CONSTRAINT: When updating a category, only provided fields should be updated (partial update semantics)

- CONSTRAINT: When fetching categories via GET /categories, the results must be ordered by name in ascending order.

- CONSTRAINT: When creating a category, if description is not provided, it defaults to empty string
- CONSTRAINT: When updating a category, only provided fields should be updated (partial update semantics)
- CONSTRAINT: When fetching categories via GET /categories, the results must be ordered by name in ascending order.

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

- REQUIREMENT: Dashboard must include a modal form for creating new items
- REQUIREMENT: Dashboard must include a modal form for editing existing items
- REQUIREMENT: Dashboard must include a modal form for creating new categories
- REQUIREMENT: Dashboard must include a modal form for editing existing categories
- REQUIREMENT: Dashboard must include a button to open the category management modal
- CONSTRAINT: Modal forms must include client-side validation that matches API validation rules
- CONSTRAINT: Modal forms must close after successful submission
- CONSTRAINT: Table rows must include edit and delete action buttons for each item

- CONSTRAINT: The dashboard HTML page must use the specific Catppuccin Mocha color hex codes: Background #1e1e2e, Text #cdd6f4, Primary Button #cba6f7, Secondary Button/Surface #45475a, Input Background #313244, Input Border #585b70, Low Stock/Badge #f38ba8.
- REQUIREMENT: The dashboard table must highlight low stock item rows or text using the color #f38ba8.
- REQUIREMENT: The dashboard must display a visual badge with text for low stock items.

- REQUIREMENT: Dashboard must be served as an HTML page with embedded CSS styling
- REQUIREMENT: Dashboard must include client-side form validation that matches server-side validation rules
- REQUIREMENT: Editing items must be done via modal forms without page refresh
- REQUIREMENT: Dashboard must support real-time filtering and sorting without page reload
- REQUIREMENT: Dashboard must include a modal form for creating new items
- REQUIREMENT: Dashboard must include a modal form for editing existing items
- REQUIREMENT: Dashboard must include a modal form for creating new categories
- REQUIREMENT: Dashboard must include a modal form for editing existing categories
- REQUIREMENT: Dashboard must include a button to open the category management modal
- REQUIREMENT: Dashboard must be served at the root path "/" as the default landing page
- CONSTRAINT: Modal forms must include client-side validation that matches API validation rules
- CONSTRAINT: Modal forms must close after successful submission
- CONSTRAINT: Table rows must include edit and delete action buttons for each item
- CONSTRAINT: The dashboard HTML page must use the specific Catppuccin Mocha color hex codes: Background #1e1e2e, Text #cdd6f4, Primary Button #cba6f7, Secondary Button/Surface #45475a, Input Background #313244, Input Border #585b70, Low Stock/Badge #f38ba8.
- REQUIREMENT: The dashboard table must highlight low stock item rows or text using the color #f38ba8.
- REQUIREMENT: The dashboard must display a visual badge with text for low stock items.

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


- REQUIREMENT: POST /categories endpoint must return the created category object with HTTP status 201
- REQUIREMENT: PATCH /categories/:id endpoint must return the updated category object
- REQUIREMENT: POST /items endpoint must return the created item object with HTTP status 201
- REQUIREMENT: PATCH /items/:id endpoint must return the updated item object
- CONSTRAINT: When creating or updating an item with a category_id, the category must exist; otherwise return 400 error
- CONSTRAINT: When updating a category, if the category doesn't exist, return 404 error
- CONSTRAINT: When updating an item, if the item doesn't exist, return 404 error

- REQUIREMENT: GET /categories endpoint must return a list of all categories ordered by name.
- REQUIREMENT: GET /categories/:id endpoint must return a single category object or a 404 error if not found.
- CONSTRAINT: API requests with invalid JSON bodies must return a 400 status code with an error message.
- CONSTRAINT: API validation errors must return a 400 status code with the first validation error message in the response body.

- REQUIREMENT: The application must provide REST API endpoints for CRUD operations on items and categories
- REQUIREMENT: API endpoints must validate input data using schema validation
- REQUIREMENT: GET /items endpoint must support query parameters: search (string), categoryid (integer), sort (string), order (asc/desc), lowstock (boolean)
- REQUIREMENT: API must return appropriate HTTP status codes (400 for validation errors, 404 for not found resources)
- REQUIREMENT: When fetching items via API, include calculated low_stock boolean field and category_name from join
- REQUIREMENT: POST /categories endpoint must return the created category object with HTTP status 201
- REQUIREMENT: PATCH /categories/:id endpoint must return the updated category object
- REQUIREMENT: POST /items endpoint must return the created item object with HTTP status 201
- REQUIREMENT: PATCH /items/:id endpoint must return the updated item object
- CONSTRAINT: When creating or updating an item with a category_id, the category must exist; otherwise return 400 error
- CONSTRAINT: When updating a category, if the category doesn't exist, return 404 error

## Database

- REQUIREMENT: Database must have foreign key constraint between items.category_id and categories.id
- REQUIREMENT: Items table must have auto-incrementing primary key id
- REQUIREMENT: Categories table must have auto-incrementing primary key id


## Error Handling

- REQUIREMENT: Invalid JSON requests must return 400 error with descriptive message
- REQUIREMENT: Validation errors must return 400 error with specific field error messages
- REQUIREMENT: Attempting to access non-existent resources must return 404 error
