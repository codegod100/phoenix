# Todoist-style Task Manager

A personal task manager for organizing work and life. Users manage tasks across projects with priorities, due dates, and completion tracking. The app should be usable from a web browser and integratable from other applications so tasks can surface in Slack, calendar apps, and other tools.

## Tasks

- A task has a title, an optional description, a priority (urgent, high, normal, low), an optional due date, and a completion status
- Users can create tasks by providing at least a title
- Users can view all their tasks, with the most urgent and overdue tasks shown first
- Users can mark a task as complete or reopen a completed task
- Users can edit a task's title, description, priority, or due date at any time
- Users can delete a task permanently
- Overdue tasks must be visually highlighted so they stand out
- Completed tasks must be visually distinct from active tasks (e.g., strikethrough, dimmed)

## Projects

- A project has a name and a color for visual identification
- Users can create projects to group related tasks
- Users can assign a task to a project, or leave it in a default "Inbox" with no project
- Users can view tasks filtered by project
- Users can delete a project only if it contains no tasks; the system must warn them otherwise
- The project list must show how many active (incomplete) tasks each project has

## Filtering and Views

- Users can filter tasks by status: all, active (not completed), or completed
- Users can filter tasks by project
- Users can filter tasks by priority
- Filters must be combinable: a user can view "all urgent tasks in the Work project" for example
- The current filter state must be visible so users know what they're looking at

## Quick Stats

- Users must see a summary showing: total tasks, completed tasks, overdue tasks, and completion percentage
- The summary must update immediately when tasks are created, completed, or deleted

## Integration

- The system must expose a programmatic interface so external tools can create, read, update, and delete tasks and projects
- The programmatic interface must use standard conventions so it works with common integration platforms (Zapier, Slack bots, calendar sync)
- Every task and project must have a stable unique identifier that external systems can reference

## Web Experience

- When users open the app in a browser, they see their task list immediately with no login required
- The main view shows a sidebar with projects (each with its color dot and active task count) and an "Inbox" option for unassigned tasks
- The main area shows the task list for the currently selected project or inbox, with the stats summary at the top
- Each task shows its title, priority as a colored badge (urgent=red, high=orange, normal=blue, low=gray), project name if assigned, due date if set, and a checkbox to toggle completion
- Completed tasks appear with a strikethrough title and dimmed appearance
- Overdue tasks have a red highlight or badge showing they are past due
- There is a prominent "Add task" form at the top of the task list with fields for title, description (collapsible), priority dropdown, project dropdown, and due date picker
- Filter buttons for All / Active / Completed appear above the task list, along with a priority filter dropdown
- Users can delete a task via a small delete button that appears on hover
- The design must be clean, modern, and responsive with a maximum content width of 800px, system-ui font, and a light neutral color scheme with colored accents for priorities and projects
- All interactions (create, complete, edit, delete, filter) must work without page reloads by calling the programmatic interface and updating the display

## Data Integrity

- Task titles must not be empty and must not exceed 500 characters
- Descriptions must not exceed 5000 characters
- Priority must always be one of: urgent, high, normal, low
- Due dates must be valid dates; the system must reject obviously invalid dates
- Deleting a project must never silently delete its tasks
- The system must never lose data due to concurrent updates; last-write-wins is acceptable for this version
