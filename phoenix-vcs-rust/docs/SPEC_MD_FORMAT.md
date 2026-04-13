# Spec.md Format

The `spec.md` is human-readable specification that drives template selection and slot filling.

## Structure

```markdown
# App Name

## Overview
Brief description of what this application does.

## Template Hint (optional)
If you know the template you want: `template: python-textual`

## Required Features
- [ ] Feature one
- [ ] Feature two

## UI Layout
Describe the interface. The parser extracts:
- Widget types (header, sidebar, list, log, etc.)
- Layout structure (grid, vertical, horizontal)
- Navigation patterns

## Data/State
What data does the app manage?
- Configuration files
- User preferences  
- Runtime state

## Integrations
External services, APIs, or data sources.

## Styling
Visual appearance preferences.
```

## Template Slots

Each template declares what slots it needs:

| Slot | Description | Extracted From |
|------|-------------|----------------|
| `app_name` | Application name | `# Title` |
| `app_description` | Brief description | `## Overview` |
| `widgets` | UI components | `## UI Layout` |
| `data_model` | State structure | `## Data/State` |
| `key_bindings` | Keyboard shortcuts | `## Key Bindings` |
| `theme` | Visual theme | `## Styling` |

## Template Selection Algorithm

1. Parse spec.md into structured form
2. Score each template bundle:
   - Feature overlap (widgets, patterns)
   - Language/framework hints
   - Explicit template hint
3. Select highest scoring template
4. Fill all required slots
5. Generate with filled template
