# Task Management Service

A task management system for teams with priorities, assignments, and deadlines.

## Task Lifecycle

- REQUIREMENT: Users must create tasks with a title, description, and priority (low, medium, high, critical)
- REQUIREMENT: Each task must have a unique ID generated as a UUID v4
- REQUIREMENT: Tasks must support status transitions: open → in_progress → review → done, and done → open for reopening completed tasks
- CONSTRAINT: Invalid status transitions must be rejected with a clear error message
- REQUIREMENT: Tasks must track created_at and updated_at timestamps automatically
- REQUIREMENT: Completing a task must record the completion timestamp and duration
- REQUIREMENT: Tasks must support archiving to hide from active views while retaining data
- REQUIREMENT: Archived tasks must be restorable to their previous active status
- REQUIREMENT: The system must provide a function to list all archived tasks separately from active tasks
- REQUIREMENT: Tasks must support tagging with multiple labels for flexible categorization

## Assignment

- REQUIREMENT: Tasks must be assignable to a single user by user ID
- REQUIREMENT: Reassigning a task must log the previous assignee in an audit trail
- REQUIREMENT: Unassigned tasks must be queryable as a filtered list
- CONSTRAINT: Assignment must validate that the user ID is non-empty

## Search and Filtering

- REQUIREMENT: Tasks must be searchable by title substring (case-insensitive)
- REQUIREMENT: Tasks must be filterable by status, priority, assignee, and archived state
- REQUIREMENT: Search results must be sorted by priority (critical first) then by created_at
- CONSTRAINT: An empty search query must return all tasks

## Deadline Management

- REQUIREMENT: Tasks must support optional deadline dates
- REQUIREMENT: Overdue tasks (past deadline and not done) must be flagged automatically
- REQUIREMENT: The system must provide a function to list all overdue tasks
- CONSTRAINT: Setting a deadline in the past must produce a warning but still be allowed
