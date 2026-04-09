## Three Theories and Their Colimit

### The Individual Theories (GAT Fragments)

Each Implementation Unit (IU) is a **Generalized Algebraic Theory**—a formal mini-language describing one aspect of the system.

---

#### Theory 1: Archive
**Domain**: Archiving and restoring tasks

```
Types:
  Task : Type
  TaskId : Type

Operations:
  archiveTask   : Task → Task
  restoreTask   : Task → Task
  getArchivedTasks : () → List<Task>

Equations:
  archiveTask(t).status = "archived"
  restoreTask(t).status = "active"
  ∀ t : Task, t.archived_at = timestamp(archiveTask(t))
```

**What Archive knows about Task**:
- Has an `id` (to look it up)
- Has a `title` (to display)
- Has a `status` field that can change to "archived"

---

#### Theory 2: Priority  
**Domain**: Setting and filtering by priority

```
Types:
  Task : Type
  PriorityLevel : Type  // low | medium | high | critical

Operations:
  setPriority     : Task × PriorityLevel → Task
  filterByPriority: List<Task> × PriorityLevel → List<Task>

Equations:
  setPriority(t, p).priority = p
  filterByPriority(tasks, p) = { t ∈ tasks | t.priority = p }
```

**What Priority knows about Task**:
- Has an `id` (to identify which task)
- Has a `title` (to display in filtered lists)
- Has a `priority` field with 4 possible values

---

#### Theory 3: Status
**Domain**: Workflow state management

```
Types:
  Task : Type
  Status : Type  // open | in_progress | review | done

Operations:
  setStatus      : Task × Status → Task
  filterByStatus : List<Task> × Status → List<Task>
  getCompletedTasks : () → List<Task>

Equations:
  setStatus(t, s).status = s
  getCompletedTasks() = { t | t.status = "done" }
```

**What Status knows about Task**:
- Has an `id` (to update the right task)
- Has a `title` (to show in status columns)
- Has a `status` field for workflow tracking

---

### The Overlap (Shared Structure)

All three theories mention **Task**, but each knows different things:

| Theory | Knows Task has... |
|--------|-------------------|
| Archive | `id`, `title`, `status` (as "archived"/"active") |
| Priority | `id`, `title`, `priority` |
| Status | `id`, `title`, `status` (as workflow state) |

**Key insight**: Archive and Status both know about `status`, but with different values:
- Archive: `status ∈ {active, archived}` (lifecycle)
- Status: `status ∈ {open, in_progress, review, done}` (workflow)

---

### The Colimit: Computing the Unified Theory

The **colimit** operation finds all shared structure and produces the minimal theory containing all three.

#### Step 1: Identify Shared Types
All three have `Task`. These are the same concept, so they merge into **one** Task type.

#### Step 2: Merge Fields
The unified Task must satisfy all three theories:

```typescript
// Colimit result: Unified Task type
interface Task {
  id: string;           // needed by Archive, Priority, Status
  title: string;        // needed by Archive, Priority, Status
  status: TaskStatus;   // merges Archive's lifecycle + Status's workflow
  priority: PriorityLevel;  // needed by Priority
  archived_at?: string; // needed by Archive
  updated_at: string;   // needed by state changes
}

type TaskStatus = 
  | 'open'           // from Status
  | 'in_progress'    // from Status
  | 'review'         // from Status
  | 'done'           // from Status
  | 'archived';      // from Archive (extends Status's enum)

type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';  // from Priority
```

#### Step 3: Preserve All Operations
Every operation from each theory survives in the colimit:

```typescript
// From Archive theory
function archiveTask(task: Task): Task {
  return { ...task, status: 'archived', archived_at: new Date().toISOString() };
}

function restoreTask(task: Task): Task {
  return { ...task, status: 'open', archived_at: undefined };
}

function getArchivedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status === 'archived');
}

// From Priority theory
function setPriority(task: Task, priority: PriorityLevel): Task {
  return { ...task, priority, updated_at: new Date().toISOString() };
}

function filterByPriority(tasks: Task[], priority: PriorityLevel): Task[] {
  return tasks.filter(t => t.priority === priority);
}

// From Status theory
function setStatus(task: Task, status: TaskStatus): Task {
  return { ...task, status, updated_at: new Date().toISOString() };
}

function filterByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter(t => t.status === status);
}

function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status === 'done');
}
```

---

### The Colimit Diagram

```
                ┌─────────────────────────────────────┐
                │         UNIFIED TASK (Colimit)      │
                │                                     │
                │  Task {                             │
                │    id, title,                       │◄─┐
                │    status: open|in_progress|review|  │  │
                │            done|archived,           │  │
                │    priority,                        │  │
Archive ───────►│    archived_at                      │  │
Theory          │  }                                   │  │
  │             │                                     │  │
  │ archiveTask │  Operations:                        │  │
  │ restoreTask │    archiveTask ◄────────────────────┘  │
  │ getArchived │    restoreTask ◄────────────────────┐  │
  ▼             │    getArchivedTasks ◄────────────────┤  │
  Task ─────────►│    setPriority ◄───────────────────┼──┤
 (id,title,      │    filterByPriority ◄──────────────┼──┘
  status)        │    setStatus ◄─────────────────────┤
                │    filterByStatus ◄────────────────┤
Priority ───────►│    getCompletedTasks ◄───────────┘
Theory          │  }
  │             │
  │ setPriority │
  │ filterByP   │
  ▼             │
  Task ─────────►│
 (id,title,
  priority)

Status ─────────►│
Theory          │
  │             │
  │ setStatus   │
  │ filterByS   │
  │ getCompleted│
  ▼             │
  Task ─────────►│
 (id,title,
  status)
```

---

### Why This Matters

| Without Colimit | With Colimit |
|-----------------|--------------|
| 3 different Task types that don't interoperate | 1 unified Task type used by all |
| `archiveTask` can't work on tasks with priority | `archiveTask(priorityTask)` just works |
| Manual glue code to convert between types | No conversion needed—same type |
| Runtime errors from type mismatches | Type safety guaranteed at generation time |
| "Oops, I forgot to add priority to the archive version" | All fields present by construction |

The colimit is the **least common supertype** that contains everything each theory needs—no more, no less—computed automatically by finding shared structure.