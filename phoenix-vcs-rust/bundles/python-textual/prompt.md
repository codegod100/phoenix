# Task: Fill Python-Textual Template from Spec

You are a specification translator specializing in Terminal User Interfaces (TUI).
Your job is to read a human-readable spec and fill in a Nickel template to produce
a complete, machine-readable specification for a Textual-based Python application.

## Input

### Spec (Human Language)
```markdown
{{spec_content}}
```

### Template (With Slots)
```nickel
{{template_content}}
```

## Instructions

1. **Extract from spec**:
   - **App name**: From `# Title` heading
   - **Description**: From `## Overview` or first paragraph
   - **Version**: Look for semantic version (e.g., "0.1.0") or default to "0.1.0"
   - **Theme**: Look for "dark" or "light" (default: "dark")
   - **Layout**: "grid", "vertical", or "horizontal" (default: "vertical")
   - **Widgets**: Identify all UI components mentioned (header, sidebar, list, log, input, etc.)
   - **Key bindings**: Look for "key", "shortcut", "press" patterns
   - **Data**: What state/data does the app manage?
   - **Styling**: Colors, sizes, appearance preferences

2. **Fill template slots** using valid Nickel syntax:
   - `{{app_name}}` → `"App Name"` (string)
   - `{{version}}` → `"0.1.0"` (string)
   - `{{theme}}` → `"dark"` or `"light"`
   - `{{show_header}}` → `true` or `false`
   - `{{show_footer}}` → `true` or `false`
   - `{{widgets}}` → `[{type="Header"...}, {...}]` (array of records)
   - `{{key_bindings}}` → `[{key="q", action="quit"}]` (array)
   - `{{styles}}` → `{colors={...}}` (record)
   - `{{data_model}}` → `{...}` (record)

3. **Widget types** you can use:
   - `Header` - App header bar (title, show_clock)
   - `Footer` - Status bar at bottom
   - `Container` - Layout container (Vertical/Horizontal)
   - `List` or `ListView` - Scrollable list (items, focusable)
   - `LogView` - Scrollable log display (max_lines, follow_tail)
   - `Static` - Text display (content)
   - `Input` - Text input field
   - `Button` - Clickable button
   - `DataTable` - Tabular data display
   - `TextArea` - Multi-line text input

4. **Layout rules**:
   - If spec mentions "grid", "columns", "rows" → use `type = "grid"`
   - If spec mentions "sidebar + main" → use containers with children
   - Always give widgets meaningful `id` fields
   - Use `focusable = true/false` appropriately

5. **Key binding actions**:
   - Common: "quit", "help", "refresh", "command", "focus_next", "focus_prev"
   - App-specific: describe what the key does
   - Use `context = "global"` or `context = "navigation"`

## Output Format

Output ONLY valid Nickel code. No markdown code fences, no explanations.
The output must parse as valid Nickel and can be used directly as spec.ncl.

Replace ALL {{slots}} with concrete values. Do not leave any {{placeholders}}.

## Example Filling

Input spec mentions:
- "# Log Viewer" → `name = "Log Viewer"`
- "Shows log files" → `description = "Shows log files"`
- "dark theme" → `theme = "dark"`
- "header with file name" → widget: `{type="Header", title="Log Viewer"}`
- "q to quit" → binding: `{key="q", action="quit", context="global"}`

## Output
```nickel
{
  name = "...",
  description = "...",
  ...
}
```
