# Lambeq → Rust: Components for Phoenix Pipeline

## Overview

Lambeq is Cambridge Quantum Computing's Python library for DisCoCat (Categorical Compositional Distributional) semantics. It provides formal grammar parsing via:
1. **Pregroup grammar** (DisCoCat) - categorical compositional semantics
2. **CCG** (Combinatory Categorial Grammar) - efficient natural language parsing
3. **String diagrams** - visual/graph representation of compositions

## Architecture Mapping: Lambeq → Phoenix

```
┌─────────────────────────────────────────────────────────────────────┐
│ Lambeq (Python)                          │ Phoenix (Rust)             │
├─────────────────────────────────────────────────────────────────────┤
│ text2diagram/pregroup_tree.py            │ pipeline/kitty_panproto_   │
│ - PregroupTreeNode                       │   bridge.rs                │
│ - Tree representation of cups/wires     │ - DiscocatComponent        │
│                                          │ - DisCoCatTheory           │
├─────────────────────────────────────────────────────────────────────┤
│ text2diagram/ccg*.py                     │ pipeline/kitty_panproto_   │
│ - CCGParser, CCGTree, CCGType          │   bridge.rs (future)       │
│ - Grammar rules (/ \ directions)         │ - CCG parsing support      │
├─────────────────────────────────────────────────────────────────────┤
│ backend/grammar.py                       │ pipeline/bundle_stack.rs   │
│ - Ty (types with adjoints n.r/n.l)     │ - SortKind, Operation      │
│ - Diagram (categorical composition)      │ - Theory (GAT)             │
│ - Cup, Cap, Word (generators)          │ - Schema (Layer 2)         │
├─────────────────────────────────────────────────────────────────────┤
│ text2diagram/pregroup_tree_converter.py│ N/A (panproto handles)     │
│ - diagram2tree, tree2diagram           │ - KittyPanprotoBridge      │
│                                          │   converts between layers  │
├─────────────────────────────────────────────────────────────────────┤
│ backend/drawing/                         │ pipeline/kitty_integration │
│ - Mermaid, TikZ, text output            │ - Mermaid diagram gen      │
│                                          │ - Already implemented!     │
├─────────────────────────────────────────────────────────────────────┤
│ rewrite/                                 │ Future: optimization       │
│ - Diagram rewriting rules               │ - Route optimization       │
│ - Normalization                          │ - Dead code elimination    │
├─────────────────────────────────────────────────────────────────────┤
│ bobcat/                                  │ Future: ML integration     │
│ - Neural supertagging parser           │ - Learn from API patterns  │
│ - Fast CCG parsing                       │ - Suggest endpoints        │
└─────────────────────────────────────────────────────────────────────┘
```

## High-Value Components to Port

### 1. **Pregroup Type System** (Priority: HIGH)
**File:** `backend/grammar.py` (lines 128-400)

**What it does:**
- Types with adjoints: `n` (noun), `n.r` (right adjoint), `n.l` (left adjoint)
- Tensor products: `n @ n.r @ s` (complex types)
- Winding number `z` for adjoint direction

**Use for Phoenix:**
- Formalize API endpoint types: `AuthToken @ TaskInput → TaskCreated`
- Type checking for connections: `TaskCreated` connects to `TaskCreated.r` via cup
- Semantic composition: `POST /tasks` composes with `GET /tasks/:id` if types match

**Rust Implementation:**
```rust
pub struct PregroupType {
    name: String,          // "Task", "AuthToken", etc.
    z: i32,               // 0=base, >0=right adjoint (n.r), <0=left (n.l)
    objects: Vec<Self>,    // For tensor products: n @ s
}

impl PregroupType {
    pub fn adjoint_right(&self) -> Self { ... }  // n → n.r
    pub fn adjoint_left(&self) -> Self { ... }   // n → n.l
    pub fn tensor(&self, other: &Self) -> Self { ... }  // n @ s
    pub fn is_atomic(&self) -> bool { self.objects.is_empty() }
}
```

### 2. **Diagram Structure** (Priority: HIGH)
**File:** `backend/grammar.py` (lines 703-1400)

**What it does:**
- `Diagram`: list of layers representing a string diagram
- `Layer`: a box with left/right types (domain/codomain)
- `Box`: generators (Word, Cup, Cap, Swap)
- Composition via tensor product (@) and sequential (;)

**Use for Phoenix:**
- Represent API architecture as categorical diagram
- Endpoints = boxes with types
- Connections = cups between matching types
- Sequential composition = data flow
- Parallel composition = independent routes

**Rust Implementation:**
```rust
pub struct Diagram {
    layers: Vec<Layer>,
    dom: Vec<PregroupType>,   // Input types
    cod: Vec<PregroupType>,   // Output types
}

pub struct Layer {
    box: Box,
    left: Vec<PregroupType>,   // Types to the left
    right: Vec<PregroupType>,  // Types to the right
}

pub enum Box {
    Word { name: String, dom: Vec<PregroupType>, cod: Vec<PregroupType> },
    Cup { left: PregroupType, right: PregroupType },  // Connection
    Cap { left: PregroupType, right: PregroupType },  // Creation
    Swap { left: PregroupType, right: PregroupType }, // Reordering
}
```

### 3. **Pregroup Tree Converter** (Priority: HIGH)
**File:** `text2diagram/pregroup_tree_converter.py`

**What it does:**
- `diagram2tree()`: Convert diagram to compact tree representation
- `tree2diagram()`: Convert tree back to diagram
- Tree nodes = words with types, edges = cups

**Use for Phoenix:**
- Compact representation for storage/transmission
- Easier to visualize as tree vs flat diagram
- Round-trip conversion for editing

**Rust Implementation:**
```rust
pub struct PregroupTreeNode {
    word: String,
    word_index: usize,
    typ: PregroupType,
    children: Vec<Self>,  // Connected via cups
}

impl PregroupTreeConverter {
    pub fn diagram_to_tree(diagram: &Diagram) -> PregroupTreeNode;
    pub fn tree_to_diagram(tree: &PregroupTreeNode) -> Diagram;
}
```

### 4. **CCG Parser** (Priority: MEDIUM)
**Files:** `text2diagram/ccg_parser.py`, `bobcat/parser.py`

**What it does:**
- Supertagging: assign CCG categories to words
- Chart parsing: find valid derivations
- Directional types: `X/Y` (right), `X\Y` (left)

**Use for Phoenix:**
- Parse natural language API descriptions
- "Create a task with title and description" → `s/(n\n)`
- Convert to pregroup for composition

**Rust Implementation:**
```rust
pub struct CCGType {
    result: Box<Self>,
    direction: Direction,  // Right (/), Left (\)
    argument: Box<Self>,
}

pub struct CCGParser {
    supertagger: Supertagger,  // Neural or rule-based
    grammar: CCGGrammar,
}

impl CCGParser {
    pub fn parse(&self, sentence: &str) -> Vec<CCGTree>;
    pub fn to_pregroup(&self, tree: &CCGTree) -> Diagram;
}
```

### 5. **Diagram Rewriting** (Priority: MEDIUM)
**Files:** `rewrite/rewrite_diagram.py`, `backend/snake_removal.py`

**What it does:**
- Remove redundant snakes (cap-cup pairs)
- Merge consecutive boxes of same type
- Optimize diagram structure

**Use for Phoenix:**
- Optimize API routing: remove redundant middleware
- Dead code elimination: unused endpoints
- Merge similar routes: `/users/:id` and `/users/me`

**Rust Implementation:**
```rust
pub struct RewriteRule {
    pattern: DiagramPattern,
    replacement: Diagram,
}

pub struct DiagramRewriter {
    rules: Vec<RewriteRule>,
}

impl DiagramRewriter {
    pub fn normalize(&self, diagram: &Diagram) -> Diagram;
    pub fn optimize_routes(&self, routes: &[Route]) -> Vec<Route>;
}
```

### 6. **Drawing Backends** (Priority: LOW - Already Have Mermaid)
**Files:** `backend/drawing/`

**What it does:**
- TikZ backend for LaTeX
- Matplotlib backend for Python
- Text backend for ASCII art

**Phoenix Status:**
- ✅ Already implemented Mermaid generation in `kitty_integration.rs`
- Could add TikZ for academic papers

## Implementation Priority

### Phase 1: Core Types (Week 1-2)
1. `PregroupType` with adjoints
2. `Diagram` with layers/boxes
3. `Cup`/`Cap` for connections
4. Tests: round-trip spec.md → Diagram → NCL

### Phase 2: Parser Integration (Week 3-4)
1. Port `PregroupTree` representation
2. `diagram2tree` / `tree2diagram` converters
3. Update `kitty_panproto_bridge.rs` to use new types
4. Replace regex parsing with formal grammar

### Phase 3: CCG Parser (Week 5-6)
1. Port `CCGType` with directions
2. Rule-based supertagger for API domain
3. Chart parsing for spec sentences
4. Convert CCG → pregroup → Diagram

### Phase 4: Optimization (Week 7-8)
1. Port snake removal
2. Route merging rules
3. Dead code detection
4. Performance benchmarks

## Benefits for Phoenix

1. **Formal Verification**: Type-check API connections at compile time
2. **Better Parsing**: Natural language → formal specification
3. **Optimization**: Categorical laws enable safe transformations
4. **Interoperability**: Lambeq ecosystem (PyTorch, PennyLane, TKET)
5. **Academic Grounding**: Publishable semantics for API composition

## Files to Port (Ordered by Priority)

```
High Priority:
├── backend/grammar.py (Ty, Diagram, Cup, Cap, Word)
├── text2diagram/pregroup_tree.py (PregroupTreeNode)
├── text2diagram/pregroup_tree_converter.py (conversion functions)

Medium Priority:
├── text2diagram/ccg_type.py (CCGType with directions)
├── text2diagram/ccg_parser.py (base parser trait)
├── bobcat/parser.py (supertagging chart parser)
├── bobcat/grammar.py (CCG grammar rules)

Lower Priority:
├── rewrite/rewrite_diagram.py (optimization rules)
├── backend/snake_removal.py (normalization)
├── training/*.py (if we want ML-based parsing)
```

## Integration Points

```rust
// Current kitty_panproto_bridge.rs gets enhanced:
pub struct KittyPanprotoBridge;

impl KittyPanprotoBridge {
    /// NEW: Parse spec.md using pregroup grammar
    pub fn parse_pregroup(spec_md: &str) -> Result<Diagram, Error> {
        let tree = PregroupParser::parse(spec_md)?;
        let diagram = tree.to_diagram();
        Ok(diagram)
    }
    
    /// NEW: Parse natural language with CCG
    pub fn parse_ccg(description: &str) -> Result<Diagram, Error> {
        let ccg_tree = BobcatParser::new().parse(description)?;
        let pregroup = ccg_tree.to_pregroup();
        Ok(pregroup.to_diagram())
    }
    
    /// NEW: Optimize before codegen
    pub fn optimize(diagram: &Diagram) -> Diagram {
        Rewriter::new()
            .add_rule(snake_removal())
            .add_rule(route_merge())
            .normalize(diagram)
    }
}
```

## Conclusion

The **pregroup type system** and **diagram structure** from lambeq are the highest-value components to port. They provide formal categorical semantics that map perfectly to Phoenix's 4-layer architecture:

- Layer 1 (Theory): Pregroup types + CCG grammar
- Layer 2 (Schema): Diagram as graph structure  
- Layer 3 (Lens): Diagram rewriting for optimization
- Layer 4 (Expr): Code generation from normalized diagrams

The kitty integration already has the right structure - porting lambeq's formalisms would make it mathematically rigorous and enable advanced features like natural language parsing and automated optimization.
