---
name: phoenix-status
description: Display complete Phoenix VCS state with diagnostics. Executable skill - run status.js directly.
---

# Phoenix Status

Unified status per PRD Section 13 (Diagnostics & Severity Model).

## When to Use

- When starting work
- Before committing
- To check project health
- To diagnose issues

## How to Run

```bash
# Direct execution
node .pi/skills/phoenix-status/status.js

# Or from anywhere
node /path/to/.pi/skills/phoenix-status/status.js [project-root]
```

## What It Shows

### 1. Bootstrap State
- `BOOTSTRAP_COLD` - Initial setup
- `BOOTSTRAP_WARMING` - Stabilizing
- `STEADY_STATE` - Normal operation

### 2. D-Rate Status
- Target: ≤5%
- Acceptable: ≤10%
- Alarm: >15%

### 3. Drift Detection
- Clean/modified/missing files

### 4. Graph Health
- IU count, dependency edges

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║  Phoenix VCS Status                           🟢 HEALTHY       ║
╚══════════════════════════════════════════════════════════════╝

Bootstrap: ✅ STEADY_STATE
Classification: ✅ D-rate 4.5% (TARGET)
Drift: ✅ 12 clean, 0 modified, 0 missing
Graph: 12 nodes, 8 edges

Status: 🟢 ACCEPTED
```

## Status Levels

| Overall | Meaning |
|---------|---------|
| HEALTHY | All checks pass |
| WARNING | Non-blocking issues |
| CRITICAL | Blocking issues, must fix |

## Per-PRD Trust Surface

> "Primary Trust Surface: phoenix status must always be explainable, conservative, and correct-enough to rely on."

## Next Step

Address any CRITICAL issues, or proceed if HEALTHY.
