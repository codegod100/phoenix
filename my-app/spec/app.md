# My App

## Items

- An item has a name and a quantity
- Users can create, view, update, and delete items
- Name must not be empty
- Quantity must be a non-negative integer

### Technical Constraints
- All SQL statements must have balanced parentheses in VALUES clauses
- Use parameterized queries with proper binding

## Categories

- A category has a name and description
- Items belong to a category (optional)
- Users can create, view, update, and delete categories
- When fetching items, include the category name

## Items Dashboard

- Display items in a sortable table
- Show item name, quantity, and category
- Allow filtering by category
- Include a search box for item names
- Provide buttons to create, edit, and delete items
- Editing opens a modal form
- All actions use the items API endpoints

### Technical Constraints
- Fetch and render items on initial page load
- Include client-side initialization in generated HTML
- Handle empty state gracefully