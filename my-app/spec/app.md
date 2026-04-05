# My App

## Items

- An item has a name and a quantity
- An item has an optional minimum quantity threshold for low stock alerts
- Users can create, view, update, and delete items
- Name must not be empty and maximum 200 characters
- Quantity must be a non-negative integer
- Minimum quantity must be a non-negative integer (default: 0)
- An item is "low stock" when quantity falls below minimum quantity

## Categories

- A category has a name and optional description
- Items can belong to a category (optional)
- Users can create, view, update, and delete categories
- When fetching items, include the category name
- Deleting a category unassigns its items

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

## Low Stock

- Dashboard shows notification when items are low stock
- Users can toggle to show only low stock items
- Low stock items have visual indicator (badge or highlight)
- Low stock count shown in page title
