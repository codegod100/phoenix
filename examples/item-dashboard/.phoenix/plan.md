# Implementation Units Plan

## IU-1: Database Schema (LOW)

**Requirements:**
- node-e9c5b4f2: foreign key constraint between items.category_id and categories.id
- node-1a7f6e3c: auto-incrementing primary keys for items and categories tables

**Contract:** SQLite database schema with foreign key relationships
**Output:** `src/db.ts` (exists - boundary policy: preserve)

## IU-2: Item Domain Model (HIGH)

**Requirements:**
- node-3a8f1c2e: item has name (1-200 chars) and quantity (non-negative integer)
- node-7b4e9d5a: item has optional minimum quantity threshold for low stock alerts (default: 0)
- node-9c2f4b1d: item is low stock when quantity <= minimum quantity
- node-1d6e8a3f: items support create, view, update, delete operations
- node-4e7b2c9a: items must have created_at timestamp
- node-8f3c5d2b: creating item defaults quantity to 0 if not provided
- node-2a9e6c4d: creating item defaults minimum quantity to 0 if not provided
- node-5d1f8e7c: updating item only updates provided fields (partial update)
- node-b3e7a5f9: creating or updating with category_id must exist or return 400

**Contract:** Item entity with CRUD operations and low stock logic
**Output:** `src/generated/app/items.ts`

## IU-3: Category Domain Model (MEDIUM)

**Requirements:**
- node-c8d4f2e6: category has name (1-200 chars) and optional description
- node-6a3e9b5d: items can optionally belong to a category
- node-f7c2a8e4: categories support create, view, update, delete operations
- node-9e5b3d7a: fetching items includes category name
- node-2c8f6a1e: deleting category unassigns its items
- node-a4d7e3b9: category description defaults to empty string if not provided
- node-5b8e2c6f: updating category only updates provided fields (partial update)
- node-e1f9c4a7: get categories returns results ordered by name ascending

**Contract:** Category entity with CRUD operations and item relationship handling
**Output:** `src/generated/app/categories.ts`

## IU-4: API Routes (HIGH)

**Requirements:**
- node-2e8c6f4a: rest api endpoints for crud operations on items and categories
- node-9f5c3e7b: endpoints validate input using zod schemas
- node-6a3f8e2c: get items supports search, categoryid, sort, order
- node-c4f9e6a1: sortable columns name, quantity, created_at ascending or descending
- node-7d2b8e5f: post returns 201 with created object, patch returns updated object
- node-a6f4e9c3: include low_stock boolean and category_name in item responses
- node-5e8c3f7a: return 400 for validation errors, 404 for not found

**Contract:** REST API endpoints for item operations with filtering and sorting
**Output:** `src/generated/app/api.ts`

## IU-5: Dashboard UI - Main Page (HIGH)

**Requirements:**
- node-7d3a8e5c: display items in sortable filterable table
- node-f2e6b9a1: table shows name, quantity, min quantity, category, edit/delete buttons
- node-a8c5e3d7: highlight low stock items with visual indicator (color #f38ba8)
- node-d9e3a6b4: support filtering by category and searching by name
- node-6c4f8e2a: provide create/edit/delete item buttons and category management button
- node-1a7c4e9d: dashboard served at root path redirecting to /ui/items-dashboard

**Contract:** Main dashboard page with sortable/filterable table and low stock row highlighting
**Output:** `src/generated/app/items-dashboard.ts`

## IU-6: Dashboard UI - Modals (HIGH)

**Requirements:**
- node-3e9b7d5f: open modal forms for creating/editing items and categories
- node-b5d2f8e6: modal forms must be pre-populated when editing
- node-c6a9f4e2: real-time filtering and sorting without page reload
- node-5d8b3e7f: client-side validation matching api validation rules
- node-2f7e9c5a: modal forms close after successful submission
- node-b2d8e5c4: all form inputs and selects must have visible labels
- node-7e4b1d9f: dialog modal backdrop blur 4px with 60 percent black overlay, centered, max-width 500px, max-height 90vh with scroll
- node-2a8f5d3c: dialog header flex with title h2 and close button, bottom border
- node-5e7b4c8a: dialog body padding 24px, form groups with label above input, 16px margin-bottom between groups
- node-9d3f7c2e: dialog footer top border, flex row with gap, right-aligned action buttons
- node-c5a8f4e6: form layout inputs full-width, two-column grid for related fields
- node-1b6e9d3a: close button top-right positioned, inherits text color, 24px font-size, no background

**Contract:** Modal dialogs for item/category CRUD with validation and pre-population
**Output:** `src/generated/app/modals.ts` (merged into items-dashboard.ts)

## IU-7: Dashboard UI - Theme & Styles (MEDIUM)

**Requirements:**
- node-8e5b3d7a: colors must be base #1e1e2e, text #cdd6f4, button #cba6f7, surface #45475a, input #313244, border #585b70, low stock #f38ba8
- node-9a4e7c3b: use catppuccin mocha aesthetic
- node-3f8c6e2d: spacing 8px base unit, section margins 24px, component padding 16px, element gap 12px
- node-7b2e5c8f: border radius 8px for cards/containers, 6px for inputs/selects, 4px for buttons
- node-e5c9b4a2: elevation cards get shadow, modals get larger shadow
- node-1f6a9d7e: typography system-ui sans-serif, 14px base, 1.5 line-height, 18px headings
- node-4d7b2e6c: hover states lighten background 10 percent
- node-a3e9c6f1: layout max-width 1400px container centered with 24px padding
- node-8c5f3e7b: filter bar with search, category select, sort field, sort order, action buttons in horizontal row
- node-f6a1e8c9: table row height comfortable, cell padding 14px horizontal, 1px solid borders between rows
- node-3c9e5b7d: focus states blue outline for accessibility on inputs and buttons

**Contract:** Catppuccin Mocha themed CSS with component styles
**Output:** Inline in `src/generated/app/items-dashboard.ts`

## IU-8: Error Handling (MEDIUM)

**Requirements:**
- node-4d8e2c9b: invalid json requests return 400 with descriptive message
- node-b7f5e3a8: validation errors return 400 with specific field errors
- node-2c9f7e6d: non-existent resources return 404
- node-f3c7a5e9: get categories returns list ordered by name
- node-8b4e2d9c: invalid json returns 400 with error message

**Contract:** Error handling middleware and consistent error responses
**Output:** `src/generated/app/errors.ts` (merged into api.ts)

## Summary

| IU | Name | Risk | Requirements | Output |
|----|------|------|----------------|--------|
| IU-1 | Database Schema | LOW | 2 | src/db.ts (boundary) |
| IU-2 | Item Domain | HIGH | 9 | src/generated/app/items.ts |
| IU-3 | Category Domain | MEDIUM | 8 | src/generated/app/categories.ts |
| IU-4 | API Routes | HIGH | 7 | src/generated/app/api.ts |
| IU-5 | Dashboard Main | HIGH | 6 | src/generated/app/items-dashboard.ts |
| IU-6 | Dashboard Modals | HIGH | 12 | (merged) |
| IU-7 | Theme & Styles | MEDIUM | 11 | (inline) |
| IU-8 | Error Handling | MEDIUM | 5 | (merged) |

Total: 8 IUs (low=1, medium=3, high=4)
