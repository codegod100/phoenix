// Bundle Author Bundle - Native Rust Code Generation
// This bundle generates other Phoenix VCS bundles

use std::collections::HashMap;
use std::path::PathBuf;

/// Generate all files for a new bundle
pub fn generate(bundle_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let mut files = HashMap::new();
    let sanitized = bundle_name.to_lowercase().replace(" ", "-").replace("_", "-");
    
    // Parse spec for description and template type
    let description = extract_description(spec_content);
    let template_type = detect_template_type(spec_content);
    
    files.insert(PathBuf::from("bundle.ncl"), generate_bundle_ncl(&sanitized, &description, &template_type));
    files.insert(PathBuf::from("template_contract.ncl"), generate_template_contract_ncl());
    files.insert(PathBuf::from("theory_contract_panproto.ncl"), generate_theory_contract_ncl(&sanitized));
    files.insert(PathBuf::from("prompt_theory.md"), generate_prompt_theory_md(&sanitized, &description));
    files.insert(PathBuf::from("prompt_contract.md"), generate_prompt_contract_md(&sanitized));
    
    files
}

/// Extract description from spec content
fn extract_description(spec_content: &str) -> String {
    // Look for description field
    for line in spec_content.lines() {
        if line.contains("description") && line.contains("=") {
            if let Some(start) = line.find('"') {
                let rest = &line[start + 1..];
                if let Some(end) = rest.find('"') {
                    return rest[..end].to_string();
                }
            }
        }
    }
    "A Phoenix VCS bundle".to_string()
}

/// Detect template type from spec
fn detect_template_type(spec_content: &str) -> String {
    let content = spec_content.to_lowercase();
    if content.contains("rust") || content.contains("cargo") {
        "rust"
    } else if content.contains("typescript") || content.contains("ts") {
        "typescript"
    } else if content.contains("python") || content.contains("py") {
        "python"
    } else if content.contains("swift") {
        "swift"
    } else if content.contains("node") || content.contains("js") {
        "javascript"
    } else {
        "generic"
    }.to_string()
}

/// Generate bundle.ncl
fn generate_bundle_ncl(name: &str, description: &str, template_type: &str) -> String {
    format!(r#"# Phoenix VCS Bundle Definition
# Bundle: {}
# Template Type: {}
{{
  # Bundle metadata
  name = "{}",
  description = "{}",
  version = "0.1.0",
  
  # The template this bundle generates
  template = {{
    # Template identifier (used by LLM selection)
    id = "{}",
    
    # Human-readable name
    name = "{}",
    
    # Description for LLM bundle selection
    description = "{}",
    
    # Keywords for matching (legacy - now using LLM semantic matching)
    keywords = ["{}"],
    
    # Build system
    build = "{}",
  }},
  
  # Files this bundle generates (relative to project root)
  files = [
    "bundle.ncl",
    "template_contract.ncl", 
    "theory_contract_panproto.ncl",
    "prompt_theory.md",
    "prompt_contract.md",
  ],
  
  # Generator configuration
  generator = {{
    type = "rust-native",
    rust_generator = "generate.rs",
    entry_point = "generate.rs",
  }},
}}"#, name, template_type, name, description, name, name, description, template_type, 
        if template_type == "rust" { "cargo" } 
        else if template_type == "javascript" { "npm" }
        else if template_type == "python" { "poetry" }
        else { "custom" })
}

/// Generate template_contract.ncl
fn generate_template_contract_ncl() -> String {
    r#"# Template Contract: GAT + Term Algebra for Code Generation
# This file defines the type system for generated templates

{
  # The GAT (Generalized Algebraic Theory) for this template
  Template = {
    # Sorts (types in the object language)
    Sorts = {
      Widget = "Widget",
      Event = "Event",
      Handler = "Handler",
      State = "State",
    },
    
    # Operations (constructors)
    Operations = {
      # Widget creation
      widget = fun name: String -> { name = name, type = "Widget" },
      
      # Event binding
      on_event = fun widget: Widget -> event: String -> handler: Handler -> {
        widget = widget,
        event = event,
        handler = handler,
      },
      
      # State management
      state = fun name: String -> initial: Dyn -> {
        name = name,
        initial = initial,
        type = "State",
      },
    },
    
    # Equations (semantic constraints)
    Equations = {
      # Widget names must be unique
      unique_widgets = "∀ w1, w2 : Widget. w1.name = w2.name → w1 = w2",
      
      # Events must be bound to valid handlers
      valid_handlers = "∀ e : Event. ∃ h : Handler. bound(e, h)",
    },
  },
  
  # Term algebra for code generation
  Term = {
    # Base term
    base = fun spec: Spec -> { source = spec, type = "Term" },
    
    # Widget term
    widget = fun name: String -> attrs: Attrs -> { 
      widget = name, 
      attributes = attrs,
      type = "WidgetTerm",
    },
    
    # Handler term
    handler = fun event: String -> action: String -> {
      event = event,
      action = action,
      type = "HandlerTerm",
    },
  },
}
"#.to_string()
}

/// Generate theory_contract_panproto.ncl
fn generate_theory_contract_ncl(bundle_name: &str) -> String {
    format!(r#"# Panproto Theory Contract for {}
# Maps specification concepts to implementation constructs

{{
  # Domain-Specific Vocabulary
  Vocabulary = {{
    # Sorts (domain types)
    sorts = [
      "Widget",      # UI component
      "Event",       # User interaction
      "Handler",     # Event callback
      "State",       # Application state
      "View",        # Visual container
    ],
    
    # Operations (actions/verbs)
    operations = [
      "create",      # Instantiate a widget
      "bind",        # Connect event to handler
      "update",      # Modify state
      "render",      # Display widget
      "compose",     # Combine widgets
    ],
    
    # Predicates (properties)
    predicates = [
      "visible",     # Widget is displayed
      "interactive",  # Widget accepts input
      "valid",       # State is valid
      "focused",     # Widget has focus
    ],
  }},
  
  # Formal Theory Mapping
  Theory = {{
    # Object-level theory (target language)
    ObjectTheory = "{}",
    
    # Meta-level theory (specification language)
    MetaTheory = "panproto-v1",
    
    # Interpretation function (spec → code)
    Interpretation = {{
      # Sort interpretation
      μ_Widget = "struct {0} {{ ... }}",
      μ_Event = "enum Event {{ ... }}",
      μ_Handler = "fn handle(event: Event)",
      μ_State = "use_state(initial)",
      
      # Operation interpretation
      μ_create = "Widget::new(...)",
      μ_bind = "widget.on(event, handler)",
      μ_update = "state.set(new_value)",
      μ_render = "widget.render()",
      μ_compose = "Container::new([...])",
    }},
  }},
  
  # Code Generation Rules
  Generation = {{
    # Sort → Code mapping
    sort_to_code = {{
      Widget = "generate_widget",
      Event = "generate_event",
      Handler = "generate_handler",
      State = "generate_state",
    }},
    
    # Operation → Code mapping
    op_to_code = {{
      create = "generate_create",
      bind = "generate_bind",
      update = "generate_update",
      render = "generate_render",
      compose = "generate_compose",
    }},
  }},
}}
"#, bundle_name, bundle_name)
}

/// Generate prompt_theory.md
fn generate_prompt_theory_md(bundle_name: &str, description: &str) -> String {
    format!(r#"# {} Bundle - Theory Prompt

## Overview
This bundle generates {} applications.

## Template Identity
- **Name**: {}
- **Type**: Application Template
- **Build System**: Custom
- **Target Language**: Various

## Domain Vocabulary

### Sorts (Types)
- **Widget**: UI component with visual representation
- **Event**: User interaction or system notification
- **Handler**: Callback function responding to events
- **State**: Mutable application data
- **View**: Container for multiple widgets

### Operations (Actions)
- **create**: Instantiate a new widget instance
- **bind**: Connect an event to a handler
- **update**: Modify application state
- **render**: Display a widget or view
- **compose**: Combine multiple widgets into a view

### Predicates (Properties)
- **visible**: Widget is currently displayed
- **interactive**: Widget accepts user input
- **valid**: State satisfies constraints
- **focused**: Widget has input focus

## Code Generation Mapping

### μ: Spec → Code (Interpretation Function)

| Spec Concept | Code Pattern |
|--------------|--------------|
| Widget | Struct or class definition |
| Event | Enum variant or event type |
| Handler | Function or method |
| State | Variable with reactivity |
| create | Constructor call |
| bind | Event listener registration |
| update | State mutation |
| render | Render method call |
| compose | Container composition |

## Example Transformation

**Spec Input:**
```
sorts: {{ name: "Counter", type: "Widget" }}
operations: {{ 
  event: "click", 
  handler: "increment",
  state: {{ count: 0 }}
}}
```

**Generated Code:**
```
// Counter widget with click handler
```

## Constraints
1. All widget names must be unique within a view
2. Every event must have a bound handler
3. State updates must not create cycles
4. Widgets must be composed into a view hierarchy
"#, bundle_name, description, bundle_name)
}

/// Generate prompt_contract.md
fn generate_prompt_contract_md(bundle_name: &str) -> String {
    format!(r#"# {} Bundle - Contract Prompt

## Purpose
Generate the 5 bundle definition files for a new Phoenix VCS template.

## Output Format

You must generate exactly these files:

### 1. bundle.ncl
```ncl
{{
  name = "{}",
  description = "...",
  template = {{ id = "...", name = "...", build = "..." }},
  files = [...],
}}
```

### 2. template_contract.ncl
Define the GAT (Generalized Algebraic Theory) with:
- Sorts: Widget, Event, Handler, State, etc.
- Operations: create, bind, update, render, compose
- Equations: constraints on valid specs

### 3. theory_contract_panproto.ncl
Define the theory mapping:
- Vocabulary (sorts, operations, predicates)
- Theory mapping to target language
- Code generation rules

### 4. prompt_theory.md
Document the domain vocabulary and interpretation function μ.

### 5. prompt_contract.md
This file - documenting the generation contract.

## Input Processing

From the spec, extract:
1. Bundle name and description
2. Target language/framework
3. Build system requirements
4. Domain-specific vocabulary
5. Code generation patterns

## Generation Rules

1. **bundle.ncl**: Must have valid Nickel syntax
2. **template_contract.ncl**: Must define complete GAT
3. **theory_contract_panproto.ncl**: Must map all sorts to code
4. **prompt_theory.md**: Must document μ function
5. **prompt_contract.md**: Must specify output format

## Constraints

- All Nickel files must be syntactically valid
- Theory contracts must use panproto format
- Prompts must be complete and self-contained
- Generated bundles must follow naming conventions
"#, bundle_name, bundle_name)
}
