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