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

The output MUST follow this exact structure:

```nickel
{
  # TheoryDocument metadata
  id = "dev.phoenix.{project-name}",
  description = "Human-readable description from spec",
  
  # Theory definition - this is a RECORD containing the spec
  theory = {
    theory = "{ProjectName}",    # Theory NAME inside the spec record
    extends = [],                  # Parent theories (empty for now)
    
    # Sorts - sub-theories that generate artifacts + UI sorts
    sorts = [
      { name = "ThPyproject", kind = { type = "structural" } },
      { name = "ThNix", kind = { type = "structural" } },
      { name = "ThApp", kind = { type = "structural" } },
      { name = "ThCSS", kind = { type = "structural" } },
      { name = "ThREADME", kind = { type = "structural" } },
      # UI widget sorts from the spec
      { name = "Header", kind = { type = "structural" } },
      { name = "Sidebar", kind = { type = "structural" } },
      { name = "Footer", kind = { type = "structural" } },
      { name = "ListView", kind = { type = "structural" } },
      { name = "LogView", kind = { type = "structural" } },
    ],
    
    # Operations - constructors for the theory
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
      # Widget constructors - extract from spec widgets
      { 
        name = "header",
        inputs = [{ name = "title", sort = "String" }],
        output = "Header"
      },
      { 
        name = "compose",
        inputs = [
          { name = "h", sort = "Header" },
          { name = "s", sort = "Sidebar" },
          { name = "m", sort = "MainContent" },
          { name = "f", sort = "Footer" },
        ],
        output = "UIConfig"
      },
    ],
  },
  
  # UI configuration - instance data OUTSIDE the theory spec
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
  },
  
  # Metadata (FIXED values - do NOT change)
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
}
```

## CRITICAL RULES

1. **theory = { ... }** is a RECORD, not a string!
2. **theory.theory = "..."** inside that record is the theory name
3. Include ALL required fields: `id`, `description`, `theory`, `ui_config`
4. `theory.sorts` must include: ThPyproject, ThNix, ThApp, ThCSS, ThREADME
5. `theory.ops` must include: generate_* operations for each Th* sort
6. `ui_config` contains the actual widget instances - extract from spec
7. NEVER change `template = "python-textual"` or `build_type = "python"`
8. Extract ALL values from the markdown spec provided

## OUTPUT

Output ONLY the complete Nickel TheoryDocument. No markdown code fences, no explanations.
The output must be a valid TheoryDocument that panproto_theory_dsl::load() can parse.
