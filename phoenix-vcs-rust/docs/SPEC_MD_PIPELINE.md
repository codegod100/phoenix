# Spec.md → Template → Spec.ncl Pipeline

## Architecture

```
spec.md (human language)
    ↓
Template Bundle (template.ncl with {{slots}})
    ↓
LLM Prompt: "Fill this template using the spec"
    ↓
spec.ncl (filled template)
    ↓
Code Generation
    ↓
Working App
```

## Template Bundle Structure

```
bundles/
├── python-textual/
│   ├── bundle.ncl          # Bundle metadata (flake.nix, pyproject.toml, README.md)
│   ├── template.ncl          # Template with {{slots}} for spec
│   └── prompt.md             # Prompt template for LLM
├── python-flask/
│   ├── bundle.ncl
│   ├── template.ncl
│   └── prompt.md
└── rust-cli/
    ├── bundle.ncl
    ├── template.ncl
    └── prompt.md
```

## Template Format (template.ncl)

```nickel
{
  # SLOT: app_name - The application name from spec
  name = "{{app_name}}",
  
  # SLOT: app_description - Brief description from spec
  description = "{{app_description}}",
  
  # SLOT: template - Fixed for this bundle
  template = "python-textual",
  build_type = "python",
  
  # SLOT: ui_config - Generated from spec's UI section
  ui_config = {
    theme = "{{theme}}",
    
    # SLOT: layout_type - grid, vertical, or horizontal
    layout = {
      type = "{{layout_type}}",
      
      # SLOT: widgets - List of widgets from spec
      widgets = {{widgets}},
    },
    
    # SLOT: key_bindings - Extracted from spec
    key_bindings = {{key_bindings}},
    
    # SLOT: styles - CSS/styling from spec
    styles = {{styles}},
  },
  
  # SLOT: data_model - State management from spec
  data_model = {{data_model}},
}
```

## LLM Prompt Structure (prompt.md)

```markdown
# Task: Fill Template from Spec

You are a specification translator. Your job is to read a human-readable spec 
and fill in a Nickel template to produce a machine-readable specification.

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

1. Read the spec carefully and identify:
   - App name and description
   - UI components needed (header, sidebar, list, log, etc.)
   - Layout structure (grid, vertical, horizontal)
   - Key bindings and actions
   - Data/state management needs
   - Styling preferences

2. Fill in each {{slot}} in the template:
   - {{app_name}} → string from spec title
   - {{app_description}} → string from overview
   - {{theme}} → "dark" or "light" from spec
   - {{layout_type}} → "grid", "vertical", "horizontal"
   - {{widgets}} → Nickel array of widget records
   - {{key_bindings}} → Nickel array of key binding records
   - {{styles}} → Nickel record of CSS properties
   - {{data_model}} → Nickel record of state fields

3. Output ONLY valid Nickel code. No markdown fences, no explanations.

4. Ensure the output is syntactically valid Nickel that can be parsed.

## Output Format

Produce the filled template as valid Nickel code. Replace all {{slots}} 
with appropriate Nickel values.
```

## Slot Types

| Slot | Type | Example Fill |
|------|------|--------------|
| `app_name` | String | `"MyApp"` |
| `app_description` | String | `"A TUI for..."` |
| `theme` | String | `"dark"` |
| `layout_type` | String | `"grid"` |
| `widgets` | Array | `[{type="Header"...}, {...}]` |
| `key_bindings` | Array | `[{key="q", action="quit"}]` |
| `styles` | Record | `{colors={primary="#ff"}}` |
| `data_model` | Record | `{config={...}}` |

## Pipeline Implementation

```rust
/// Step 1: Find template bundles
fn discover_template_bundles() -> Vec<TemplateBundle> {
    // Scan bundles/ directory for template.ncl files
}

/// Step 2: Select best template for spec.md
fn select_template(spec_md: &str, bundles: &[TemplateBundle]) -> Option<&TemplateBundle> {
    // Use heuristics or LLM to match spec to template
    // Look for keywords: "terminal", "web", "api", "cli"
}

/// Step 3: Fill template using LLM
async fn fill_template_with_llm(
    spec_md: &str, 
    template: &TemplateBundle,
    api_key: &str
) -> Result<String> {
    // Build prompt with spec + template
    // Call LLM API
    // Return filled spec.ncl content
}

/// Step 4: Validate filled spec
fn validate_filled_spec(content: &str) -> Result<NickelSpec> {
    // Parse as valid Nickel
    // Check all required fields present
    // Type check where possible
}

/// Step 5: Generate code from filled spec
async fn generate_from_spec(spec: NickelSpec) -> Result<GeneratedApp> {
    // Use existing pipeline
}
```

## Template Matching Heuristics

| Spec Keywords | Suggested Template |
|---------------|-------------------|
| "terminal", "TUI", "console", "ncurses" | python-textual |
| "web", "browser", "HTTP", "REST" | python-flask |
| "API", "service", "microservice" | python-fastapi |
| "CLI", "command-line", "args" | rust-cli |
| "GUI", "desktop", "window" | tauri |
| "mobile", "iOS", "Android" | react-native |

## Example Flow

**spec.md:**
```markdown
# Log Viewer

## Overview
A terminal app to view and search log files.

## UI
- Header with file name
- Main log display (scrollable)
- Footer with line count
- Search bar at top

## Keys
- `/` - search
- `n` - next match
- `q` - quit
```

**template.ncl** (python-textual):
```nickel
{
  name = "{{app_name}}",
  template = "python-textual",
  ui_config = {
    layout = {
      type = "vertical",
      widgets = {{widgets}},
    },
    key_bindings = {{key_bindings}},
  },
}
```

**LLM fills:**
```nickel
{
  name = "Log Viewer",
  template = "python-textual",
  ui_config = {
    layout = {
      type = "vertical",
      widgets = [
        { type = "Header", title = "Log Viewer" },
        { type = "Input", id = "search", placeholder = "Search..." },
        { type = "LogView", id = "logs" },
        { type = "Footer" },
      ],
    },
    key_bindings = [
      { key = "/", action = "focus_search" },
      { key = "n", action = "next_match" },
      { key = "q", action = "quit" },
    ],
  },
}
```

## Benefits

1. **Human-friendly specs** - Write markdown, not Nickel
2. **Template reusability** - Same template fits many apps
3. **LLM bridges the gap** - Natural language → structured spec
4. **Type-safe output** - Nickel validation catches errors
5. **Iterative refinement** - Tweak spec, regenerate
