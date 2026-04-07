---
name: phoenix-purge
description: Purge generated code to test REGEN step determinism. Deletes src/generated/* only, preserves canonicals and IUs, regenerates code, and reports diff scores. Executable skill - runs purge.sh and compare.sh directly.
---

# Phoenix Purge

Test pipeline determinism by purging and regenerating code using `purge.sh` and `compare.sh`.

## How to Run

```bash
# Full purge and regenerate
bash .pi/skills/phoenix-purge/purge.sh

# Compare regenerated files with backup
bash .pi/skills/phoenix-purge/compare.sh
```

## Purpose

Measure how deterministic the Phoenix code generation pipeline is:
1. Delete all generated **code files** (`src/generated/*`)
2. Regenerate code from existing Implementation Units (IUs in `.phoenix/plan.md`)
3. Compare regenerated code with original
4. Report determinism score

**IMPORTANT**: Canonicals (`.phoenix/canonical.md`) and IUs (`.phoenix/plan.md`) are **NOT** purged - they are the source of truth. Only the final code generation step is re-run.

## Usage

```bash
/skill:phoenix purge [options]
```

## Pipeline Determinism Score

| Score | Meaning |
|-------|---------|
| 100% | Perfect determinism - byte-for-byte identical |
| 95-99% | Excellent - only formatting/whitespace differs |
| 85-94% | Good - minor implementation variations |
| 70-84% | Fair - structural differences but equivalent |
| <70% | Poor - significant divergence, review needed |

## Factors Affecting Determinism

### High Impact
- [ ] Temperature setting (must be 0 for deterministic LLM calls)
- [ ] Model version changes between runs
- [ ] Timestamp/random values in generated code
- [ ] Non-deterministic sorting (Object.keys, etc.)

### Medium Impact
- [ ] Comment generation variations
- [ ] Variable naming conventions
- [ ] Import ordering

### Low Impact
- [ ] Whitespace formatting
- [ ] Trailing newlines
- [ ] Quote style (single vs double)

## The Purge Process

### Phase 1: Backup
```
src/generated/ → .phoenix/purge-backup/src-generated-{timestamp}/
.phoenix/canonical.md → backup
.phoenix/plan.md → backup
```

### Phase 2: Purge (Code Only)
```
rm -rf src/generated/*
# NOTE: .phoenix/canonical.md and .phoenix/plan.md are preserved!
```

**Preserved** (source of truth):
- `spec/` - Original specifications
- `.phoenix/canonical.md` - Canonical requirements
- `.phoenix/plan.md` - Implementation Units

**Purged** (regeneratable from IUs):
- `src/generated/*` - All generated code

### Phase 3: Regenerate (From IUs Only)
```
IU → regen → src/generated/*.ts
```

Skip ingest/canonicalize/plan phases - go straight to code generation from existing IUs.

### Phase 4: Compare
```
for each file in src/generated/:
  - Calculate hash of original
  - Calculate hash of regenerated
  - Compute diff score
  - Report differences
```

## Diff Scoring Algorithm

```
file_score = (1 - levenshtein_distance / max_length) × 100

overall_score = average(file_scores) × stability_multiplier

where:
  stability_multiplier = 1.0 if no structural changes
                       = 0.9 if minor structural changes  
                       = 0.7 if major structural changes
```

## Output Format

```
🧪 PHOENIX PURGE - Regen Determinism Test

Phase 1: Backup
✓ Backed up to .phoenix/purge-backup/20240115-143022/
✓ Preserved canonical.md and plan.md (source of truth)

Phase 2: Purge Code
✓ Deleted 9 generated code files in src/generated/
✓ Canonicals and IUs preserved

Phase 3: Regenerate from IUs
✓ Plan: 9 IUs ready
✓ Regen: 9 files, 1583 lines from IUs

Phase 4: Diff Analysis
┌─────────────────────────────────────────────────────────┐
│ File                    │ Lines │ Diff % │ Status       │
├─────────────────────────────────────────────────────────┤
│ types.ts               │    98 │ 100%   │ ✅ Identical │
│ schema.ts              │   155 │  98%   │ ✅ Minor     │
│ database.ts            │   158 │  97%   │ ✅ Minor     │
│ repository.ts          │   236 │  95%   │ ✅ Minor     │
│ app.ts                 │   300 │  94%   │ ⚠️ Watch     │
│ sidebar.ts             │   231 │ 100%   │ ✅ Identical │
│ editor.ts              │   218 │ 100%   │ ✅ Identical │
│ status.ts              │    70 │ 100%   │ ✅ Identical │
└─────────────────────────────────────────────────────────┘

📊 REGEN DETERMINISM SCORE: 98.0% (Excellent)

📝 Analysis:
- 6/8 files identical (100%)
- 2/8 files minor variations (95-98%)
- No structural changes detected
- Variance likely from: comment formatting

Recommendation: Regen phase is highly deterministic.
Minor non-determinism in comments is acceptable.
```

## Running the Skill

The purge skill uses shell scripts for deterministic testing:

```bash
# Step 1: Purge and backup
bash .pi/skills/phoenix-purge/purge.sh [project-root]

# Step 2: Manually regenerate code (intentionally manual for safety)
node .pi/skills/phoenix-regen/regen.js

# Step 3: Compare results
bash .pi/skills/phoenix-purge/compare.sh [backup-path]
```

**Note:** Regeneration is intentionally manual (Step 2) so you can verify the purge before re-running the pipeline. The purge.sh script stops after backing up and purging, allowing you to confirm before regenerating.

### Manual Steps (if not using scripts)

1. **Backup current state**
   ```bash
   timestamp=$(date +%Y%m%d-%H%M%S)
   mkdir -p .phoenix/purge-backup/$timestamp
   cp -r src/generated .phoenix/purge-backup/$timestamp/
   # Note: canonical.md and plan.md are NOT backed up - they are source of truth
   ```

2. **Purge generated code only**
   ```bash
   rm -rf src/generated/*
   # canonical.md and plan.md preserved!
   ```

3. **Regenerate from IUs**
   - Use existing `.phoenix/plan.md` IUs
   - Run `regen` to generate code
   - (Skip ingest/canonicalize/plan - go straight to code gen)

4. **Calculate diff scores**
   - Compare each regenerated file with backup
   - Generate report

## Interpreting Results (Regen Phase Only)

### Score: 100% (Perfect)
- All files byte-for-byte identical
- Regen phase is fully deterministic
- Can reliably re-run regen without surprises
- Safe for selective invalidation

### Score: 95-99% (Excellent)
- Minor variations (comments, formatting, import order)
- Semantically identical
- Safe for production use
- Minor drift acceptable

### Score: 85-94% (Good)
- Some implementation variations
- Functionally equivalent
- Monitor for drift across multiple runs
- Consider if variations affect traceability

### Score: 70-84% (Fair)
- Structural differences in generated code
- May require full regeneration instead of selective
- Investigate root causes in regen templates
- Not ideal for production CI/CD

### Score: <70% (Poor)
- Significant divergence in generated code
- Regen step is non-deterministic
- **Must fix before relying on generated code**
- Review LLM temperature, model version, templates

## Determinism Checklist (Regen Phase)

To improve regen determinism scores:

### Code Generation Stability
- [ ] Use temperature=0 for all LLM calls in regen step
- [ ] Pin model version (e.g., `claude-sonnet-4-20250514` not just `claude`)
- [ ] Sort all arrays/Objects before iteration in templates
- [ ] Avoid Date.now() in generated code (use fixed timestamps if needed)
- [ ] Use stable hashing (SHA-256 vs Math.random) for any IDs

### Template Consistency
- [ ] Standardize formatting with prettier/eslint in regen output
- [ ] Consistent import ordering (alphabetical)
- [ ] Consistent quote style (single or double)
- [ ] Consistent trailing newlines

### IU → Code Mapping
- [ ] Deterministic file naming from IU IDs
- [ ] Stable export ordering in _phoenix objects
- [ ] Consistent comment placement (above functions, not inline)

## Recovery

If purge fails or results are unsatisfactory:
```bash
# Restore from backup
cp -r .phoenix/purge-backup/{timestamp}/src-generated/* src/generated/
```
