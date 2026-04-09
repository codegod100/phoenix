---
name: phoenix-plan
description: Plan Implementation Units from canonical requirements with content-addressed IDs, risk tiers, and boundary policies. Groups related requirements into compilation boundaries. Executable skill - runs plan.js directly.
---

# Phoenix Plan

Organize requirements into Implementation Units (IUs) with full VCS tracking.

## When to Use

- After canonicalization
- Before code generation
- To organize complex features
- When requirements change (re-plan affected IUs)

## Input

Canonical requirements:
```markdown
node-a1b2c3d4: system shall render complete html page
node-b2c3d4e5: page must display taskflow header
node-c3d4e5f6: no theme toggle allowed
node-d4e5f678: dashboard uses catppuccin mocha colors
node-e5f67890: background color is #1e1e2e
node-f6789012: card background is #313244
```

## How to Run

```bash
node .pi/skills/phoenix-plan/plan.js [project-root]
```

## Process

### Step 1: Group related requirements

Group by:
- Feature area (UI, API, Database)
- User flow (Create Task, Edit Task)
- Technical concern (Styles, Logic, Validation)

### Step 2: Compute content-addressed IU ID

The plan.js script uses VCS identity functions inlined from `src/vcs/identity.ts`:

- `iuId(name, contract, sourceCanonIds)` - SHA-256 of IU identity

**Same contract + same requirements = same IU ID**

### Step 3: Assign risk tier

| Tier | Criteria | Evidence Required |
|------|----------|-------------------|
| low | <5 requirements, simple logic | typecheck, lint, boundary |
| medium | 5-10 requirements | + unit_tests |
| high | 10+ requirements, user-facing UI | + property_tests, threat_note |
| critical | Security, data integrity | + static_analysis, human_signoff |

### Step 4: Define contract and boundaries

```typescript
interface Contract {
  description: string;
  inputs: string[];
  outputs: string[];
  invariants: string[];
}

interface BoundaryPolicy {
  dependencies: {
    code: {
      allowed_ius?: string[];
      forbidden_packages?: string[];
    };
    side_channels: {
      databases?: string[];
      external_apis?: string[];
    };
  };
}
```

### Step 5: Assign output files

Map IU to generated files:
```
IU-ec4737a7 → src/generated/app/dashboard.ts
IU-ec4737a7 → src/generated/app/__tests__/dashboard.test.ts
```

## Output

Write to `.phoenix/plan.md` and `.phoenix/graphs/ius.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-07T20:00:00Z",
  "ius": [
    {
      "iu_id": "ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88",
      "short_id": "IU-ec4737a7",
      "name": "Dashboard Page",
      "kind": "web-ui",
      "risk_tier": "high",
      "contract": {
        "description": "Renders HTML dashboard with Catppuccin theme",
        "inputs": [],
        "outputs": ["complete HTML page"],
        "invariants": [
          "Uses only Catppuccin Mocha colors",
          "No theme toggle"
        ]
      },
      "source_canon_ids": [
        "a1b2c3d4e5f67890...",
        "b2c3d4e5f6789012..."
      ],
      "dependencies": [],
      "output_files": [
        "src/generated/app/dashboard.ts",
        "src/generated/app/__tests__/dashboard.test.ts"
      ],
      "boundary_policy": {
        "dependencies": {
          "code": {
            "forbidden_packages": ["external-ui-lib"]
          },
          "side_channels": {
            "databases": ["app.db"]
          }
        }
      },
      "boundary": {
        "exports": ["renderDashboard", "getTheme", "applyStyles"]
      },
      "evidence_policy": {
        "required": ["typecheck", "lint", "boundary_validation", "unit_tests"]
      }
    }
  ]
}
```

### Boundary Extraction

The plan phase **extracts operations from requirement text** using GENERIC patterns (no hardcoded application logic):

| Requirement Pattern | Extracted Export |
|---------------------|------------------|
| "provide a function to X" | `X` |
| "system must provide X" | `X` |
| "users must be able to X" | `X` |
| "X must be queryable" | `queryX` |
| "X must be filterable by Y" | `filterByY` |
| "searchable by X" | `search` |
| "sortable by X" | `sortBy` |
| "must use a custom X component" | `renderX`, `getXHTML` |
| "X must display Y" | `renderY` |
| "X picker/calendar/modal must" | `renderX`, `showX`, `hideX` |

**Derived from canonical requirements only** — no config, no hardcoding. The verb "archive" in your spec becomes the function `archive`, "query archived tasks" becomes `queryArchivedTasks`, etc.

## Quality Checks

- [ ] IU ID is SHA-256 of contract + requirements
- [ ] Risk tier appropriate for requirement count
- [ ] No IU has >20 requirements (split if needed)
- [ ] UI/API/DB concerns separated
- [ ] Boundary policy declares side-channels
- [ ] **Boundary exports extracted from requirements** (function names from spec text)
- [ ] Evidence policy matches risk tier

## Selective Invalidation

When specs change, only affected IUs need regeneration:

```bash
# Check which IUs are invalidated by spec changes
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4 node-b2c3d4e5

# Output:
# Invalidated IUs: 3
#   IU-ec4737a7 (Dashboard Page)
#   IU-d9277914 (Board UI)
#   IU-2cb00b55 (Card UI)
# Selective rate: 25% (3 of 12 IUs)
```

Use the cascade engine to find transitive dependencies.

## Next Step

Run `node .pi/skills/phoenix-regen/regen.js` to generate code for planned IUs.
