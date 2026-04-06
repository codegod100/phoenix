# Task Dashboard Web Client

A single-page web dashboard for managing tasks. Served as HTML from the server.

## Dashboard Page

- The dashboard must render a complete HTML page with inline CSS and JavaScript
- The page must display a header with the title "TaskFlow" and a task count summary
- The page must include a form to create new tasks with fields: title, description, priority dropdown, and optional deadline date
- The create form must validate that title is non-empty before submission

## Task List Display

- The dashboard must render all tasks as styled cards in a responsive grid layout
- Each task card must show: title, description, priority badge, status badge, assignee, and deadline
- Priority badges must be color-coded: critical=red, high=orange, medium=yellow, low=green
- Status badges must be color-coded: open=gray, in_progress=blue, review=purple, done=green
- Overdue tasks must have a red border and an "OVERDUE" indicator
- Each card must have buttons for status transitions (based on current status)
- Each task card must have an edit button that opens a modal to modify task properties
- Each task card must have a delete button with a confirmation dialog before permanent removal
- The delete button must use the danger color (red) and include a trash icon
- Bulk selection checkboxes must appear on each task card for multi-select operations
- The header must include a bulk action bar when tasks are selected: delete selected, archive selected
- Archived tasks must be viewable via a separate "Archived" tab or filter
- The edit modal must contain pre-populated form fields for all editable properties
- The edit modal must have save and cancel buttons with clear visual distinction

## Task Management

- Users must be able to delete tasks by their unique ID
- Deleting a task must require confirmation before permanent removal
- Deleted tasks must be removed from all filtered views and search results
- The system must provide a function to bulk delete multiple tasks by ID list
- Users must be able to edit task properties: title, description, priority, deadline, and assignee
- Editing a task must update the updated_at timestamp automatically
- The system must maintain an edit history showing previous values for audit purposes
- Users must be able to archive completed tasks (hide from active views but retain data)
- Archived tasks must be queryable separately and restorable to active status
- The system must support bulk operations: delete multiple, archive multiple, reassign multiple

## Analytics Panel

- The dashboard must include a compact status bar showing key metrics inline
- The status bar must display: total tasks count, completed count, overdue count, and completion rate percentage
- The status bar must render as a single horizontal bar below the header
- The status bar must be visually compact (max 48px height) with minimal padding
- Metrics must be displayed inline with simple separators (e.g., "•" or "|")
- Format example: "📊 12 tasks • ✅ 8 done • ⚠️ 2 overdue • 📈 67%"
- Use subtle text colors: primary metric values in --ctp-text, labels/separators in --ctp-subtext0
- No emoji icons larger than the text itself, no card backgrounds, no hover effects
- The status bar must not consume vertical space like the previous metric cards design

## Catppuccin Theme

- The dashboard must use the Catppuccin Mocha color palette exclusively
- Background color: #1e1e2e (base), card background: #313244 (surface0)
- Text color: #cdd6f4 (text), secondary text: #a6adc8 (subtext0)
- Primary accent: #89b4fa (blue), success: #a6e3a1 (green), warning: #f9e2af (yellow), danger: #f38ba8 (red)
- Priority critical: #f38ba8 (red), high: #fab387 (peach), medium: #f9e2af (yellow), low: #a6e3a1 (green)
- Status open: #6c7086 (overlay0), in_progress: #89b4fa (blue), review: #cba6f7 (mauve), done: #a6e3a1 (green)
- The dashboard must use CSS custom properties for all Catppuccin colors
- No theme toggle or system preference detection - Catppuccin Mocha is the only theme

## Styles

- The dashboard must use CSS custom properties for theming (--primary, --danger, --success, --warning colors)
- The layout must be responsive: single column on mobile, multi-column grid on desktop
- Cards must have subtle shadows, rounded corners (8px), and hover effects
- The font must be system-ui with appropriate size hierarchy (h1: 1.5rem, body: 0.95rem)
- Buttons must have rounded corners, appropriate padding, and cursor pointer
