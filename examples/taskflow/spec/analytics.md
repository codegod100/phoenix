# Analytics Dashboard

Real-time analytics for task management metrics.

## Metrics

- The system must track total tasks created, completed, and overdue
- The system must calculate average task completion time in hours
- The system must compute throughput as tasks completed per day over a rolling 7-day window
- Metrics must be computable from an array of task records (no database dependency)

## Priority Breakdown

- The system must report task count grouped by priority level
- The system must report task count grouped by current status
- Each breakdown must include percentage of total

## Team Performance

- The system must calculate per-assignee completion rate (done / total assigned)
- The system must identify the top performer (highest completion rate with minimum 3 tasks)
- Unassigned tasks must be excluded from team performance metrics
