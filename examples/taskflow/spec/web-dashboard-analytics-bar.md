# Dashboard Analytics Bar UI

Compact status bar for key metrics display.

## Status Bar Layout

- REQUIREMENT: The dashboard must include a compact status bar showing key metrics inline
- REQUIREMENT: The status bar must render as a single horizontal bar below the header
- REQUIREMENT: The status bar must be visually compact with max 48px height and minimal padding
- REQUIREMENT: The status bar must be centered horizontally and only as wide as its content, not full-width
- CONSTRAINT: The status bar must not consume vertical space like the previous metric cards design

## Status Bar Metrics

- REQUIREMENT: The status bar must display total tasks count, completed count, overdue count, archived count, and completion rate percentage
- REQUIREMENT: Metrics must be displayed inline with simple separators such as bullet or pipe
- REQUIREMENT: Format example is 12 tasks, 8 done, 2 overdue, 3 archived, 67% completion rate
- REQUIREMENT: Use subtle text colors with primary metric values in --ctp-text and labels or separators in --ctp-subtext0
- CONSTRAINT: No emoji icons larger than the text itself, no card backgrounds, no hover effects

## Metrics Calculation

- REQUIREMENT: The system must track total tasks created, completed, overdue, and archived
- REQUIREMENT: The system must calculate average task completion time in hours
- CONSTRAINT: Metrics must be computable from an array of task records with no database dependency
