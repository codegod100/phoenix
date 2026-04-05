# My App

## Items

- An item has a name and a quantity
- An item has an optional minimum quantity threshold (for low stock alerts)
- Users can create, view, update, and delete items
- Name must not be empty
- Quantity must be a non-negative integer
- Minimum quantity must be a non-negative integer (default: 0)
- An item is "low stock" when quantity falls below minimum quantity
- **Database column name MUST be `minimum_quantity`** (not `min_quantity`)

### Technical Constraints
- All SQL statements must have balanced parentheses in VALUES clauses
- Use parameterized queries with proper binding

## Categories

- A category has a name and optional description
- Items belong to a category (optional)
- Users can create, view, update, and delete categories
- When fetching items, include the category name

### Category Management UI
- Dashboard includes a "Manage Categories" button
- Clicking opens a modal with category list
- Modal allows creating, editing, and deleting categories
- Form fields: name (required), description (optional)
- Deleting a category unassigns items from that category

## Items Dashboard

- Display items in a sortable table
- Show item name, quantity, minimum quantity, and category
- Highlight low stock items in red
- Show low stock count badge in header
- Allow filtering by category
- Include a search box for item names
- Provide buttons to create, edit, and delete items
- Include a "Manage Categories" button that opens category management modal
- Editing opens a modal form with minimum quantity field

### UI Theme Constraints
- Theme MUST use ONLY the following Catppuccin Mocha hex colors
- Background MUST be `#1e1e2e` (base) or `#181825` (mantle) for headers
- Surface and cards MUST use `#313244`
- Primary accent (buttons, headings, links) MUST be `#cba6f7` (mauve)
- Destructive actions (delete buttons) MUST use `#f38ba8` (pink)
- Primary text MUST be `#cdd6f4`, secondary text MUST be `#a6adc8`
- Low stock warning MUST use `#f9e2af` (yellow) left border
- CSS MUST NOT contain Bootstrap defaults (#007bff, #dc3545, #f8f9fa, etc.)
- **CRITICAL**: JavaScript template literals inside `<script>` tags MUST use **concatenation** (`+`) or **escaped backticks** (`` \` ``) instead of nested template literals to avoid syntax errors

### Technical Constraints
- Dashboard is a **UI-only component** that uses existing Items and Categories APIs
- Client-side JavaScript MUST call `/items/*` for item operations (not `/items-dashboard/api/*`)
- Client-side JavaScript MUST call `/categories/*` for category operations (not `/items-dashboard/api/*`)
- Dashboard MUST NOT define its own `/api/*` routes - it renders HTML and calls existing APIs
- **CRITICAL**: Inside `<script>` tags, any nested template literals using backticks (`` ` ``) must use **escaped backticks** (`` \` ``) to avoid closing the outer template literal
- **HTML escaping**: `escapeHtml()` helper must be defined at module scope for SSR safety

## Low Stock Notifications

- Dashboard displays a notification banner when any items are low stock
- Users can filter to show only low stock items
- Low stock items have a visual indicator (red badge or row highlight)
- The low stock count is shown in the page title

## Auto-Promoted Requirements (2026-04-05)

- CONSTRAINT: The items table shall include a min_quantity field of type INTEGER with NOT NULL constraint, DEFAULT value 0, and CHECK constraint ensuring values are non-negative (>= 0).
- CONSTRAINT: The items table shall include a quantity field of type INTEGER with NOT NULL constraint, DEFAULT value 0, and CHECK constraint ensuring values are non-negative (>= 0).
- CONSTRAINT: The items table shall include a category_id foreign key referencing categories(id) with ON DELETE SET NULL referential action.
- CONSTRAINT: Item names shall be constrained to a maximum length of 200 characters and minimum length of 1 character.
- CONSTRAINT: Category names shall be constrained to a maximum length of 200 characters and minimum length of 1 character.
- CONSTRAINT: The categories table shall include a description field of type TEXT with NOT NULL constraint and DEFAULT value of empty string.
- REQUIREMENT: The items dashboard API shall support query parameters for filtering by category_id, search string (LIKE pattern matching on name), sort criteria, and a boolean flag to show only low-stock items (where quantity <= min_quantity).
- REQUIREMENT: The items list endpoint shall return item data joined with category names via LEFT JOIN with the categories table.
- REQUIREMENT: API endpoints shall perform input validation using Zod schemas, returning HTTP 400 status code with descriptive error messages for schema validation failures.
- REQUIREMENT: API endpoints shall handle malformed JSON payloads by returning HTTP 400 status code with an "Invalid JSON" error message.
- REQUIREMENT: API endpoints shall return HTTP 404 status code when attempting to access, update, or delete resources by non-existent IDs.
- REQUIREMENT: All server-side rendered HTML output shall be escaped to prevent XSS attacks, specifically converting &, <, >, ", and ' characters to their corresponding HTML entities.
- REQUIREMENT: The categories management UI shall implement state management for loading indicators, error messages, and data persistence during fetch operations.
- REQUIREMENT: The categories UI shall provide navigation controls (e.g., back buttons) allowing users to return to parent or previous screens.
- REQUIREMENT: UI forms shall enforce client-side validation matching API constraints: required name fields (1-200 characters) and optional description fields.
- REQUIREMENT: The system shall implement idempotent database migrations that execute on application startup, adding missing columns (e.g., min_quantity) with appropriate constraints and default values, while gracefully handling duplicate column errors.
- REQUIREMENT: The items dashboard UI shall fetch item data from the '/items' endpoint and render it dynamically.
- CONTEXT: The items dashboard component is classified as high-risk (risk_tier: high) and requires strict input validation and output encoding.
- CONTEXT: Database migrations must support existing databases by conditionally adding columns only if they do not already exist.


## Auto-Promoted Requirements (2026-04-05)

- CONSTRAINT: Item name must be a string with minimum length 1 and maximum length 200 characters.
- CONSTRAINT: Item quantity must be a non-negative integer.
- CONSTRAINT: Item min_quantity must be a non-negative integer, defaulting to 0 if not provided.
- CONSTRAINT: Category name must be a string with minimum length 1 and maximum length 200 characters.
- CONSTRAINT: Category description must be a string, defaulting to an empty string if not provided.
- CONSTRAINT: Item category_id must be either null or reference an existing category ID in the database.
- REQUIREMENT: The system must provide a GET API endpoint for items supporting query parameters: search (string), category_id (integer), sort (string), order (asc/desc), and low_stock (boolean).
- REQUIREMENT: The API must validate all input for item and category operations using defined schemas and return descriptive error messages for invalid data.
- REQUIREMENT: A web-based dashboard must be available for item management, featuring real-time search, category filtering, column sorting, and a low stock toggle.
- REQUIREMENT: Low stock items must be visually highlighted in the dashboard using badges or color coding.
- CONTEXT: Low stock is defined as when an item's quantity is less than or equal to its min_quantity value.
- REQUIREMENT: The dashboard must escape all dynamic content to prevent cross-site scripting (XSS) attacks.
- REQUIREMENT: The dashboard must use a responsive design that adapts to various screen sizes.
- REQUIREMENT: The dashboard must support pagination or infinite scrolling for item lists.
- REQUIREMENT: The API must support sorting items by columns: name, quantity, min_quantity, and created_at, with ascending or descending order.
- REQUIREMENT: The system must verify category existence when creating or updating an item with a category_id.
