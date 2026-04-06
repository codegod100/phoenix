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
4. Assign node IDs (node-001, node-002, etc.)

**Output:** Canonical requirements

```
Example output:
node-001: dashboard renders complete html page
node-002: dashboard uses catppuccin mocha colors
node-003: no theme toggle allowed
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
IU-1: Dashboard Page (HIGH)
  Requirements: node-001, node-002, node-003, ...
  Contract: Renders HTML dashboard with Catppuccin theme
  Output: src/generated/web-dashboard/dashboard-page.ts

IU-2: Styles (MEDIUM)
  Requirements: node-002, node-004
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
  iu_id: '<hash>',
  name: 'Dashboard Page',
  risk_tier: 'high',
  canon_ids: ['node-001', 'node-002', ...] as const,
} as const;
```

**Output:** Generated files

## Running the Pipeline

Since this is agent-skills only (no CLI), run phases manually:

1. **Ingest**: Read specs and list clauses
2. **Canonicalize**: Clean and normalize requirements
3. **Plan**: Group into IUs and assign risk
4. **Regen**: Generate code files with traceability

## Example Session

```
User: Run pipeline on taskflow web dashboard

Agent:
  [Phase A] Ingest
    - Read spec/web-dashboard.md
    - Found 20 clauses
    - 12 REQUIREMENT, 3 CONSTRAINT, 5 DEFINITION

  [Phase B] Canonicalize
    - 18 canonical requirements extracted
    - Assigned IDs: node-001 through node-018

  [Phase C] Plan
    - IU-1: Dashboard Page (HIGH) - 11 requirements
    - IU-2: Styles (MEDIUM) - 7 requirements

  [Phase D] Regen
    - Generated dashboard-page.ts
    - Generated styles.ts
    - Added _phoenix exports

  ✅ Pipeline complete. 2 files generated.
```
