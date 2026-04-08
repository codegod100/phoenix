# phoenix-deliverable

Generate deliverables as colimits of domain theories using panproto GAT.

## Core Concept

Instead of ad-hoc templates, we use **category theory**:

```
Theory(Task) + Theory(Confirmation) + Theory(Edit) + Theory(Archive)
       ↓           ↓                    ↓              ↓
       └───────────→ colimit over SharedBase ←────────┘
                          ↓
                    Theory(WebDashboard)
                          ↓
                    Code Generation
```

The deliverable is the **colimit** (pushout) of domain theories over a shared base theory.

## Architecture

### 1. Domain Theories (from IUs)

Each IU defines a theory via its canonical requirements:

```typescript
// From spec/web-dashboard-confirmation.md
const confirmationTheory = new TheoryBuilder('Confirmation')
  .sort('Dialog')
  .sort('Action')
  .op('showModal', [['message', 'String']], 'Dialog')
  .op('confirm', [['dialog', 'Dialog']], 'Action')
  .op('cancel', [['dialog', 'Dialog']], 'Action');
```

### 2. Shared Base Theory

Common infrastructure all domains share:

```typescript
const sharedBase = new TheoryBuilder('WebBase')
  .sort('Component')
  .sort('Event')
  .sort('State')
  .op('render', [['component', 'Component']], 'State')
  .op('handleEvent', [['event', 'Event']], 'State');
```

### 3. Deliverable Theory (Colimit)

The composed theory computed by panproto:

```typescript
const webDashboard = colimit(
  confirmationTheory,
  editTheory,
  sharedBase,
  wasm
);
```

### 4. Code Generation

Generate TypeScript/HTML from the colimit theory:

```typescript
// Generate server from theory operations
const serverCode = generateServer(webDashboard, {
  entryPoint: 'handleRequest',
  routes: extractRoutes(webDashboard),
});
```

## Why This Matters

| Approach | Problems | GAT Approach |
|----------|----------|--------------|
| String templates | Ad-hoc, breaks provenance | Theory morphisms are mathematical |
| Manual composition | Easy to miss spec requirements | Colimit includes all operations |
| Hard-coded generators | Can't adapt to new domains | Generic colimit-based generator |

## File Structure

```
.pi/skills/phoenix-deliverable/
├── SKILL.md
├── deliverable.js              # Main entry: compute colimit + generate
├── lib/
│   ├── theories/               # Domain theory definitions
│   │   ├── base.js             # SharedBase theory
│   │   ├── confirmation.js     # Confirmation domain → theory
│   │   ├── edit.js             # Edit domain → theory
│   │   └── ...
│   ├── composition/            # Colimit computation
│   │   └── colimit.js          # Compute deliverable theory
│   └── codegen/                # Theory → code
│       ├── typescript.js       # Generate TS from theory
│       └── html.js             # Generate HTML from theory
└── index.js                    # Re-exports
```

## Usage

```bash
# Compute colimit and generate deliverable
node deliverable.js <project> --detect

# The type is derived from which domains are present
# The output is generated from the colimit theory
```

## Traceability

Each generated file includes:

```typescript
/**
 * @phoenix-deliverable: colimit(
 *   iu-7bde30d9: Confirmation,
 *   iu-12c44af6: Delete,
 *   iu-b0512ab0: Edit,
 *   ...
 * )
 * @phoenix-theory: WebDashboard
 * @phoenix-colimit-ops: showModal, confirm, cancel, editInline, ...
 */
```

## Integration with Pipeline

```javascript
// In pipeline.js
{ name: 'deliverable',
  command: ['deliverable.js', CTX.projectPath, '--detect'],
  canSkip: (ctx) => !ctx.iousChanged && existsSync('.phoenix-deliverable.json')
}
```

## Validation

Spec compliance is **structural**:

```typescript
// Check that colimit theory includes required operations
const requiredOps = canonicalNodes
  .filter(n => n.type === 'REQUIREMENT')
  .map(n => requirementToOperation(n));

for (const op of requiredOps) {
  if (!deliverableTheory.hasOperation(op.name)) {
    throw new SpecViolation(`Missing operation: ${op.name}`);
  }
}
```

No regex matching - we check the theory has the operations the spec requires.

## References

- panproto GAT module: `.pi/skills/panproto/vendor/sdk/typescript/src/gat.ts`
- Colimit computation: `colimit(t1, t2, shared, wasm)`
- Theory morphism validation: `checkMorphism(morphism, domain, codomain, wasm)`
