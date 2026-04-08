# Dashboard Task Edit UI

Inline task editing with in-place edit form.

## Create Task Form

- REQUIREMENT: The page must include a form to create new tasks with fields for title, description, priority dropdown, and optional deadline date
- CONSTRAINT: The create form must validate that title is non-empty before submission

## Inline Edit Form

- REQUIREMENT: Each task card must have an edit button that replaces the card content with an edit form, not a modal dialog
- REQUIREMENT: The edit form must appear in place of the task card content and contain pre-populated fields for all editable properties
- REQUIREMENT: The card content must be wrapped in a card-content div that can be hidden via CSS display property
- REQUIREMENT: The edit form must be a sibling element to the card-content div, not nested inside it
- REQUIREMENT: Clicking edit must hide the card-content div and show the edit-form div using inline style display toggling

## Edit Form Controls

- REQUIREMENT: The edit form must have save and cancel buttons with clear visual distinction
- REQUIREMENT: Clicking cancel or saving must restore the task card view by hiding edit-form and showing card-content
- REQUIREMENT: Users must be able to edit task properties including title, description, priority, deadline, and assignee

## Edit Persistence

- REQUIREMENT: Editing a task must update the updated_at timestamp automatically
