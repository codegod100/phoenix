---
name: phoenix-drift
description: Detect drift between generated manifest and working tree. Defensively blocks unlabeled manual edits with waiver system. Executable skill - runs drift.js directly.
---

# Phoenix Drift

Defensive drift detection per PRD Section 9.

## When to Use

- Before committing (must be clean)
- After manual edits (need waiver)
- To validate workspace integrity
- Before releasing

## How to Run

```bash
# Direct execution
node .pi/skills/phoenix-drift/drift.js

# Or from anywhere
node /path/to/.pi/skills/phoenix-drift/drift.js [project-root]
```

## Drift Types

| Status | Meaning | Action |
|--------|---------|--------|
| CLEAN | File matches manifest | None |
| MODIFIED | File changed since generation | Waiver required |
| MISSING | File deleted | Waiver required |
| ORPHAN | File not in manifest | Add to spec or waive |
| WAIVED | Change documented | Accepted |

## What It Does

1. Loads `.phoenix/manifests/generated_manifest.json`
2. Computes SHA-256 hashes of all working tree files
3. Compares expected vs actual hashes
4. Reports drift with blocking/non-blocking status
5. Exits with code 1 if blocking drift detected

The skill is self-contained and does not require external VCS modules. It performs direct manifest and file system comparison.

## Per-PRD Behavior

> "On status: Compare working tree vs generated_manifest. If mismatch and no waiver: Emit ERROR, Block acceptance."

> "Manual edits must be labeled: promote_to_requirement, waiver (signed), temporary_patch (expires)."

This is defensive VCS - it prevents "secret" manual edits that bypass the spec-driven pipeline.

## Integration with CI

```yaml
# .github/workflows/phoenix.yml
- name: Check Drift
  run: |
    node .pi/skills/phoenix-drift/drift.js
    if [ $? -ne 0 ]; then
      echo "❌ Drift detected. Label manual edits with waivers."
      exit 1
    fi
```

## Next Step

Run `phoenix-status` for full project state, or fix drift and re-run.
