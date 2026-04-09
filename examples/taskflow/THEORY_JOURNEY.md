## From Requirement to Colimit: A Theory's Journey

### Phase 1: Birth (Ingest)
- **Starts as**: A REQUIREMENT clause in a spec file
  - Example: *"Tasks shall support priority levels"*
- **Becomes**: A **Clause** with SHA-256 content address
- **Key property**: Named by hash of content—identical text = identical identity

### Phase 2: Purification (Canonicalize)
- **Deduplication**: Finds equivalent clauses across all specs
- **Example**: "Set task priority" in `tasks.md` and "Assign priority to task" in `priority.md` are semantically equivalent
- **Result**: A **Canonical Requirement** with improved D-rate (deduplication ratio)
- **Effect**: Multiple ways of saying the same thing collapse into one authoritative statement

### Phase 3: Autonomy (Plan)
- **Assigned to**: Implementation Unit (IU) with:
  - Risk tier: {Critical, High, Medium, Low}
  - Boundary policy: imports, exports, invariants
  - Content-addressed ID
- **Becomes**: A **mini-theory**—formal language with:
  - Types: `Task`, `PriorityLevel`, `TaskId`
  - Operations: `setPriority: Task × PriorityLevel → Task`
  - Equations: invariants like "priority ∈ {low, medium, high, critical}"
- **Dependencies**: Declares imports from other IUs (e.g., depends on Task theory)

### Phase 4: Recognition (Protolens)
- **Analysis**: Computes overlap with other IU theories
- **Finds connections**: Task appears in Archive IU, Priority IU, Status IU—same concept, different contexts
- **Migration plan**: {unchanged, migrate, regenerate} based on overlap threshold (≥80% = migrate)
- **Effect**: Identifies which theories are compatible and ready for unification

### Phase 5: Convergence (Codegen / Colimit)
- **Operation**: **Colimit** (categorical pushout) of all IU theories
- **Process**:
  - Takes multiple GAT fragments as input
  - Identifies shared structure (Task concept appearing in multiple IUs)
  - Computes unified theory where shared concepts are merged
- **Result**: Single **deliverable** (e.g., `server.ts`)
- **Universal property guarantee**:
  - Each operation from each IU is preserved
  - Shared concepts (Task) appear exactly once
  - No duplication, no conflicts
  - Consistency guaranteed by construction

### The Outcome
| Before Colimit | After Colimit |
|----------------|---------------|
| Archive has its own Task type | One unified Task type |
| Priority has its own Task type | `archiveTask` and `setPriority` share the same Task |
| Status has its own Task type | Operations compose naturally |
| Manual merging required | Automatic unification |

### Key Insight
The colimit is like taking all the theory fragments (IUs), finding where they talk about the same things, and producing the minimal, most efficient whole that contains all operations without duplication—guaranteed correct by category theory's universal property.