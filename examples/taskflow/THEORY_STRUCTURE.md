## Anatomy of an Individual Theory

An **Implementation Unit (IU)** in Phoenix is a **Generalized Algebraic Theory (GAT)**—a formal mathematical structure. Here's how one is built from the ground up.

---

### The Five Components

Every GAT consists of:

| Component | Purpose | Example |
|-----------|---------|---------|
| **Sorts** (Types) | The "nouns" of the theory—what kinds of things exist | `Task`, `TaskId`, `PriorityLevel`, `List<Task>` |
| **Operations** | The "verbs"—transformations between sorts | `setPriority : Task × PriorityLevel → Task` |
| **Variables** | Placeholders used in equations | `t : Task`, `p : PriorityLevel` |
| **Equations** | Laws that operations must satisfy | `setPriority(t, p).priority = p` |
| **Contexts** | Sets of variables in scope for each judgment | `t : Task, p : PriorityLevel ⊢ ...` |

---

### Component 1: Sorts (Types)

Sorts are the basic building blocks. Some are **primitive** (atomic), others are **derived** (constructed from other sorts).

```
Primitive sorts:
  Task        : Type        -- The main entity
  TaskId      : Type        -- Identifier (usually string)
  PriorityLevel : Type      -- Enumeration

Derived sorts:
  List<Task>  : Type        -- Container
  Maybe<Task> : Type        -- Optional
  Task × PriorityLevel : Type  -- Product (pair)
```

**Key property**: Sorts can depend on other sorts (dependent types). For example, `StatusOf(t)` could be a type that depends on which task you're talking about.

---

### Component 2: Operations (with Signatures)

Operations have **arities**—typed inputs and outputs:

```
Operation signature format:
  name : (input₁ × input₂ × ... × inputₙ) → output

Examples:
  createTask     : (title: string) → Task
  setPriority    : Task × PriorityLevel → Task
  getTitle       : Task → string
  getById        : TaskId → Maybe<Task>
  filterByStatus : List<Task> × Status → List<Task>
```

**Important**: Operations are **pure functions** (no side effects in the theory). The theory describes what operations exist and their types—not how they're implemented.

---

### Component 3: Variables and Contexts

A **context** (Γ, gamma) is a list of variables in scope, each with a sort:

```
Context example:
  Γ = t : Task, p : PriorityLevel, tasks : List<Task>

This means:
  - "t" is a Task
  - "p" is a PriorityLevel  
  - "tasks" is a List of Tasks
```

Contexts matter because equations are only valid in specific contexts—you can't talk about `p` (priority) unless you've declared it exists.

---

### Component 4: Equations (Axioms)

Equations are the **laws** that operations must obey. They're written in a specific context.

```
Equation format:
  Γ ⊢ term₁ = term₂

(Read as: "In context Gamma, term₁ equals term₂")

Examples:
  t : Task, p : PriorityLevel ⊢ setPriority(t, p).priority = p
  
  (Translation: "For any task t and priority p, if you set t's priority to p,
   then the resulting task's priority field equals p")

  t : Task ⊢ setPriority(setPriority(t, p1), p2).priority = p2
  
  (Translation: "Setting priority twice means the second one wins")
```

**Types of equations**:
- **Definitional**: Define what something means (e.g., `getTitle(t) = t.title`)
- **Behavioral**: Specify behavior (e.g., `archiveTask(t).status = 'archived'`)
- **Invariants**: Always-true conditions (e.g., `t.priority ∈ {low, medium, high, critical}`)

---

### The Full Theory: Archive Example

Here's the complete structure of the Archive theory:

```
═══════════════════════════════════════════════════════════════
THEORY: Archive
═══════════════════════════════════════════════════════════════

SORTS:
  Task        : Type
  TaskId      : Type
  TaskStatus  : Type  -- lifecycle status
  Timestamp   : Type
  List<T>     : Type  (polymorphic container)

OPERATIONS:
  -- Core archive operations
  archiveTask    : Task → Task
  restoreTask    : Task → Task
  getArchivedTasks : List<Task> → List<Task>
  isArchived     : Task → boolean
  
  -- Field accessors (projections)
  getId          : Task → TaskId
  getTitle       : Task → string
  getStatus      : Task → TaskStatus
  getArchivedAt  : Task → Maybe<Timestamp>

VARIABLES (used in equations):
  t, t₁, t₂ : Task
  tasks     : List<Task>

EQUATIONS:
  -- 1. Archive changes status
  t : Task ⊢ getStatus(archiveTask(t)) = 'archived'
  
  -- 2. Archive records timestamp
  t : Task ⊢ getArchivedAt(archiveTask(t)) = Just(now())
  
  -- 3. Restore changes status back
  t : Task ⊢ getStatus(restoreTask(archiveTask(t))) = getStatus(t)
  
  -- 4. Idempotence: archiving twice same as once
  t : Task ⊢ archiveTask(archiveTask(t)) = archiveTask(t)
  
  -- 5. Filter correctness
  tasks : List<Task> ⊢ 
    forall t in getArchivedTasks(tasks), getStatus(t) = 'archived'
  
  -- 6. IsArchived predicate
  t : Task ⊢ isArchived(t) = (getStatus(t) = 'archived')

═══════════════════════════════════════════════════════════════
```

---

### Theory Structure as Data

In Phoenix, a theory is stored as structured data:

```typescript
// Simplified representation
interface GAT {
  name: string;           // "Archive"
  
  sorts: Array<{
    name: string;          // "Task"
    arity: number;         // 0 for simple types, >0 for type constructors
    dependencies: string[]; // other sorts this depends on
  }>;
  
  operations: Array<{
    name: string;          // "archiveTask"
    inputs: Sort[];        // [Task]
    output: Sort;          // Task
    sourceCanon: string;   // traceability: which canonical req
  }>;
  
  equations: Array<{
    context: Variable[];   // [t: Task]
    left: Term;            // setPriority(t, p).priority
    right: Term;           // p
  }>;
  
  boundary: {
    imports: string[];     // other IU theories this depends on
    exports: string[];     // operations exposed to other theories
    invariants: Term[];    // conditions that must always hold
  };
}
```

---

### Key Properties

| Property | Meaning | Example |
|----------|---------|---------|
| **Content-addressed** | Theory identified by hash of its structure | SHA-256 of all sorts + ops + equations |
| **Pure** | No side effects, only equations | `archiveTask` returns new Task, doesn't mutate |
| **Typed** | Every term has a sort | Can't use `Task` where `TaskId` expected |
| **Equational** | Behavior defined by equalities | `archiveTask(t).status = 'archived'` |
| **Composable** | Can combine with other theories via colimit | Archive + Priority → unified Task theory |

---

### Why This Structure Matters

1. **Formal verification**: Equations can be checked
2. **Composition**: Theories combine via shared sorts/operations
3. **Code generation**: Structure maps directly to TypeScript interfaces and functions
4. **Traceability**: Every operation points back to its source requirement
5. **Migration**: Theory morphisms (changes) can be detected and applied

An IU isn't just code—it's a **mathematical object** with precise structure that enables the colimit operation to work correctly.