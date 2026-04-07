---
name: phoenix-status
description: Display complete Phoenix VCS state with diagnostics, drift detection, evidence status, and dependency graph health.
---

# Phoenix Status

Unified status per PRD Section 13 (Diagnostics & Severity Model).

## When to Use

- When starting work
- Before committing
- To check project health
- To diagnose issues

## What It Shows

### 1. Bootstrap State
- `BOOTSTRAP_COLD` - Initial setup (D-rate alarms suppressed)
- `BOOTSTRAP_WARMING` - Stabilizing (D-rate alarms suppressed)
- `STEADY_STATE` - Normal operation (alarms active)

### 2. D-Rate Status
- Target: ≤5%
- Acceptable: ≤10%
- Alarm: >15%

From PRD Section 4.1: "D-rate is first-class"

### 3. Drift Detection
- Clean files: Match manifest
- Modified files: Changed since generation
- Missing files: Deleted
- Waived files: Documented exceptions

### 4. Evidence Status
- Risk-tiered policy compliance
- Per-IU evidence scores
- Global acceptance status

### 5. Dependency Graph
- Number of IUs (nodes)
- Dependency edges
- Circular dependencies (errors)

## Using VCS Core

```typescript
import { getVCSStatus, formatVCSStatus } from 'phoenix-vcs/vcs';

const state = await getVCSStatus(projectRoot);
console.log(formatVCSStatus(state));
```

## Using CLI

```bash
npx phoenix-vcs status
```

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║  Phoenix VCS Status                           🟢 HEALTHY     ║
╚══════════════════════════════════════════════════════════════╝

Bootstrap: ✅ STEADY_STATE
Classification: ✅ D-rate 4.5% (TARGET)
Drift: ✅ 12 clean, 0 modified, 0 missing
Evidence: ✅ ACCEPTED (avg score: 94/100)
  12/12 IUs passed
Dependencies: ✅ 12 nodes, 8 edges

Status: 🟢 ACCEPTED - All VCS checks passed
```

## Severity Model

Every diagnostic has:
- **severity**: error | warning | info
- **category**: drift | boundary | policy | dependency | classification
- **subject**: File, IU, or system component
- **message**: Human-readable explanation
- **recommended_actions**: Steps to resolve

## Status Levels

| Overall | Icon | Meaning |
|---------|------|---------|
| HEALTHY | 🟢 | All checks pass |
| WARNING | 🟡 | Non-blocking issues |
| CRITICAL | 🔴 | Blocking issues, must fix |

## CRITICAL Status Means

```
🔴 CRITICAL - Blocking Issues:

❌ [DRIFT] src/generated/app/dashboard.ts
   MODIFIED: Working tree differs from manifest
   → Label with waiver or revert

❌ [BOUNDARY] IU-ec4737a7
   Undeclared side channel: database
   → Add to boundary policy

❌ [POLICY] IU-d9277914
   Evidence failed: unit_tests (3 of 12 failed)
   → Fix tests and re-run

Status: 🔴 REJECTED - Fix blocking errors before proceeding
```

## Integration with Workflow

```bash
# Pre-commit hook
#!/bin/sh
npx phoenix-vcs status
exit $?
```

## Per-PRD Trust Surface

From PRD Section 0:
> "Primary Trust Surface: `phoenix status` must always be explainable, conservative, and correct-enough to rely on."

This means:
- **Explainable**: Every status item has reasoning
- **Conservative**: When in doubt, block (ERROR)
- **Correct-enough**: D-rate tracking ensures quality

## Next Step

Address any CRITICAL issues, or proceed with confidence if HEALTHY.
