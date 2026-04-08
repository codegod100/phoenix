# Analytics Dashboard

Real-time analytics for task management metrics.

## Metrics

- REQUIREMENT: The system must track total tasks created, completed, and overdue
- REQUIREMENT: The system must calculate average task completion time in hours
- REQUIREMENT: The system must compute throughput as tasks completed per day over a rolling 7-day window
- CONSTRAINT: Metrics must be computable from an array of task records with no database dependency

## Priority Breakdown

- REQUIREMENT: The system must report task count grouped by priority level
- REQUIREMENT: The system must report task count grouped by current status
- REQUIREMENT: Each breakdown must include percentage of total

## Team Performance

- REQUIREMENT: The system must calculate per-assignee completion rate as done divided by total assigned
- REQUIREMENT: The system must identify the top performer with highest completion rate and minimum 3 tasks
- CONSTRAINT: Unassigned tasks must be excluded from team performance metrics
