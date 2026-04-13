# Task: Generate Panproto TheoryDocument from Markdown

You are a theory document generator. Your task is to read a human-readable spec 
and generate a valid panproto TheoryDocument.

## Input Specification (Markdown)
```markdown
{{spec_content}}
```

## Target Contract (Nickel)
```nickel
{{contract_content}}
```

## CRITICAL: Decomposed Sorts (No UIConfig!)

Instead of one big UIConfig sort, DECOMPOSE into separate sorts:
- ProjectName (val sort - holds the string)
- ProjectDescription (val sort - holds the string)
- LayoutType, LayoutColumns, LayoutRows, LayoutGap (val sorts)
- WidgetTree (structural sort - holds widget hierarchy)
- KeyBindings (structural sort)
- Styles (structural sort)

## Required Structure

```nickel
{
  id = "dev.phoenix.{project-name}",
  description = "Human-readable description",
  theory = "{ProjectName}TUI",
  
  # Sorts - each UI concept is its own sort!
  sorts = [
    # Artifact sub-theories
    { name = "ThPyproject", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThCSS", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    
    # UI value sorts (kind with type and value_kind)
    { name = "ProjectName", kind = { type = "val", value_kind = "string" } },
    { name = "ProjectDescription", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutType", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutColumns", kind = { type = "val", value_kind = "integer" } },
    { name = "LayoutRows", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutGap", kind = { type = "val", value_kind = "integer" } },
    
    # UI structural sorts
    { name = "WidgetTree", kind = { type = "structural" } },
    { name = "KeyBindings", kind = { type = "structural" } },
    { name = "Styles", kind = { type = "structural" } },
    
    # Widget types (each is a sort)
    { name = "Header", kind = { type = "structural" } },
    { name = "Sidebar", kind = { type = "structural" } },
    { name = "MainContent", kind = { type = "structural" } },
    { name = "Footer", kind = { type = "structural" } },
    { name = "ListView", kind = { type = "structural" } },
    { name = "LogView", kind = { type = "structural" } },
    { name = "Static", kind = { type = "structural" } },
    { name = "Container", kind = { type = "structural" } },
    
    # Primitives
    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
  ],
  
  # Operations - one constructor per sort
  ops = [
    # Sub-theory generation
    { name = "generate_pyproject", inputs = [...], output = "TOML" },
    { name = "generate_nix", inputs = [...], output = "Nix" },
    { name = "generate_app", inputs = [...], output = "Python" },
    { name = "generate_css", inputs = [...], output = "CSS" },
    { name = "generate_readme", inputs = [...], output = "Markdown" },
    
    # Value constructors (mk_X creates sort X)
    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_layout_type", inputs = [{ name = "type", sort = "String" }], output = "LayoutType" },
    { name = "mk_layout_columns", inputs = [{ name = "cols", sort = "Number" }], output = "LayoutColumns" },
    
    # Widget constructors
    { name = "mk_header", inputs = [{ name = "id", sort = "String" }, { name = "title", sort = "String" }, { name = "show_clock", sort = "Bool" }], output = "Header" },
    { name = "mk_sidebar", inputs = [...], output = "Sidebar" },
    { name = "mk_list_view", inputs = [...], output = "ListView" },
    { name = "mk_static", inputs = [...], output = "Static" },
    { name = "mk_log_view", inputs = [...], output = "LogView" },
    { name = "mk_container", inputs = [...], output = "Container" },
    { name = "mk_footer", inputs = [...], output = "Footer" },
    
    # Composition
    { name = "mk_widget_tree", inputs = [{ name = "widgets", sort = "Array Widget" }], output = "WidgetTree" },
    { name = "mk_key_bindings", inputs = [{ name = "bindings", sort = "Array KeyBindings" }], output = "KeyBindings" },
    
    # Final composition for ThNix
    {
      name = "compose_app",
      inputs = [
        { name = "name", sort = "ProjectName" },
        { name = "desc", sort = "ProjectDescription" },
        { name = "layout_type", sort = "LayoutType" },
        { name = "widgets", sort = "WidgetTree" },
        { name = "keys", sort = "KeyBindings" },
      ],
      output = "ThIntegratedApp"
    },
  ],
  
  # Phoenix instance data
  phoenix_config = {
    project_name = "Extracted from # heading",
    project_description = "Extracted from ## Overview",
    layout_type = "grid",
    layout_columns = 2,
    layout_rows = "1fr 3fr auto",
    layout_gap = 1,
    widgets = [
      # Extract all widgets from spec
    ],
    key_bindings = [
      # Extract from ## Key Bindings
    ],
    styles = {},
  },
  
  # Metadata
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
}
```

## KEY INSIGHT: Decomposed Sorts

- **val sorts**: Hold actual values (ProjectName = "Simple TUI")
  - Use: `{ kind = { type = "val", value_kind = "string" } }`
- **structural sorts**: Hold structure (WidgetTree, KeyBindings)
  - Use: `{ kind = { type = "structural" } }`
- Each concept has its own sort - no UIConfig wrapper!
- ThNix composes the sorts together in compose_app

## CRITICAL RULES

1. **NO UIConfig sort** - decompose into ProjectName, LayoutType, WidgetTree, etc.
2. **val sorts** for primitive values: `{ kind = { type = "val", value_kind = "string" } }`
3. **structural sorts** for complex types: `{ kind = { type = "structural" } }`
4. One constructor per sort: `mk_project_name`, `mk_header`, etc.
5. `compose_app` brings all the decomposed sorts together for ThIntegratedApp

## OUTPUT

Output ONLY the complete Nickel TheoryDocument with decomposed sorts.
No markdown code fences, no explanations.
