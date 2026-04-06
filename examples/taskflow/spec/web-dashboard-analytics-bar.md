# Dashboard Analytics Bar UI

Compact status bar for key metrics display.

## Status Bar Layout

- The dashboard must include a compact status bar showing key metrics inline
- The status bar must render as a single horizontal bar below the header
- The status bar must be visually compact (max 48px height) with minimal padding
- The status bar must be centered horizontally and only as wide as its content (not full-width)
- The status bar must not consume vertical space like the previous metric cards design

## Status Bar Metrics

- The status bar must display: total tasks count, completed count, overdue count, archived count, and completion rate percentage
- Metrics must be displayed inline with simple separators (e.g., "•" or "|")
- Format example: "📊 12 tasks • ✅ 8 done • ⚠️ 2 overdue • 📦 3 archived • 📈 67%"
- Use subtle text colors: primary metric values in --ctp-text, labels/separators in --ctp-subtext0
- No emoji icons larger than the text itself, no card backgrounds, no hover effects

## Metrics Calculation

- The system must track total tasks created, completed, overdue, and archived
- The system must calculate average task completion time in hours
- Metrics must be computable from an array of task records (no database dependency)
