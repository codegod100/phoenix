# Phoenix UI Theory Skill (phoenix-ui-theory)

Abstract, language-agnostic UI theory based on category theory and algebraic specifications.

## Mathematical Foundation

### Category: UI

Objects:
- `State` - Application states (nodes in state graph)
- `Region` - Spatial layout containers  
- `Overlay` - Modal/interruptive layers
- `Transition` - Morphisms between states
- `View` - Concrete visual representation

Morphisms:
- `visibility: State → Region → Bool` - Whether region visible in state
- `render: Region → View` - How region renders
- `transition: State × Event → State` - State changes
- `compose: Region × Region → Region` - Spatial composition

### Functor: State → Layout

For each state `s ∈ State`, we define a layout `L(s)`:

```
L: State → Layout
L(s) = { r ∈ Region | visibility(s, r) = true }
```

This is a covariant functor from the state category to the layout category.

### Natural Transformation: Overlay Lifting

Overlays are natural transformations that lift the base layout:

```
η: L → L'
where L'(s) = L(s) ∪ { o ∈ Overlay | trigger(s, o) }
```

## Algebraic Specification

### Signature: UIΣ

Sorts:
- `S` - States
- `R` - Regions  
- `O` - Overlays
- `G` - Geometries
- `V` - Views

Operations:
```
visibility: S × R → Bool
geometry: R → G
content: R → List(Widget)
trigger: S × O → Bool
present: O → PresentationMode
dismiss: O → Bool
transition: S × E → S  (E = events)
compose: G × G → G
```

Equations:
```
-- Identity
visibility(s, ∅) = false

-- Mutual exclusion for fullscreen overlays
∀s: S, o1,o2: O |
  present(o1) = FULLSCREEN ∧ present(o2) = FULLSCREEN ∧ trigger(s,o1) ∧ trigger(s,o2)
  → o1 = o2

-- Overlay on top
∀o: O, r: R | z-index(o) > z-index(r)

-- State determinism  
transition(s, e1) = s1 ∧ transition(s, e1) = s2 → s1 = s2
```

## Abstract UI Language (AUL)

Domain-specific language for UI declarations:

```aul
-- State declarations
state Authenticating:
  description: "User must authenticate"
  
state Connected:
  description: "Normal operation"

-- Region declarations  
region Header:
  geometry: DOCK_TOP(height: 1)
  visibility:
    Authenticating: false
    Connected: true
  content: [Clock, Title]

region Main:
  geometry: FILL
  visibility:
    Authenticating: false  
    Connected: true
  content: [MessageList, InputBar]

-- Overlay declarations
overlay AuthModal:
  trigger: state == Authenticating
  presentation: FULLSCREEN
  dismissable: false
  content: [Title, HandleInput, ConnectButton]
  backdrop: SOLID_COLOR

-- Transitions
transition Authenticating -> Connected:
  on: AuthCompleted
  animation: FADE(duration: 300ms)
```

## Theory Lens: AUL → Target Language

### Lens to Textual (Python)

```
Λ_textual: AUL → Python

map State -> Enum class with reactive decorator
map Region -> Widget class with reactive(visible)
map geometry DOCK_TOP -> widgets.Header
map geometry FILL -> containers.Container with flex
map FULLSCREEN -> layer: overlay with dock: top, height: 100vh
map visibility state -> watch() method updating CSS classes
map transition -> textual.message message handlers
```

### Lens to React (TypeScript)

```
Λ_react: AUL → TSX

map State -> React useState or Redux slice
map Region -> Component with conditional render
map geometry DOCK_TOP -> position: fixed top
map FILL -> flex: 1
map FULLSCREEN -> createPortal with z-index layer
map visibility state -> conditional JSX rendering
map transition -> dispatch(action) with useEffect
```

### Lens to SwiftUI

```
Λ_swift: AUL → Swift

map State -> @State enum
map Region -> View with .opacity() modifier  
map geometry DOCK_TOP -> .toolbar placement: .topBar
map FILL -> GeometryReader with flexible frames
map FULLSCREEN -> .fullScreenCover()
map visibility state -> if/else view modifiers
map transition -> withAnimation blocks
```

## Implementation in Phoenix Skills

### File Structure

```
.phi/skills/phoenix-ui-theory/
  SKILL.md              # This file
  parser.js             # AUL parser
  theory.js             # Core theory definitions
  lenses/
    textual.js          # AUL → Textual
    react.js            # AUL → React
    swiftui.js          # AUL → SwiftUI
    gtk.js              # AUL → GTK
  validators/
    invariants.js       # Check UI invariants
    completeness.js     # Ensure all states have layouts
```

### Usage in Projects

1. **Declare UI theory in spec:**
   ```
   spec/ui.aul
   ```

2. **Phoenix pipeline processes it:**
   ```
   ingest → parse AUL → build theory model → select lens → generate code
   ```

3. **Language selection:**
   - Detected from project (pyproject.toml → Textual)
   - Or specified in phoenix.yaml: `ui: { language: textual }`

4. **Generated output:**
   - Region widgets
 - Overlay widgets  
   - State management
   - Transition handlers
   - CSS/styling

### Integration with Existing Skills

```
phoenix-ingest:     Parse AUL files into theory model
phoenix-plan:       Map UI theory to Implementation Units
phoenix-codegen:    Apply lens to generate target language
phoenix-evidence:   Verify invariants hold in generated code
```

## Advantages

1. **Mathematical Rigor**: Category theory foundation enables formal verification
2. **Language Agnostic**: Same UI spec generates to any supported framework
3. **Composable**: Regions and overlays compose via categorical products/coproducts
4. **Decidable**: State transitions form finite state machine - properties are decidable
5. **Refactorable**: Theory morphisms enable systematic UI refactoring
6. **Testable**: Generate state machine tests from transition declarations

## Future: Probabilistic UI Theory

Extension for ML-driven UIs:

```
visibility: State × Context → Distribution(Bool)
```

Rather than deterministic visibility, we have probability distributions based on user context.
