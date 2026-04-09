# Dashboard Analytics Bar UI

Compact status bar for key metrics display.

## Status Bar Layout

- REQUIREMENT: The dashboard must include an elegant analytics bar showing key metrics inline
- REQUIREMENT: The status bar must render as a horizontal bar below the header with comfortable spacing
- REQUIREMENT: The status bar must have ~56px height with generous vertical padding for visual breathing room
- REQUIREMENT: The status bar must be centered horizontally and only as wide as its content, not full-width
- REQUIREMENT: The status bar must use a subtle surface0 background with rounded 8px corners for a modern card-like appearance

## Status Bar Metrics

- REQUIREMENT: The status bar must display total tasks count, completed count, overdue count, archived count, and completion rate percentage
- REQUIREMENT: Each metric must be displayed as a pill-shaped badge with surface1 background, 6px 12px padding, and 4px border-radius
- REQUIREMENT: Metric values must use font-weight 600 (semibold) in --ctp-text color
- REQUIREMENT: Metric labels must use font-weight 400 in --ctp-subtext0 color with a colon separator
- REQUIREMENT: Format example: "Tasks: 12" "Done: 8" "Overdue: 2" "Archived: 3" "Rate: 67%"
- REQUIREMENT: Badges must have 8px gap between them and subtle hover effect with surface2 background
- REQUIREMENT: Use consistent icon prefixes (📋 ✓ ⚠ 🗄 📊) with font-size matching text (0.85rem)
- DEFINITION: Completion rate badge uses accent color (#89b4fa) for the percentage value to highlight success metric

## Metrics Calculation

- REQUIREMENT: The system must track total tasks created, completed, overdue, and archived
- REQUIREMENT: The system must calculate average task completion time in hours
- CONSTRAINT: Metrics must be computable from an array of task records with no database dependency
