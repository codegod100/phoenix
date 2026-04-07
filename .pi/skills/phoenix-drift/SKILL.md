---
name: phoenix-drift
description: Detect drift between generated manifest and working tree. Defensively blocks unlabeled manual edits with waiver system.
---

# Phoenix Drift

Defensive drift detection per PRD Section 9.

## When to Use

- Before committing (must be clean)
- After manual edits (need waiver)
- To validate workspace integrity
- Before releasing

## Drift Types

| Status | Meaning | Action |
|--------|---------|--------|
| CLEAN | File matches manifest | None |
| MODIFIED | File changed since generation | Waiver required |
| MISSING | File deleted | Waiver required |
| ORPHAN | File not in manifest | Add to spec or waive |
| WAIVED | Change documented | Accepted |

## Process

### Step 1: Load manifest

```bash
cat .phoenix/manifests/generated_manifest.json
```

### Step 2: Compare working tree

Using VCS core:

```typescript
import { loadManifest, detectDrift, formatDriftReport } from 'phoenix-vcs/vcs';

const manifest = loadManifest(projectRoot);
const report = detectDrift(projectRoot, manifest);

console.log(formatDriftReport(report));
```

### Step 3: Handle blocking drift

If `report.has_blocking_drift`:

```
❌ BLOCKING DRIFT (acceptance blocked)

Modified Files:
  src/generated/app/dashboard.ts
    Expected: 96bc65e6 → Actual: e5176736

Missing Files:
  src/generated/app/styles.ts

Actions:
  1. Revert: git checkout src/generated/
  2. Create waiver: edit .phoenix/waivers.json
```

### Step 4: Create waiver (if needed)

```typescript
import { createWaiver } from 'phoenix-vcs/vcs';

const waiver = createWaiver('src/app.ts', 'temporary_patch', {
  expires: '2026-04-15',
  signed_by: 'nandi'
});
// → { type: 'temporary_patch', expires: '...', signed_by: '...' }
```

Write to `.phoenix/waivers.json`:

```json
{
  "version": "1.0.0",
  "waivers": [
    {
      "file": "src/generated/app/dashboard.ts",
      "type": "temporary_patch",
      "reason": "Emergency fix for production",
      "expires": "2026-04-15",
      "signed_by": "nandi",
      "created_at": "2026-04-07T20:00:00Z"
    }
  ]
}
```

Waiver types:
- `promote_to_requirement` - Manual edit becomes official requirement
- `temporary_patch` - Short-term fix (requires expiration)
- `manual_override` - Intentional deviation (requires signoff)

## Using CLI

```bash
# Check for drift
npx phoenix-vcs drift

# Output:
# 🔍 Phoenix VCS Drift Detection
# 
# ❌ BLOCKING DRIFT
#   src/generated/app/dashboard.ts (modified)
#   src/generated/app/styles.ts (missing)
#
# Status: 🔴 REJECTED
```

## Per-PRD Behavior

From PRD Section 9:
> "On status: Compare working tree vs generated_manifest. If mismatch and no waiver: Emit ERROR, Block acceptance."

> "Manual edits must be labeled: promote_to_requirement, waiver (signed), temporary_patch (expires)."

This is defensive VCS - it prevents "secret" manual edits that bypass the spec-driven pipeline.

## Integration with CI

```yaml
# .github/workflows/phoenix.yml
- name: Check Drift
  run: |
    npx phoenix-vcs drift
    if [ $? -ne 0 ]; then
      echo "❌ Drift detected. Label manual edits with waivers."
      exit 1
    fi
```

## Next Step

Run `phoenix-status` for full project state, or fix drift and re-run.
