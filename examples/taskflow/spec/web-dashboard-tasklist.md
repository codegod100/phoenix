# Dashboard Task List UI

Task card display, badges, and responsive grid layout.

## Task Grid Layout

- REQUIREMENT: The dashboard must render all tasks as styled cards in a responsive grid layout
- REQUIREMENT: The layout must be responsive with single column on mobile and multi-column grid on desktop
- REQUIREMENT: Completed tasks with status=done must display in a separate section below active tasks within the Active tab
- REQUIREMENT: The done tasks section must have a clear visual separator and heading indicating completed tasks
- REQUIREMENT: Done tasks must use the same responsive grid layout as active tasks with identical column widths, gaps, and breakpoints

## Task Card Display

- REQUIREMENT: Each task card must show title, description, priority badge, status badge, assignee, and deadline
- REQUIREMENT: Cards must have subtle shadows, rounded corners of 8px, and hover effects

## Priority Badges

- REQUIREMENT: Priority badges must be color-coded with critical=red, high=orange, medium=yellow, low=green

## Status Badges

- REQUIREMENT: Status badges must be color-coded with open=gray, in_progress=blue, review=purple, done=green, archived=overlay0(dim)

## Overdue Indicator

- REQUIREMENT: Overdue tasks must have a red border and an OVERDUE indicator

## Status Transitions

- REQUIREMENT: Each card must have buttons for status transitions based on current status

## Data Persistence

- REQUIREMENT: Tasks must persist in browser localStorage and survive page refreshes
- REQUIREMENT: The dashboard must immediately display all tasks from localStorage on page load with no manual refresh needed
