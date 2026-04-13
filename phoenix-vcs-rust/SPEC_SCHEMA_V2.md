# Simplified Spec Schema V2

## Problem with Current Schema
The current schema uses deep nesting (`ui_config.layout.widgets`) and named record fields which makes formal parsing difficult:
- Must handle `ui_config` → `layout` → `widgets` traversal
- Widget names are record keys, requiring field_name extraction
- Mixed value types (strings, records, arrays) at each level

## Proposed Simplified Schema

### Flat Widget Array
Instead of nested records, use a flat array with explicit ordering:

```nickel
{
  spec_version = "2.0",
  name = "simple-tui",
  
  # Widgets are a flat array - order defines render order
  widgets = [
    {
      id = "header",
      type = "Header",
      title = "Simple TUI",
      subtitle = "Terminal Application",
      show_clock = true,
      # Layout hints (optional, can be inferred)
      layout = { row = 1, col_span = 2 },
    },
    {
      id = "sidebar",
      type = "Vertical",
      title = "Navigation",
      layout = { row = 2, col = 1, width = 25 },
      focus = { order = 1 },
      children = [
        { id = "nav_list", type = "ListView" },
        { id = "status", type = "Static", content = "Ready" },
      ],
    },
    {
      id = "main",
      type = "Static",
      title = "Main Content",
      layout = { row = 2, col = 2 },
      focus = { order = 2 },
    },
    {
      id = "footer",
      type = "Footer",
      title = "Simple TUI v0.1.0",
      layout = { row = 3, col_span = 2 },
    },
  ],
  
  # Focus config at top level
  focus = {
    initial = "nav_list",
    wrap = true,
  },
  
  # Styling (optional, can have defaults)
  styles = {
    theme = "dark",
    # CSS-in-Nickel for widget styling
    rules = [
      { selector = "header", background = "#1a1a2e", color = "#eee" },
      { selector = "sidebar", border = "solid #333", width = 25 },
    ],
  },
  
  # Key bindings (unchanged, already works well)
  key_bindings = [
    { key = "q", action = "quit", context = "global" },
    { key = "tab", action = "focus_next", context = "navigation" },
  ],
}
```

## Benefits

### 1. Easier Formal Parsing
**Old (hard):**
```rust
// Must traverse: ui_config → layout → widgets (record)
// Then extract field names as widget IDs
// Then recurse into each widget record
```

**New (simple):**
```rust
// widgets is an array - just iterate
for widget in widgets_array.children() {
    let id = widget.child_by_field_name("id")?.text();
    let wtype = widget.child_by_field_name("type")?.text();
}
```

### 2. Deterministic Order
- Array order = render order = focus order
- No need for separate `focus_order` fields
- Simpler code generation: `for widget in widgets { ... }`

### 3. Consistent Structure
Every widget has same fields:
- `id` (string)
- `type` (string) 
- `title`, `content` (optional strings)
- `layout` (optional record)
- `focus` (optional record)
- `children` (optional array)

### 4. Simpler Code Generation
**Old code gen:**
```python
# Must handle nested structure, extract from different depths
header = widgets["header"]  # record access
sidebar = widgets["sidebar"]
for child in sidebar["children"]:
    ...
```

**New code gen:**
```python
# Flat iteration
for widget in spec.widgets:
    if widget.type == "Header":
        yield Header(widget.title)
    elif widget.children:
        for child in widget.children:
            ...
```

## Migration Path

1. **Add V2 parser** alongside V1 (backward compatible)
2. **New specs use V2** schema (simpler, recommended)
3. **Old specs still work** with V1 parser
4. **Auto-migration tool** could convert V1 → V2

## Formal Extraction (Pseudocode)

With the new schema, tree-sitter extraction becomes trivial:

```rust
fn extract_widgets(root: Node) -> Vec<Widget> {
    let widgets_field = find_field(root, "widgets")?;
    let widgets_array = widgets_field.value();  // array node
    
    widgets_array.children()
        .filter(|n| n.kind() == "record")  // each array element is a widget record
        .map(|widget_node| {
            Widget {
                id: extract_string_field(widget_node, "id"),
                widget_type: extract_string_field(widget_node, "type"),
                children: extract_optional_array(widget_node, "children"),
                // ... all fields are direct children
            }
        })
        .collect()
}
```

No recursion needed for traversal, no depth tracking, no key/value separation.

## Impact on Generated Code

The generated Textual code becomes cleaner:

**Old (from nested records):**
```python
class Dashboard(App):
    def compose(self):
        # Had to generate in specific order, handle nested children
        yield Header(self.spec["ui_config"]["layout"]["widgets"]["header"]["title"])
        with Vertical(id="sidebar"):
            for child in self.spec["ui_config"]["layout"]["widgets"]["sidebar"]["children"]:
                yield self.create_widget(child)
```

**New (from flat array):**
```python
class Dashboard(App):
    def compose(self):
        # Just iterate widgets in order
        for w in self.spec["widgets"]:
            yield self.create_widget(w)
    
    def create_widget(self, w):
        if w["type"] == "Header":
            return Header(w["title"])
        elif w["children"]:
            with self.create_container(w) as container:
                for child in w["children"]:
                    yield self.create_widget(child)
```

## Decision

This is a **breaking change** to the spec schema, but:
- Makes formal theory implementation trivial
- Eliminates the "cat and mouse" parsing game
- Generated code is cleaner
- Easier for users to write specs
- Matches how most UI frameworks describe trees (React, Flutter, etc.)

**Recommendation**: Implement V2 schema and make it the default. Keep V1 parser for backward compatibility.
