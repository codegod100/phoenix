---
name: phoenix-pipeline
description: Phoenix pipeline - step by step guide for spec → code transformation
---

# Phoenix Pipeline

Transform specification files into implementation code.

## Pipeline Flow

```
spec/*.md → Canonical Requirements → Implementation Units → Code
    (Ingest)      (Canonicalize)         (Plan)         (Regen)
```

## Phase A: Ingest - Read Specs

Read all `.md` files in `spec/` directory and extract clauses.

**Input:** `spec/*.md`

**Process:**
1. Read each markdown file
2. Extract lines starting with `- ` or `* `
3. Look for markers: `REQUIREMENT:`, `CONSTRAINT:`, `DEFINITION:`, `ASSUMPTION:`, `SCENARIO:`
4. Build clause list with:
   - id: SHA-256 hash of text
   - type: REQUIREMENT | CONSTRAINT | DEFINITION | ASSUMPTION | SCENARIO
   - text: normalized content
   - section: parent heading

**Output:** List of clauses

```
Example output:
- [REQ-001] system shall render dashboard (from web-dashboard.md)
- [REQ-002] background color is #1e1e2e (from web-dashboard.md)
- [CON-001] no theme toggle allowed (from web-dashboard.md)
```

## Phase B: Canonicalize - Clean Requirements

Transform clauses into canonical requirements.

**Input:** Clauses from Phase A

**Process:**
1. Group related clauses by section
2. Remove duplicates
3. Normalize language (lowercase, standardize)
4. Assign node IDs (`node-<hash>` first 8 chars of SHA-256 of normalized text)

**Output:** Canonical requirements

```
Example output:
node-a1b2c3d4: dashboard renders complete html page
node-b2c3d4e5: dashboard uses catppuccin mocha colors
node-c3d4e5f6: no theme toggle allowed
```

## Phase C: Plan - Group Into IUs

Organize requirements into Implementation Units.

**Input:** Canonical requirements

**Process:**
1. Group by logical unit (e.g., all dashboard UI requirements)
2. Assign risk tier:
   - low: <5 requirements, simple
   - medium: 5-10 requirements
   - high: >10 requirements or user-facing
3. Define contract (description, inputs, outputs, invariants)
4. Assign output files

**Output:** Implementation Units

```
Example output:
IU-ec4737a7: Dashboard Page (HIGH)
  Requirements: node-a1b2c3d4, node-b2c3d4e5, node-c3d4e5f6, ...
  Contract: Renders HTML dashboard with Catppuccin theme
  Output: src/generated/web-dashboard/dashboard-page.ts

IU-a1b2c3d4: Styles (MEDIUM)
  Requirements: node-b2c3d4e5, node-d4e5f678
  Contract: CSS custom properties
  Output: src/generated/web-dashboard/styles.ts
```

## Phase D: Regen - Generate Code

Implement each IU as code.

**Input:** Implementation Units

**Process:**
For each IU:
1. Read its requirements
2. Generate TypeScript implementation
3. Add `_phoenix` traceability export
4. Write to output file
5. Add tests (if medium+ risk)

**Traceability Export:**
```typescript
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

**Output:** Generated files

## Running the Pipeline

**IMPORTANT:** The pipeline must run inline (direct tool execution), NOT in a subprocess or background process. Each phase uses standard tools (read, edit, write, bash) directly.

### Execution Model
- ✅ **CORRECT:** Run phases sequentially using direct tool calls
- ❌ **WRONG:** Delegate to subprocess, interactive_shell, or background job

### Phase Execution

**Phase A: Ingest**
```
1. Use bash to: ls spec/*.md
2. Use read to: read each spec file
3. Extract clauses (lines starting with "- " or bullet markers)
4. Report: "Found X clauses from Y specs"
```

**Phase B: Canonicalize**
```
1. Normalize each clause (lowercase, remove fluff)
2. Generate node-<hash> IDs (SHA-256, first 8 chars)
3. Use write to: create/update .phoenix/canonical.md
4. Report: "Canonicalized: X requirements"
```

**Phase C: Plan**
```
1. Read canonical.md
2. Group requirements into Implementation Units
3. Assign risk tiers (low/medium/high)
4. Use write to: create/update .phoenix/plan.md
5. Report: "Planned: X IUs (low: A, medium: B, high: C)"
```

**Phase D: Regen**
```
1. Read plan.md
2. For each IU:
   - Use write to: generate TypeScript file
   - Include _phoenix export with iu_id
3. Use bash to: npm run build (verify)
4. Report: "Generated: X files"
```

### Example Session (Inline)

```
User: Run pipeline

Agent: [Phase A] Ingesting specs...
  Found 67 clauses from 9 spec files

Agent: [Phase B] Canonicalizing...
  75 canonical requirements → .phoenix/canonical.md

Agent: [Phase C] Planning...
  9 IUs: low=2, medium=3, high=4 → .phoenix/plan.md

Agent: [Phase D] Regenerating...
  Generated 9 TypeScript files → src/generated/taskflow/
  Build: ✅ passed

✅ Pipeline complete
```
