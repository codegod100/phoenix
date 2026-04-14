# Panproto Protocol Migration Examples

This folder contains **pure panproto** protocol definitions demonstrating Generalized Algebraic Theory (GAT) based data migration and language parsing.

## Files

### Task Protocols

| File | Description |
|------|-------------|
| `task_v1.ncl` | Simple task theory with 4 sorts, 10 ops, 5 equations |
| `task_v2.ncl` | Enhanced task theory with 12 sorts, 25 ops, 6 equations |
| `migrate_v1_v2.ncl` | Theory morphism defining v1 → v2 migration |

### JSX Component Protocols

| File | Description |
|------|-------------|
| `jsx_v1.ncl` | Simple JSX-like component theory |
| `jsx_v2.ncl` | Enhanced JSX with fragments, conditionals, state |
| `migrate_jsx_v1_v2.ncl` | Theory morphism for JSX migration |

### Python Protocols

| File | Description |
|------|-------------|
| `python_base.ncl` | **Base Python protocol** - core language constructs |
| `python_component.ncl` | **Python component protocol** - composes `python.base` for UI components |
| `../examples/python_parser_demo.rs` | Parser integration using tree-sitter-python |
| `../examples/nickel_to_python_migration.rs` | **Cross-protocol migration** - Task (Nickel) → Python Component |
| `example_component.py` | Example Python component file to parse |

## What is Panproto?

Panproto is a framework for **protocol evolution** using category theory and type theory:

- **Theories** define the structure (sorts, operations, equations)
- **Morphisms** define transformations between theories
- **Migrations** apply morphisms to actual data instances

## Protocol Composition

The Python component protocol demonstrates **composition** from a base protocol:

```nickel
# python_component.ncl
{
  id = "python.component",
  description = "Python UI component protocol",
  
  # Compose from base Python protocol
  compose = "python.base",
  
  theory = {
    name = "PythonComponent",
    
    sorts = [
      # Inherited from python.base
      { name = "Module", params = [], kind = "type" },
      { name = "ClassDef", params = [], kind = "type" },
      { name = "FunctionDef", params = [], kind = "type" },
      ...
      
      # NEW: Component-specific sorts
      { name = "ComponentClass", params = [], kind = "type" },
      { name = "PropsClass", params = [], kind = "type" },
      { name = "StateClass", params = [], kind = "type" },
      { name = "UIElement", params = [], kind = "type" },
    ]
  }
}
```

## Parsing Python with Tree-Sitter

The `python_parser.rs` demonstrates how to parse actual Python code into the protocol:

```rust
// Get base Python protocol from registry
let registry = ParserRegistry::new();
let python_parser = registry.get_parser("python");
let base_protocol = registry.get_python_base_protocol();
let component_protocol = registry.get_python_component_protocol();

// Parse a Python file
let module = parse_python_file("example_component.py")?;

// Analyze for component patterns
let analysis = analyze_components(&module);

// Convert to theory representation
let theory_repr = module_to_component_theory(&module);
```

### Python Base Protocol Structure

The base Python protocol (`python_base.ncl`) defines:

**Sorts (Types):**
- `Module`, `ClassDef`, `FunctionDef`, `Statement`, `Expression`
- `Import`, `Parameters`, `Decorators`, `Type`, `Attribute`

**Operations:**
- Module: `module(name, imports, statements) → Module`
- Class: `class_def(name, bases, body) → ClassDef`
- Function: `func_def(name, params, return_type, body) → FunctionDef`
- Literals: `lit_str(s)`, `lit_int(n)`, `lit_bool(b)`, `lit_none`
- Control: `if_stmt(cond, then, else)`, `for_stmt(var, iterable, body)`, `return_stmt(value)`

### Python Component Protocol Extension

The component protocol adds:

**New Sorts:**
- `ComponentClass` - UI component with lifecycle
- `PropsClass` - @dataclass for props
- `StateClass` - @dataclass for state
- `UIElement` - Widget tree nodes

**New Operations:**
- `component_class(name, props, state, bases, lifecycle, render, handlers) → ComponentClass`
- `props_class(name, fields) → PropsClass`
- `state_class(name, fields) → StateClass`
- UI widgets: `ui_box(attrs, children)`, `ui_button(attrs, text, event)`, `ui_text(expr)`

## Example: Parsing a Python Component

The `example_component.py` file contains a `Counter` component:

```python
@dataclass
class CounterProps:
    initial_value: int = 0

@dataclass  
class CounterState:
    count: int = 0

class Counter(Component):
    def __init__(self, props: CounterProps):
        self.props = props
        self.state = CounterState(count=props.initial_value)
        
    def increment(self, event=None):
        self.state.count += 1
        self.render()
        
    def render(self):
        # Conditional rendering
        show_reset = self.state.count != self.props.initial_value
        
        ui_tree = {...}
        
        if show_reset:
            ui_tree["children"].append({"type": "button", ...})
            
        return ui_tree
```

When parsed, this generates:

```json
{
  "theory": "python.component",
  "module": "counter_component",
  "components": [{
    "name": "Counter",
    "base_class": "Component",
    "props_class": "CounterProps",
    "state_class": "CounterState",
    "has_mount": true,
    "has_unmount": true,
    "has_update": false
  }],
  "props": [{
    "name": "CounterProps",
    "fields": [
      {"name": "initial_value", "type_hint": "int", "has_default": true, "default_value": "0"}
    ]
  }],
  "state": [{
    "name": "CounterState",
    "fields": [
      {"name": "count", "type_hint": "int", "initial_value": "0"}
    ]
  }],
  "event_handlers": [{
    "class_name": "Counter",
    "method_name": "increment",
    "event_type": "click",
    "updates_state": true
  }],
  "render_methods": [{
    "class_name": "Counter",
    "has_conditionals": true,
    "has_loops": false
  }]
}
```

## Theory Structure

Each `.ncl` file is a **TheoryDocument**:

```nickel
{
  id = "unique.identifier",
  description = "Human readable",
  
  theory = {
    name = "TheoryName",
    
    # Types in the theory
    sorts = [
      { name = "SortName", params = [], kind = "type" }
    ],
    
    # Constructors and functions
    ops = [
      { name = "op_name", inputs = ["SortA"], output = "SortB" }
    ],
    
    # Axioms / invariants
    equations = [
      { name = "eq_name", lhs = ..., rhs = ... }
    ]
  }
}
```

## Migration Structure

A **TheoryMorphism** defines how to transform between theories:

```nickel
{
  id = "migration.id",
  source = "source.theory.id",
  target = "target.theory.id",
  
  morphism = {
    name = "MorphismName",
    
    # Type mappings
    sort_mappings = [
      { source = "SortA", target = "SortA", kind = "direct" }
    ],
    
    # Operation mappings with transformations
    op_mappings = [
      { source = "op1", target = "op1", transformation = "identity" },
      { source = "old_op", target = "new_op", transformation = { type = "expand_args", ... } }
    ]
  }
}
```

## Loading with Panproto

```rust
use panproto_theory_dsl::load_and_compile;

// Load source theory
let v1 = load_and_compile("protocols/task_v1.ncl", &resolver)?;

// Load target theory  
let v2 = load_and_compile("protocols/task_v2.ncl", &resolver)?;

// Load morphism
let morphism = load_morphism("protocols/migrate_v1_v2.ncl", &v1, &v2)?;

// Apply to data
let v2_data = morphism.apply(v1_data)?;
```

## References

- [panproto](https://github.com/panproto/panproto) - Protocol evolution framework
- [GATs](https://ncatlab.org/nlab/show/generalized+algebraic+theory) - Generalized Algebraic Theories
- [Theory Morphisms](https://ncatlab.org/nlab/show/morphism+of+algebraic+theories) - Mathematical foundation
- [tree-sitter-python](https://github.com/tree-sitter/tree-sitter-python) - Python parser

## Cross-Protocol Migration Example

The `nickel_to_python_migration.rs` example demonstrates migrating data between different protocol families:

### Source → Target
- **Source**: `task.v2` (Nickel/GAT theory)
- **Target**: `python.component` (Python class hierarchy)

### Migration Rules

| Nickel (Task) | Python (Component) |
|---------------|-------------------|
| `Task` record | `Task{id}Component` class |
| `id`, `title`, `priority` fields | Props class with default values |
| `status` field | State class (mutable, tracked) |
| `assignee` | Props field (Optional[str]) |
| `due_date` | Props field (Optional[str]) |
| `tags` | Props field (List[str]) |
| `relations` | Not directly mapped (complex) |
| Status values | Event handlers (mark_in_progress, mark_done, cancel) |
| Priority | Conditional UI rendering |

### Generated Python Structure

```python
@dataclass
class Task_001_Props:
    task_id: str = "task-001"
    title: str = "Implement auth"
    initial_status: str = "todo"
    priority: str = "High"
    due_date: Optional[str] = "2026-04-20T17:00:00Z"
    tags: List[str] = ["security", "backend"]
    assignee_id: Optional[str] = "alice"

@dataclass
class Task_001_State:
    status: str = self.props.initial_status
    updated_at: str = "2026-04-13T10:00:00Z"

class Task_001_Component(Component):
    def __init__(self, props: Task_001_Props):
        self.props = props
        self.state = Task_001_State(...)
    
    def mark_in_progress(self, event=None):
        self.state.status = "in_progress"
        self.render()
    
    def render(self):
        return {"type": "div", "class": "task-card", ...}
```

### Usage

```bash
cargo run --example nickel_to_python_migration
```

This generates Python component code from Nickel task data and saves it to `task_component_generated.py`.

## Code Generation: Parse vs Generate

Panproto supports **both directions** - parsing existing code AND generating new code:

### 1. Parsing (Input → Schema)

```rust
// Parse existing Python code into schema
let registry = ParserRegistry::new();
let python_parser = registry.get_python_parser();
let module = parse_python_file("example.py")?;
```

### 2. Generation (Schema → Output)

```rust
// Generate Python code from schema using panproto
#[cfg(feature = "panproto")]
{
    use panproto_project::{Generator, TargetLanguage, CodeGenOptions};
    
    let generator = Generator::new(
        TargetLanguage::Python,
        CodeGenOptions {
            use_dataclasses: true,
            use_type_hints: true,
        }
    );
    
    let python_code = generator.generate(&schema)?;
}
```

### Generation Approaches

| Approach | Example | When to Use |
|----------|---------|-------------|
| **Manual** (string concat) | `examples/nickel_to_python_migration.rs` | Simple, one-off, full control |
| **Panproto** (schema-driven) | `examples/panproto_generation_demo.rs` | Multi-language, validated, maintained |

### Manual Generation Example

```rust
// Direct string manipulation - error prone
fn generate_python(props: &[(String, String)]) -> String {
    let mut code = "@dataclass\nclass Props:\n".to_string();
    for (name, ty) in props {
        code.push_str(&format!("    {}: {}\n", name, ty));
    }
    code
}
```

### Panproto Generation Example

```rust
// Schema-driven, validated, multi-language
let schema = SchemaBuilder::new()
    .add_vertex(Vertex {
        id: "Task".to_string(),
        properties: [
            ("id".to_string(), Property::string()),
            ("title".to_string(), Property::string()),
        ].into()
    })
    .build();

// Generate Python
let python = Generator::new(TargetLanguage::Python, opts).generate(&schema)?;

// Generate TypeScript  
let typescript = Generator::new(TargetLanguage::TypeScript, opts).generate(&schema)?;

// Generate Rust
let rust = Generator::new(TargetLanguage::Rust, opts).generate(&schema)?;
```

### Supported Languages for Generation

When using `panproto-project`:
- **Python** (dataclasses, attrs, Pydantic)
- **TypeScript** (interfaces, types)
- **Rust** (structs, enums with serde)
- **Go** (structs with tags)
- **Java** (classes, records)
- **C#** (classes, records)
- And 10+ more...

### Migration Generation

Panproto can also generate **migration code** between schema versions:

```rust
// Generate migration lens between v1 and v2
let lens = project.generate_lens(
    &old_schema, 
    &new_schema,
    TargetLanguage::Python
)?;

// The generated code converts v1 data to v2 format
let migrated_data = lens.apply(v1_data)?;
```

### Examples

| Example | Direction | Method |
|---------|-----------|--------|
| `python_parser_demo.rs` | Parse Python → Schema | tree-sitter |
| `nickel_to_python_migration.rs` | Nickel → Python (manual gen) | String concat |
| `panproto_generation_demo.rs` | Schema → Multi-language | panproto-project |


## Emit with Protocol Example

The `emit_with_protocol_demo.rs` demonstrates protocol-based code generation:

```rust
// Create component schema (instance of python.component protocol)
let schema = ComponentSchema {
    protocol_id: "python.component",
    component_name: "Counter",
    props: PropsSchema { ... },
    state: StateSchema { ... },
    methods: vec![...],
    render_tree: RenderNodeSchema { ... },
};

// Emit code using protocol
let registry = EmitRegistry::new();
let python_code = registry.emit_with_protocol("python.component", &schema)?;
```

This is the inverse of parsing - instead of:
- **Parse**: Python file → Schema (using tree-sitter)
- **Emit**: Schema → Python file (using protocol emitter)

The `emit_with_protocol` function:
1. Looks up the emitter for the requested protocol
2. Validates schema conforms to protocol
3. Generates idiomatic Python code

### Generated Output

```python
# Auto-generated from python.component protocol
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

@dataclass
class CounterProps:
    initial_count: int = 0
    step: int = 1

@dataclass
class CounterState:
    count: int = self.props.initial_count

class CounterComponent:
    def __init__(self, props: CounterProps):
        self.props = props
        self.state = CounterState(...)

    def increment(self, event: Optional[Any]):
        self.state.count = self.state.count + self.props.step
        self.render()

    def render(self) -> Dict[str, Any]:
        return {
            "type": "div",
            "attrs": {"class": "counter"},
            "children": [...]
        }
```


## Real API Usage: emit_with_protocol

The `emit_with_protocol_demo.rs` uses the actual panproto API (requires `--features panproto`):

```rust
use panproto_parse::ParserRegistry;

// Create registry with all 248+ language parsers
let registry = ParserRegistry::new();

// Parse Python file to Schema
let schema = registry.parse_file(path, content)?;

// Emit back using protocol emitter
let python_bytes = registry.emit_with_protocol("python", &schema)?;
```

This demonstrates **roundtrip capability**:
1. Parse Python source → Schema (AST representation)
2. Schema → Python source (emit)

### Running

```bash
cargo run --example emit_with_protocol_demo --features panproto
```

Output:
- Parses `protocols/example_component.py`
- Shows detected protocol: `python`
- Shows schema vertices (Module, ClassDef, FunctionDef, etc.)
- Re-emits Python code to `example_component_emitted.py`


## Updated: emit_with_protocol Behavior

The `emit_with_protocol` API is designed for **roundtrip parsing**, not cross-language translation:

```rust
// Parse Python → Schema
let schema = registry.parse_file("python", content)?;

// Roundtrip: emit back to Python (reconstructs source)
let python = registry.emit_with_protocol("python", &schema)?;

// ⚠️ Not translation: emitting with different protocol
// attempts reconstruction but preserves original structure
let typescript = registry.emit_with_protocol("typescript", &schema)?;
// Result: TypeScript file with Python-like structure
```

**Important distinction:**
- **Roundtrip**: Parse Python → Schema → Emit Python (reconstructs original)
- **Cross-emit**: Parse Python → Schema → Emit TypeScript (structural mapping, not semantic translation)

For true cross-language code generation, use `panproto-project` with language-specific generators:

```rust
use panproto_project::{Generator, TargetLanguage};

// Generate idiomatic TypeScript from schema
let generator = Generator::new(TargetLanguage::TypeScript, opts);
let ts_code = generator.generate(&schema)?;
```

