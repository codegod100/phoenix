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

## CRITICAL: TheoryDocument Structure

The output MUST follow this exact FLAT structure with UIConfig as a SORT:

```nickel
{
  # TheoryDocument metadata (REQUIRED)
  id = "dev.phoenix.{project-name}",
  description = "Human-readable description from spec",
  
  # Theory name (STRING, not a record!)
  theory = "{ProjectName}TUI",
  
  # Sort declarations - at TOP LEVEL
  sorts = [
    # Sub-theories that generate artifacts
    { name = "ThPyproject", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThCSS", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    # UI types - UIConfig is a PROPER SORT!
    { name = "UIConfig", kind = { type = "structural" } },
    { name = "Widget", kind = { type = "structural" } },
    { name = "Header", kind = { type = "structural" } },
    { name = "Sidebar", kind = { type = "structural" } },
    { name = "Footer", kind = { type = "structural" } },
    { name = "ListView", kind = { type = "structural" } },
    { name = "LogView", kind = { type = "structural" } },
    { name = "Static", kind = { type = "structural" } },
    { name = "Container", kind = { type = "structural" } },
    { name = "KeyBinding", kind = { type = "structural" } },
    # Primitives
    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
  ],
  
  # Operations - at TOP LEVEL
  ops = [
    # Sub-theory generation operations
    { name = "generate_pyproject", inputs = [...], output = "TOML" },
    { name = "generate_nix", inputs = [...], output = "Nix" },
    { name = "generate_app", inputs = [...], output = "Python" },
    { name = "generate_css", inputs = [...], output = "CSS" },
    { name = "generate_readme", inputs = [...], output = "Markdown" },
    # UIConfig constructor - creates UIConfig instances!
    {
      name = "mk_ui_config",
      inputs = [
        { name = "name", sort = "String" },
        { name = "description", sort = "String" },
        { name = "layout_type", sort = "String" },
        { name = "columns", sort = "Number" },
        { name = "rows", sort = "String" },
        { name = "gap", sort = "Number" },
        { name = "widgets", sort = "Array Widget" },
        { name = "key_bindings", sort = "Array KeyBinding" },
      ],
      output = "UIConfig"
    },
    # Widget constructors - extract from spec
    { name = "mk_header", inputs = [...], output = "Header" },
    { name = "mk_sidebar", inputs = [...], output = "Sidebar" },
    { name = "mk_list_view", inputs = [...], output = "ListView" },
    ...
  ],
  
  # PHOENIX CONFIG - the actual UI values (extra field, ignored by panproto)
  phoenix_config = {
    name = "Project Name",
    description = "From spec overview",
    layout = {
      type = "grid",
      columns = 2,
      rows = "1fr 3fr auto",
      gap = 1,
      widgets = [
        { type = "Header", id = "header", title = "...", show_clock = true },
        # ... extract ALL widgets from spec
      ],
    },
    key_bindings = [
      { key = "q", action = "quit", context = "global" },
      # ... extract from ## Key Bindings section
    ],
    styles = {},
  },
  
  # Extra metadata at top level (ignored by panproto)
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
}
```

## KEY INSIGHT: UIConfig is a Sort

- **UIConfig** is a proper sort (type) in the theory, like `ThApp` or `Header`
- **mk_ui_config** is an operation that produces UIConfig values
- **phoenix_config** is the actual instance data Phoenix uses
- panproto loads the theory (sorts, ops) and ignores phoenix_config
- Phoenix extracts phoenix_config separately after loading

## CRITICAL RULES

1. **UIConfig as sort**: Include `{ name = "UIConfig", kind = { type = "structural" } }` in sorts
2. **mk_ui_config operation**: Define this constructor in ops
3. **phoenix_config at top level**: The actual values Phoenix uses
4. **FLAT structure**: sorts/ops at top level, NOT nested in theory record
5. **theory = "..."** is a STRING (the theory name), NOT a record
6. NEVER change `template = "python-textual"` or `build_type = "python"`

## OUTPUT

Output ONLY the complete Nickel TheoryDocument. No markdown code fences, no explanations.
The output must be valid panproto TheoryDocument format with UIConfig as a sort.
