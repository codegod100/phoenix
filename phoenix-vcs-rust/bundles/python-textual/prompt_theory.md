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

The output MUST follow this exact FLAT structure:

```nickel
{
  # TheoryDocument metadata (REQUIRED)
  id = "dev.phoenix.{project-name}",
  description = "Human-readable description from spec",
  
  # Theory name (STRING, not a record!)
  theory = "{ProjectName}TUI",
  
  # Sort declarations - at TOP LEVEL, NOT inside a theory record
  sorts = [
    # Sub-theories that generate artifacts
    { name = "ThPyproject", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThCSS", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    # UI widget sorts from the spec
    { name = "Header", kind = { type = "structural" } },
    { name = "Sidebar", kind = { type = "structural" } },
    { name = "Footer", kind = { type = "structural" } },
    { name = "ListView", kind = { type = "structural" } },
    { name = "LogView", kind = { type = "structural" } },
    { name = "Static", kind = { type = "structural" } },
    { name = "Container", kind = { type = "structural" } },
    # Primitives
    { name = "String", kind = { type = "structural" } },
    { name = "Config", kind = { type = "structural" } },
  ],
  
  # Operations - at TOP LEVEL, NOT inside a theory record
  ops = [
    # Sub-theory generation operations
    { 
      name = "generate_pyproject",
      inputs = [{ name = "theory", sort = "ThPyproject" }, { name = "config", sort = "Config" }],
      output = "TOML"
    },
    { 
      name = "generate_nix",
      inputs = [{ name = "theory", sort = "ThNix" }, { name = "config", sort = "Config" }],
      output = "Nix"
    },
    { 
      name = "generate_app",
      inputs = [{ name = "theory", sort = "ThApp" }, { name = "config", sort = "Config" }],
      output = "Python"
    },
    { 
      name = "generate_css",
      inputs = [{ name = "theory", sort = "ThCSS" }, { name = "config", sort = "Config" }],
      output = "CSS"
    },
    { 
      name = "generate_readme",
      inputs = [{ name = "theory", sort = "ThREADME" }, { name = "config", sort = "Config" }],
      output = "Markdown"
    },
    # Composition operation
    {
      name = "compose_app",
      inputs = [
        { name = "pyproject", sort = "TOML" },
        { name = "app", sort = "Python" },
        { name = "css", sort = "CSS" },
        { name = "readme", sort = "Markdown" },
        { name = "config", sort = "Config" }
      ],
      output = "ThIntegratedApp"
    },
    # Widget constructors - extract from spec
    { name = "header", inputs = [{ name = "title", sort = "String" }], output = "Header" },
    { name = "sidebar", inputs = [], output = "Sidebar" },
    { name = "main", inputs = [], output = "MainContent" },
    { name = "footer", inputs = [{ name = "text", sort = "String" }], output = "Footer" },
    { name = "compose", inputs = [...], output = "UIConfig" },
  ],
  
  # UI CONFIGURATION - at TOP LEVEL (extra field, ignored by panproto)
  ui_config = {
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
    # Phoenix metadata (FIXED values)
    template = "python-textual",
    build_type = "python",
    version = "0.1.0",
  },
  
  # Extra metadata at top level (ignored by panproto)
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
}
```

## CRITICAL RULES

1. **FLAT structure**: sorts and ops at TOP LEVEL, NOT inside a theory record
2. **theory = "..."** is a STRING (the theory name), NOT a record
3. **ui_config at top level**: Phoenix extracts it, panproto ignores it
4. Include ALL required sorts: ThPyproject, ThNix, ThApp, ThCSS, ThREADME, ThIntegratedApp
5. Include generate_* operations for each Th* sort
6. Include compose_app operation for ThIntegratedApp
7. NEVER change `template = "python-textual"` or `build_type = "python"`
8. Extract ALL widget values from the markdown spec

## OUTPUT

Output ONLY the complete Nickel TheoryDocument. No markdown code fences, no explanations.
The output must be valid panproto TheoryDocument format.
