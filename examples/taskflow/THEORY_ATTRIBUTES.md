## Theory Attributes Explained

| Attribute | What It Is | Simple Analogy |
|-----------|-----------|--------------|
| **Sort** | A type/category of thing | "Noun" — Task, User, PriorityLevel |
| **Operation** | A transformation with input/output types | "Verb" — `archiveTask` takes Task, returns Task |
| **Arity** | The input/output signature of an operation | Function signature — `Task → Task` or `Task × Priority → Task` |
| **Equation** | A law that must always hold | "Rule" — `archiveTask(t).status = 'archived'` |
| **Context** | Variables in scope for an equation | "Given" — "For any task t and priority p..." |
| **Variable** | A placeholder in equations | `t`, `p`, `tasks` — stand for actual values |
| **Projection** | An operation that extracts a field | Getter — `getPriority(t)` returns `t.priority` |
| **Constructor** | An operation that creates a value | Builder — `createTask(title)` makes a new Task |
| **Boundary** | What the theory exposes/hides | API contract — exports (public), imports (dependencies) |
| **Invariant** | A condition that must always be true | Constraint — "priority must be low/medium/high/critical" |
| **Content ID** | SHA-256 hash of the theory's structure | Fingerprint — uniquely identifies this exact theory |
| **Risk Tier** | Criticality level for testing rigor | {Critical, High, Medium, Low} — how thoroughly to verify |
| **Traceability** | Link back to source requirement | "Came from clause 3 in tasks.md" |
| **Dependent Type** | A type that depends on a value | `StatusOf(t)` — the status type for a specific task |
| **Polymorphic** | Works with any type | `List<T>` — list of Tasks, list of Users, etc. |
| **Product Type** | A pair/tuple | `Task × Priority` — two values together |
| **Sum Type** | A choice between alternatives | `Status = open \| done \| archived` — one of several |

---

## Quick Example

```
Theory: Priority

Sort: PriorityLevel (sum type: low | medium | high | critical)
Operation: setPriority : Task × PriorityLevel → Task
Equation: setPriority(t, p).priority = p
Context: t : Task, p : PriorityLevel
Boundary: exports [setPriority], imports [Task]
Risk: HIGH
Content ID: 7cce149b135824bc...
Traceability: Source = "tasks.md clause #12"
```

**Translation**: In the Priority theory, there's an operation `setPriority` that takes a Task and a PriorityLevel. The equation guarantees that after setting priority, the task's priority field equals what you set. This is high-risk (needs thorough testing) and traces back to requirement #12 in tasks.md.