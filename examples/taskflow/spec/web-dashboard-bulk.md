# Dashboard Bulk Operations UI

Bulk selection, bulk actions, and confirmation dialogs.

## Bulk Selection

- REQUIREMENT: Clicking anywhere on a task card shall toggle its selection state for multi-select operations
- REQUIREMENT: Selected cards must display a prominent 3px solid blue (#89b4fa) left border indicator
- REQUIREMENT: Selected cards must use surface2 background color (#585b70) to clearly distinguish from unselected cards
- REQUIREMENT: The card cursor must change to pointer on hover to indicate clickability
- REQUIREMENT: Individual action buttons on cards (edit, archive, delete) must remain clickable without triggering card selection via stopPropagation
- REQUIREMENT: The header must include a bulk action bar when tasks are selected including delete selected and archive selected
- DEFINITION: The selection state is tracked by adding/removing task IDs from a selectedIds array in JavaScript
- DEFINITION: Card selection visual feedback uses CSS class 'selected' toggled on the card element

## Bulk Actions

- REQUIREMENT: The system must support bulk operations including delete multiple, archive multiple, and reassign multiple
- REQUIREMENT: The system must provide a function to bulk delete multiple tasks by ID list with confirmation modal

## Delete Operations

- REQUIREMENT: Users must be able to delete tasks by their unique ID
- REQUIREMENT: Each task card must have a delete button that opens a confirmation modal, not browser alert, before permanent removal
- REQUIREMENT: The delete button must use the danger color red and include a trash icon
- REQUIREMENT: Deleted tasks must be removed from all filtered views and search results

## Confirmation Modal

- REQUIREMENT: All confirmation dialogs must be custom modal overlays, not browser confirm or alert popups
- REQUIREMENT: Deleting a task must require confirmation via a custom modal dialog, not browser confirm or alert
