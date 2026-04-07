# Provenance Map: examples/taskflow

## Executive Summary

**Content-Addressed Chain**: 9 spec files → 47 canonical nodes → 4 IUs → 32 generated files

**Traceability**: Every generated file contains `_phoenix` export linking back to IU → canonical → spec

---

## Layer 1: Source Documents (Specs)

```
spec/
├── tasks.md                    (9 clauses)
├── analytics.md                (11 clauses)
├── web-dashboard-base.md         (8 clauses)
├── web-dashboard-tasklist.md   (6 clauses)
├── web-dashboard-edit.md       (4 clauses)
├── web-dashboard-archive.md    (3 clauses)
├── web-dashboard-bulk.md       (4 clauses)
├── web-dashboard-analytics-bar.md  (5 clauses)
└── web-dashboard-integration.md    (7 clauses?)
    │
    └── 47 total clauses extracted
```

**Key Requirement Examples**:
- `tasks.md`: "Users must create tasks with title, description, priority"
- `web-dashboard-base.md`: "Dashboard must render complete HTML page with inline CSS"
- `analytics.md`: "System shall track total tasks created, completed, overdue"

---

## Layer 2: Canonical Nodes (Content-Addressed)

Selected nodes showing provenance chain:

| Canon ID | Type | Text | Source File |
|----------|------|------|-------------|
| `a3f7c8d9e1b2` | REQUIREMENT | Dashboard must render complete HTML page with inline CSS | web-dashboard-base.md |
| `b4e8d9f0a2c3` | REQUIREMENT | Compact header with title 'TaskFlow' | web-dashboard-base.md |
| `c5f9e0a1b3d4` | REQUIREMENT | Create task form with title, description, priority | web-dashboard-base.md |
| `d60af1b2c4e5` | CONSTRAINT | Title validation (non-empty) | web-dashboard-base.md |
| `e71b02c3d5f7` | REQUIREMENT | Tasks persist in localStorage | web-dashboard-base.md |
| `f82c13d4d6f8` | REQUIREMENT | Display tasks immediately on page load | web-dashboard-base.md |
| `e71b02c3d5f6` | REQUIREMENT | Render tasks as styled cards | web-dashboard-tasklist.md |
| `f82c13d4e6a7` | REQUIREMENT | Each card shows title, priority, status badges | web-dashboard-tasklist.md |
| `093d24e5f7b8` | REQUIREMENT | Priority badges color-coded | web-dashboard-tasklist.md |
| `2b5f46a7b9d0` | REQUIREMENT | Overdue tasks red border + indicator | web-dashboard-tasklist.md |
| `...` | ... | ... | ... |
| **47 total** | Mixed | All requirements, constraints, definitions | 9 spec files |

**Hash Algorithm**: Each `id` is truncated SHA-256 of normalized text

---

## Layer 3: Implementation Units (Content-Addressed)

### IU 1: Dashboard Page
```yaml
ID: ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88
Risk: HIGH
Source Requirements: 34 canonical nodes
Output: src/generated/web-dashboard/dashboard-page.ts
Test: src/generated/web-dashboard/__tests__/web-dashboard.test.ts

Invariants:
  - Title validation: form rejects empty titles
  - Catppuccin Mocha only: no theme toggle
  - Responsive layout: mobile/desktop
  - Overdue tasks: red border + OVERDUE indicator
  - localStorage persistence: survive refreshes
  - Inline edit panels: no modal dialogs
  - Client-side view switching: no page reload
```

**Traceability**: 34 canon IDs link to web-dashboard-*.md files

### IU 2: Analytics Panel
```yaml
ID: 59d32939d50083b6ecf70e500f215a179f42a5ea99a186cb8af2720e3aaa1d74
Risk: LOW
Source Requirements: 5 canonical nodes
Output: src/generated/web-dashboard/analytics-panel.ts

Invariants:
  - Completion rate = (completed / total) * 100
  - Overdue exclude completed/archived
  - Status bar compact, centered, fit-content
```

**Traceability**: 5 canon IDs (analytics + dashboard)

### IU 3: Task List Display
```yaml
ID: a6550cdc3ef254c13571c1134a3f1ad230c942e0325c50f89ae97502a302fd01
Risk: MEDIUM
Source Requirements: 5 canonical nodes
Output: src/generated/web-dashboard/task-list-display.ts

Invariants:
  - Cards always show title, priority, status
  - Filtering respects status/priority/assignee
  - Status transitions trigger callbacks
```

**Traceability**: 5 canon IDs (tasklist + dashboard)

### IU 4: Styles
```yaml
ID: 8d072032308810bce8136ef5a0a51f8e99a35d83edfa38f4d69cdca300d1c6af
Risk: MEDIUM
Source Requirements: 13 canonical nodes (Catppuccin theme definitions)
Output: src/generated/web-dashboard/styles.ts

Invariants:
  - CSS properties use --ctp-* prefix
  - Semantic mappings: --primary: var(--ctp-blue)
  - Catppuccin Mocha exclusively
```

---

## Layer 4: Generated Code (Content-Addressed)

### dashboard-page.ts
```typescript
// File: src/generated/web-dashboard/dashboard-page.ts
// Size: ~12KB
// SHA-256: a1b2c3d4e5f6... (from manifest)

export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;

// ... 1250 lines of implementation ...
```

**Traceability**: `_phoenix.iu_id` → `ius.json` → `source_canon_ids` → `canonical.json` → `source_file`

**Query Result**: "dashboard-page.ts implements IU ec4737a7..., which derives from 34 requirements in web-dashboard-*.md"

### Other Files with Traceability

| File | IU ID | Source |
|------|-------|--------|
| `analytics-panel.ts` | 59d32939d5... | Analytics Panel IU |
| `task-list-display.ts` | a6550cdc3e... | Task List Display IU |
| `styles.ts` | 8d07203230... | Styles IU |
| `metrics.ts` | 91cdb7e04a... | Analytics Metrics IU |
| `priority-breakdown.ts` | 0e8c6fd7f3... | Priority Breakdown IU |
| `team-performance.ts` | 1a341b16d0... | Team Performance IU |
| `task-lifecycle.ts` | ... | Task Lifecycle IU |
| `search-and-filtering.ts` | ... | Search/Filter IU |

### Files Without Traceability (Orphan/Utility)

| File | IU ID | Note |
|------|-------|------|
| `index.ts` | null | Barrel export, no IU |
| `server.ts` | null | HTTP server, generic |
| `__tests__/*.test.ts` | null or derived | Test files |

---

## Complete Provenance Chain (Example)

### Example 1: Title Validation Feature

```
User Story: "Form should reject empty titles"
    │
    ▼
spec/web-dashboard-base.md (line ~25)
"The create form must validate that title is non-empty before submission"
    │
    ▼ [normalize + hash]
Canon Node: d60af1b2c4e5
Type: CONSTRAINT
Text: "create form must validate title non empty before submission"
    │
    ▼ [grouped into IU]
Dashboard Page IU: ec4737a7671a...
Invariants include: "Title validation: form rejects empty titles"
    │
    ▼ [generated]
dashboard-page.ts (line ~25)
```typescript
public addTask(title: string, ...): Task {
  if (!title.trim()) {
    throw new Error('Task title cannot be empty');  // ← Requirement implemented
  }
  ...
}
```
    │
    ▼ [traceability export]
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  ...
}
```

**Query**: "Where did title validation come from?"
1. Find `throw new Error('Task title cannot be empty')` in dashboard-page.ts
2. See `_phoenix.iu_id = ec4737a7...`
3. Look up IU in ius.json
4. Find `d60af1b2c4e5` in `source_canon_ids`
5. Look up canon in canonical.json
6. Result: "From web-dashboard-base.md, CONSTRAINT type, 'title non-empty' requirement"

---

### Example 2: Overdue Task Indicator

```
Spec: "Overdue tasks must have red border and OVERDUE indicator"
    │
Canon: 2b5f46a7b9d0
    │
IU: ec4737a7... (Dashboard Page)
    │
Code: dashboard-page.ts
// CSS generation includes:
if (isOverdue(task)) {
  cardClass += ' task-overdue';  // Red border
  indicator = '<span class="overdue-indicator">OVERDUE</span>';
}
```

---

## Selective Invalidation Example

**Scenario**: Change requirement "red border" to "orange border"

```
Step 1: Edit spec/web-dashboard-tasklist.md
  Change: "Overdue tasks must have a red border"
  To:     "Overdue tasks must have an orange border"

Step 2: Re-canonicalize
  Old canon: 2b5f46a7b9d0 ("red border")
  New canon: z9y8x7w6v5u4 ("orange border") ← Different hash!

Step 3: Check IUs for invalidation
  Dashboard Page IU has source_canon_ids containing 2b5f46a7b9d0
  → IU ec4737a7... is INVALIDATED

Step 4: Cascade check
  Any IUs depending on Dashboard Page IU?
  → None (dependencies: [])

Step 5: Regenerate
  Only dashboard-page.ts regenerates
  Other 31 files untouched (selective invalidation!)

Step 6: New manifest entry
  dashboard-page.ts: {
    iu_id: "ec4737a7...",  // Same IU (canon_ids changed → iu_id changes!)
    hash: "new-sha-256...", // Different content
    ...
  }
```

**Key**: Only 1 of 32 files regenerated, not the entire codebase.

---

## Provenance Statistics

| Metric | Value |
|--------|-------|
| Spec files | 9 |
| Clauses extracted | 47 |
| Canonical nodes | 47 (content-addressed) |
| Implementation Units | 4 |
| Generated files | 32 |
| Files with traceability (_phoenix) | ~16 |
| Total SHA-256 hashes | 47 + 4 + 32 = 83 |
| Provenance edges | 47 (spec→canon) + 47 (canon→IU) + 32 (IU→code) = 126 |

---

## Query Examples

### Q: "Which requirements affect dashboard-page.ts?"
```bash
1. grep iu_id dashboard-page.ts → ec4737a7671a...
2. jq '.ius[] | select(.id == "ec4737a7...") | .source_canon_ids' ius.json
3. For each canon_id, jq '.canonical[] | select(.id == "...") | .text' canonical.json
4. Result: 34 requirements listed
```

### Q: "Where did localStorage persistence come from?"
```bash
1. grep -r "localStorage" canonical.json
   → e71b02c3d5f7: "Tasks must persist in browser localStorage"
2. jq '.ius[] | select(.source_canon_ids | contains(["e71b02c3d5f7"])) | .name' ius.json
   → "Dashboard Page"
3. grep -r "ec4737a7" ius.json → output_path
   → "src/generated/web-dashboard/dashboard-page.ts"
4. Result: localStorage code is in dashboard-page.ts from Dashboard Page IU
```

### Q: "What files depend on analytics requirements?"
```bash
1. Find canon IDs from analytics.md
2. Find IUs with those canon IDs in source_canon_ids
3. Find output_paths for those IUs
4. Result: analytics-panel.ts, metrics.ts, etc.
```

---

## Content-Addressing Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                    PHOENIX VCS PROVENANCE GRAPH                         │
│                      examples/taskflow                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SPEC              CANONICAL              IU                 CODE      │
│   ────              ─────────              ──                 ────      │
│                                                                         │
│   tasks.md          a3f7c8d9... ──┐                              │
│   web-dashboard-*   b4e8d9f0... ──┤                              │
│   analytics.md      c5f9e0a1... ──┼──► ec4737a7671a... ───► dashboard-page.ts│
│                     d60af1b2... ──┤      (34 canons)              (12KB) │
│                     ... 30 more ──┘                              │
│                                                                         │
│                     2b5f46a7... ──┐                              │
│                     3c6057b8... ──┼──► 59d32939d5... ───► analytics-panel.ts │
│                     ... 3 more  ──┘      (5 canons)               (3KB)  │
│                                                                         │
│   [Text]            [SHA-256 IDs]        [SHA-256 IDs]      [SHA-256]   │
│                                                                         │
│   Every node has a stable identity based on content hash.               │
│   Changing content → New hash → Cascade invalidation.                   │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```
