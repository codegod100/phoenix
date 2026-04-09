## Intrinsic vs. Domain-Specific Theory Attributes

### Intrinsic to GATs (Mathematical Formalism)

These are **required** for any Generalized Algebraic Theory—they're part of the mathematical definition:

| Attribute | Why It's Intrinsic |
|-----------|-------------------|
| **Sort** | Core building block. GATs are "generalized" precisely because sorts can depend on terms (dependent types). |
| **Operation** | Fundamental. A GAT is defined by its operators with arities (input/output sorts). |
| **Arity** | The signature `input → output` is how operations are typed in the theory. |
| **Equation** | Axioms/laws are what make it an *algebraic* theory vs. just a signature. |
| **Context** | Judgments in GATs are always contextual: `Γ ⊢ term : sort`. |
| **Variable** | Terms in equations need variables to express generality. |
| **Product Type** | Can be constructed from GAT structure: `A × B` = pairs of A and B. |
| **Sum Type** | Coproducts: `A + B` = either A or B (expressed via constructors in GAT). |
| **Dependent Type** | `B(x)` where `x:A` — the "generalized" part of GAT (sorts depend on values). |
| **Projection** | Comes from product types: `π₁ : A × B → A`, `π₂ : A × B → B`. |
| **Constructor** | Introductory form for sorts (how you make values). |
| **Polymorphic** | Type variables like `List<T>` are expressible in richer GAT flavors. |

**Key point**: A GAT without these isn't a GAT—it's something else.

---

### Phoenix/App Domain (Software Engineering)

These are **added by us** to make GATs useful for software development—they're not part of the mathematical definition:

| Attribute | Why It's Domain-Specific |
|-----------|-------------------------|
| **Boundary** | Modularity concept. GATs don't inherently have "exports" or "imports"—they just have structure. We added boundaries to create compilation units (IUs) with APIs. |
| **Risk Tier** | Testing strategy. {Critical, High, Medium, Low} is about how much evidence we require before accepting the implementation. Not in the math. |
| **Content ID** | SHA-256 hash for content-addressing. Enables VCS operations (diff, merge, trace). Purely a software engineering concern. |
| **Traceability** | Link to source spec (`tasks.md` clause #3). For requirements tracking, not theory structure. |
| **Invariant** | While equations *prove* properties, "invariant" as a separate runtime-checkable assertion is a software concept. |
| **Implementation** | The actual code (TypeScript). A GAT is formal; implementation is concrete. |
| **Evidence** | Test results, coverage, type-check status. Verification artifacts, not theory structure. |
| **Status** | {ACCEPTED, REJECTED, PENDING}. Pipeline state machine, not mathematical property. |

---

### The Division

```
┌─────────────────────────────────────────────────────────┐
│                    MATHEMATICAL CORE                     │
│                     (GAT formalism)                    │
├─────────────────────────────────────────────────────────┤
│  Sorts, Operations, Equations, Contexts, Variables,    │
│  Products, Sums, Dependent Types, Projections         │
│                                                         │
│  → Defines what the theory *is* and what it *proves*   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                PHOENIX INFRASTRUCTURE                   │
│              (Software engineering layer)              │
├─────────────────────────────────────────────────────────┤
│  Content ID, Traceability, Risk Tier, Boundary,        │
│  Evidence, Status, Implementation, Audit               │
│                                                         │
│  → Defines how we *use* the theory in a pipeline      │
└─────────────────────────────────────────────────────────┘
```

---

### Example: Archive Theory

**GAT layer** (intrinsic):
```
Sort: Task : Type
Operation: archiveTask : Task → Task
Equation: archiveTask(t).status = 'archived'
```

**Phoenix layer** (domain-specific):
```
Content ID: 29eaf5668c0afbf2...
Traceability: "spec/tasks.md clause #7"
Risk Tier: MEDIUM
Boundary: exports [archiveTask, restoreTask], imports [Task]
Status: ACCEPTED
Evidence: {typecheck: pass, tests: 15/15, coverage: 87%}
```

---

### Why This Matters

The **GAT layer** is portable and mathematical—you could take just that part and use it in:
- Proof assistants (Lean, Coq)
- Type theory research
- Other code generation systems

The **Phoenix layer** is specific to our VCS pipeline—it encodes:
- How we track changes (content IDs)
- How we manage complexity (risk tiers, boundaries)
- How we verify correctness (evidence, audit)
- How we trace back to requirements (traceability)

**A theory without Phoenix attributes is still a theory.**
**Phoenix attributes without a GAT core have nothing to formalize.**