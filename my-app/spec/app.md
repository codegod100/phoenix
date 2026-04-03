# My App

## Items

- An item has a name and a quantity
- An item has an optional minimum quantity threshold (for low stock alerts)
- Users can create, view, update, and delete items
- Name must not be empty
- Quantity must be a non-negative integer
- Minimum quantity must be a non-negative integer (default: 0)
- An item is "low stock" when quantity falls below minimum quantity

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
- All actions use the items API endpoints

### Technical Constraints
- Fetch and render items on initial page load
- Include client-side initialization in generated HTML
- Handle empty state gracefully

## Low Stock Notifications

- Dashboard displays a notification banner when any items are low stock
- Users can filter to show only low stock items
- Low stock items have a visual indicator (red badge or row highlight)
- The low stock count is shown in the page title