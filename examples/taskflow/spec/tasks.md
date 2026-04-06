# Task Management Service

A task management system for teams with priorities, assignments, and deadlines.

## Task Lifecycle

- Users must create tasks with a title, description, and priority (low, medium, high, critical)
- Each task must have a unique ID generated as a UUID v4
- Tasks must support status transitions: open → in_progress → review → done, and done → open for reopening completed tasks
- Invalid status transitions must be rejected with a clear error message
- Tasks must track created_at and updated_at timestamps automatically
- Completing a task must record the completion timestamp and duration
- Tasks must support archiving to hide from active views while retaining data
- Archived tasks must be restorable to their previous active status
- The system must provide a function to list all archived tasks separately from active tasks

## Assignment

- Tasks must be assignable to a single user by user ID
- Reassigning a task must log the previous assignee in an audit trail
- Unassigned tasks must be queryable as a filtered list
- Assignment must validate that the user ID is non-empty

## Search and Filtering

- Tasks must be searchable by title substring (case-insensitive)
- Tasks must be filterable by status, priority, assignee, and archived state
- Search results must be sorted by priority (critical first) then by created_at
- An empty search query must return all tasks

## Deadline Management

- Tasks must support optional deadline dates
- Overdue tasks (past deadline and not done) must be flagged automatically
- The system must provide a function to list all overdue tasks
- Setting a deadline in the past must produce a warning but still be allowed
