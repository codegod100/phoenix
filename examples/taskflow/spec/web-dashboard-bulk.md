# Dashboard Bulk Operations UI

Bulk selection, bulk actions, and confirmation dialogs.

## Bulk Selection

- Bulk selection checkboxes must appear on each task card for multi-select operations
- The header must include a bulk action bar when tasks are selected: delete selected, archive selected

## Bulk Actions

- The system must support bulk operations: delete multiple, archive multiple, reassign multiple
- The system must provide a function to bulk delete multiple tasks by ID list with confirmation modal

## Delete Operations

- Users must be able to delete tasks by their unique ID
- Each task card must have a delete button that opens a confirmation modal (not browser alert) before permanent removal
- The delete button must use the danger color (red) and include a trash icon
- Deleted tasks must be removed from all filtered views and search results

## Confirmation Modal

- All confirmation dialogs must be custom modal overlays (not browser confirm()/alert() popups)
- Deleting a task must require confirmation via a custom modal dialog (not browser confirm/alert)
