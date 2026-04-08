---
name: phoenix-codegen
description: Unified code generator - generates IU implementations AND deliverable as single pipeline phase. Uses colimit to wire IUs together into working deliverable.
---

# Phoenix Codegen

**Single phase that generates all code** - IU implementations AND deliverable.

## Pipeline Position

Runs after `plan` phase, before `evidence`:

```
ingest → canonicalize → plan → [CODEGEN] → evidence → audit → drift
```

## What It Generates

### 1. IU Implementations
From each IU's `boundary.exports`:
```typescript
// src/generated/archive/index.ts
export function getArchivedTasks(id: string): Archive | null
export function archiveTask(item: Archive): Archive
```

### 2. Deliverable (that uses IUs)
Imports from IUs and wires them together via colimit:
```typescript
// src/generated/app/server.ts
import { getArchivedTasks, archiveTask } from '../archive/index.js';

// API endpoint uses IU function
app.get('/api/tasks/archived', (req, res) => {
  const archived = getArchivedTasks(); // ← Calls IU implementation
  res.json(archived);
});
```

## How It Works

1. **Load IUs** - Read `ius.json` with boundary exports
2. **Compute colimit** - WASM GAT identifies shared operations
3. **Generate IU files** - Each IU gets implementation file
4. **Generate deliverable** - Imports from IUs, creates unified API

## Usage

```bash
node .pi/skills/phoenix-codegen/codegen.js <project-path>
```

## Output Structure

```
src/generated/
├── archive/index.ts          # IU implementation
├── task/index.ts             # IU implementation
├── ...                       # Other IUs
└── app/
    ├── server.ts             # Deliverable (uses IUs)
    ├── store.ts              # Data layer (uses IUs)
    └── .phoenix-deliverable.json  # Traceability
```

## Colimit Integration

The deliverable is the **colimit** of all IU theories:
- Operations with same name (e.g., `getArchivedTasks`) are identified
- Deliverable imports from canonical IU location
- Single API surface composed from all domains

## No Separate Regen/Deliverable

This replaces the old separate skills:
- ❌ `phoenix-regen` (RED stubs)
- ❌ `phoenix-deliverable` (just listed operations)
- ✅ `phoenix-codegen` (working implementations + deliverable)

All code generated in ONE phase at the end of the pipeline.
