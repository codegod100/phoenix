# Task: Generate Nickel Spec from Markdown Using Contracts

You are a specification generator. Your task is to read a human-readable spec 
and generate a valid Nickel configuration that satisfies a given contract.

## Input Specification (Markdown)
```markdown
{{spec_content}}
```

## Target Contract (Nickel)
```nickel
{{contract_content}}
```

## Contract Explanation

The contract defines a record with:
- **Fields with `| Type`**: These are CONTRACTS - you MUST provide values of that type
- **Fields with `=`**: These are FIXED values - do NOT change them
- **`let ContractName = {...} in {}`**: Type definitions for nested structures

Example contract field:
```nickel
name | String,  # CONTRACT: Must provide a string value
```

Your output MUST satisfy: `name` is a string like `"MyApp"`

## Widget Contract

The `widgets | Array Widget` field expects an array where each item has:
- `type`: Widget type ("Header", "Footer", "Container", "ListView", "Static", "Input", "LogView")
- `id`: Unique string identifier for this widget
- `title`: Optional display text
- `children`: Nested array of widgets (for containers)
- Type-specific fields based on widget type

Common widget patterns from the spec:
- **Header** with title → `{ type = "Header", id = "header", title = "...", show_clock = true }`
- **ListView** with items → `{ type = "ListView", id = "...", items = ["..."], focusable = true }`
- **Static** text → `{ type = "Static", id = "...", content = "..." }`
- **Container** with children → `{ type = "Container", id = "...", children = [...] }`
- **LogView** → `{ type = "LogView", id = "...", max_lines = 100, follow_tail = true }`

## KeyBinding Contract

The `key_bindings | Array KeyBinding` expects:
```nickel
[
  { key = "q", action = "quit", context = "global" },
  { key = "h", action = "help", context = "global" },
]
```

Extract key bindings from the ## Key Bindings section.

## Generation Rules

1. **Satisfy ALL contracts**: Every field marked with `| Type` must have a value
2. **Keep FIXED values**: Never change fields with `=` (like `template = "python-textual"`)
3. **Extract from spec**: All values must come from the markdown spec provided
4. **Use proper Nickel syntax**:
   - Strings: `"value"` (with quotes)
   - Numbers: `42` (no quotes)
   - Booleans: `true` or `false`
   - Arrays: `[item1, item2]`
   - Records: `{ field = value, ... }`

## Required Output Structure

Generate a COMPLETE Nickel record that looks like:

```nickel
{
  name = "Extracted from # heading",
  description = "Extracted from ## Overview",
  template = "python-textual",  # FIXED - do not change
  build_type = "python",        # FIXED - do not change
  spec_version = "1.0",
  version = "0.1.0",
  ui_config = {
    theme = "dark",
    show_header = true,
    show_footer = true,
    refresh_rate_hz = 60,
    layout = {
      type = "grid",
      columns = 2,
      rows = "1fr 3fr auto",
      gap = 1,
      focus = {
        initial = "nav_list",
        wrap = true,
      },
      widgets = [
        # Generate widgets from ## UI Layout section
      ],
    },
    key_bindings = [
      # Generate from ## Key Bindings section
    ],
    styles = {},  # Empty if not specified
  },
  data_model = {},  # Empty if not specified
  integrations = {},  # Empty if not specified
}
```

## OUTPUT

Output ONLY the complete Nickel record. No markdown code fences, no explanations.
The output must be valid Nickel syntax that could be type-checked against the contract.
