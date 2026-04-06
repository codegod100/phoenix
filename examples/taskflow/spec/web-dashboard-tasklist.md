# Dashboard Task List UI

Task card display, badges, and responsive grid layout.

## Task Grid Layout

- The dashboard must render all tasks as styled cards in a responsive grid layout
- The layout must be responsive: single column on mobile, multi-column grid on desktop
- Completed tasks (status=done) must display in a separate section below active tasks within the Active tab
- The done tasks section must have a clear visual separator and heading indicating completed tasks
- Done tasks must use the same responsive grid layout as active tasks (identical column widths, gaps, and breakpoints)

## Task Card Display

- Each task card must show: title, description, priority badge, status badge, assignee, and deadline
- Cards must have subtle shadows, rounded corners (8px), and hover effects

## Priority Badges

- Priority badges must be color-coded: critical=red, high=orange, medium=yellow, low=green

## Status Badges

- Status badges must be color-coded: open=gray, in_progress=blue, review=purple, done=green, archived=overlay0(dim)

## Overdue Indicator

- Overdue tasks must have a red border and an "OVERDUE" indicator

## Status Transitions

- Each card must have buttons for status transitions (based on current status)

## Data Persistence

- Tasks must persist in browser localStorage and survive page refreshes
- The dashboard must immediately display all tasks from localStorage on page load (no manual refresh needed)
