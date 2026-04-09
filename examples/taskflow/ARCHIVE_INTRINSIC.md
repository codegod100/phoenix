## Intrinsic Attributes: Archive Theory (Concrete Example)

Only the **mathematical core**—no Phoenix infrastructure.

---

### 1. Sorts (Types)

```
Task         : Type
TaskId       : Type
TaskStatus   : Type        -- enumeration
Timestamp    : Type
Boolean      : Type
List<T>      : Type → Type  -- polymorphic, T is a type variable
Maybe<A>     : Type → Type  -- option type
```

---

### 2. Operations with Arity (Signatures)

```
-- Core archive operations
archiveTask      : Task → Task
restoreTask      : Task → Task
getArchivedTasks : List<Task> → List<Task>
isArchived       : Task → Boolean

-- Field accessors (projections)
getId            : Task → TaskId
getTitle         : Task → String
getStatus        : Task → TaskStatus
getArchivedAt    : Task → Maybe<Timestamp>

-- Timestamp operation
now              : () → Timestamp

-- List operations
elem             : Task → List<Task> → Boolean
filter           : (Task → Boolean) → List<Task> → List<Task>
```

---

### 3. Equations (Axioms)

```
-- Context: t : Task
-- Equation 1: Archive changes status to 'archived'
t : Task ⊢ getStatus(archiveTask(t)) = 'archived'

-- Equation 2: Archive records timestamp
t : Task ⊢ getArchivedAt(archiveTask(t)) = Just(now())

-- Equation 3: Restore reverts status to original
t : Task ⊢ getStatus(restoreTask(archiveTask(t))) = getStatus(t)

-- Equation 4: Idempotence—archiving twice same as once
t : Task ⊢ archiveTask(archiveTask(t)) = archiveTask(t)

-- Equation 5: isArchived predicate definition
t : Task ⊢ isArchived(t) = (getStatus(t) = 'archived')

-- Context: tasks : List<Task>, t : Task
-- Equation 6: Filter correctness—all returned tasks are archived
tasks : List<Task>, t : Task ⊢ 
  elem(t, getArchivedTasks(tasks)) → isArchived(t) = true

-- Equation 7: Empty list when no archived tasks
tasks : List<Task> ⊢ 
  (forall t : Task, elem(t, tasks) → isArchived(t) = false)
  → getArchivedTasks(tasks) = []
```

---

### 4. Variables and Contexts

```
-- Variables used across equations:
t, t₁, t₂  : Task           -- individual tasks
tasks      : List<Task>     -- collection of tasks

-- Contexts (scopes where variables are valid):
Γ₁ = t : Task
Γ₂ = tasks : List<Task>
Γ₃ = tasks : List<Task>, t : Task
```

---

### 5. Type Structure

```
-- TaskStatus is a sum type (enumerated):
TaskStatus = 'active' | 'archived' | 'open' | 'in_progress' | 'review' | 'done'

-- Task is a product type (record/struct):
Task = TaskId × String × TaskStatus × Maybe<Timestamp>
  (id, title, status, archived_at)

-- Maybe<Timestamp> is a sum type (optional):
Maybe<Timestamp> = Nothing | Just(Timestamp)
```

---

### What's NOT Here (Phoenix Attributes)

These are **excluded**—they're software engineering, not mathematics:

| Not Intrinsic | Why Excluded |
|--------------|--------------|
| Content ID: `29eaf566...` | SHA-256 hash for VCS |
| Risk Tier: `MEDIUM` | Testing strategy |
| Traceability: `tasks.md clause #7` | Requirements link |
| Boundary: `exports [archiveTask]` | API modularity |
| Status: `ACCEPTED` | Pipeline state |
| Evidence: `{tests: 15/15}` | Verification artifacts |
| Implementation: `function archiveTask...` | Concrete code |

---

### The Intrinsic Core (Summary)

```
Archive Theory = ⟨Sorts, Operations, Equations⟩ where:

Sorts = {Task, TaskId, TaskStatus, Timestamp, Boolean, List<T>, Maybe<A>}

Operations = {archiveTask: Task→Task, restoreTask: Task→Task, 
              getArchivedTasks: List<Task>→List<Task>, 
              isArchived: Task→Boolean, ...projections...}

Equations = {archiveTask(t).status = 'archived',
             archiveTask(archiveTask(t)) = archiveTask(t), 
             ...6 total equations...}
```

This is a **pure mathematical object**—no SHA hashes, no testing tiers, no traceability links. Just types, operations, and the laws they obey.