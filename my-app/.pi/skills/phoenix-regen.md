# Phoenix Regeneration Skill

Generate implementation code from Phoenix Implementation Units (IUs) after the pipeline has been prepped.

## When to Use

Use this skill when:
- The user has run `just prep` (steps 1-3: ingest, canonicalize, plan)
- IU graph exists at `.phoenix/graphs/ius.json`
- You need to generate actual code implementations from IUs, not stubs

## Prerequisites

Before using this skill, the pipeline must be prepped:
```bash
just prep  # Creates .phoenix/graphs/ius.json
```

## How to Run

**DO NOT run this skill via justfile.** 

Run directly from the pi TUI:
```
pi "files are prepped, regenerate the code"
```

The skill will:
1. Check `.phoenix/graphs/ius.json` exists
2. Read each IU and its contract
3. Generate full implementations (not stubs)
4. Run tests
5. Show status

## Core Philosophy: Mechanical Generation

**Phoenix is not creative coding.** 

Code generation is a **mechanical transformation** from spec → canonical → IU → code. You are a transformer, not a designer.

**The Rule:**
> Every generated line of code must trace to a specific requirement in the IU contract, which traces to canonical nodes, which trace to spec lines.

**What this means:**
- If the IU contract says "Real-time filtering" → generate `oninput="handler()"`
- If the IU contract does NOT mention a button → DO NOT generate that button
- If the IU contract does NOT mention a feature → DO NOT generate that feature
- If you're unsure how to implement a requirement → check the spec, not your intuition
- If the spec is ambiguous → flag it, don't fill the gap creatively

**Anti-patterns (NEVER do these):**
- ❌ "Users probably want..." 
- ❌ "A good UI should have..."
- ❌ "Let me add buttons to make it usable"
- ❌ "Standard practice is..."

**Correct patterns:**
- ✅ "Spec line 34 says real-time → inputs need oninput handlers"
- ✅ "No canonical node mentions X → not generated"
- ✅ "IU invariant says 'without reload' → no submit buttons"

**When stuck:**
If the spec says "filterable" but doesn't specify the UX mechanism:
1. Check canonical nodes for more detail
2. If still unclear, choose the *simplest* implementation that satisfies the requirement
3. Never add elements not mentioned in the chain of provenance

## Steps (Run via pi TUI, NOT justfile)

### Step 4: Regenerate (Generate Code from IUs)

**Incremental Generation Rule:** Only generate code for IUs that don't have valid code yet.

Before generating, check each output file:
1. Does the file exist?
2. Does it have `export const _phoenix` with matching `iu_id`?
3. Does it have the required `CONTRACT:` and `INVARIANT:` comments?

**If all checks pass → SKIP generation for this file.**
**If any check fails → Generate the file fresh.**

This prevents overwriting manual edits and preserves existing implementations.

**Generation Rules:**
- Read the IU contract description and invariants
- Generate implementations that satisfy ALL invariants
- Include proper validation as specified in contract
- For APIs: include database integration as required
- For UIs: include all required elements, no extras
- Export `_phoenix` metadata for traceability

**After generating each file, validate syntax:**
```bash
# Check TypeScript syntax compiles
bun build src/generated/app/<file>.ts --outfile=/dev/null
```

If syntax error found:
1. Read the error message and line number
2. Fix the specific syntax issue
3. Re-validate until clean
4. Only then mark file as "generated"

**For all files:**
- Add `// CONTRACT:` comment with IU description
- Add `// INVARIANT:` comments for each invariant
- Export `_phoenix = { iu_id, name, risk_tier, canon_ids }`

### Step 5: Boundary Validation

Check that generated files:
- Only import from allowed packages (per IU boundary_policy)
- Don't use forbidden paths
- Respect IU isolation boundaries

### Step 6: Evidence (Tests)

Generate tests that verify the spec requirements actually work. Tests must exercise real functionality, not just check that files load.

**For APIs:** Verify data is created, read, updated, deleted in the database
**For UIs:** Verify required elements exist and user flows work

**Rule:** If the test passes but the feature doesn't work, the test is wrong.

### Step 7: Drift Detection

**CRITICAL: Never "correct" drift by updating hashes manually.**

Drift detection compares generated files against the manifest. If drift is detected:

1. **Identify the affected IU** - Use the file path to find which IU owns it via manifest
2. **Map back to spec** - Check `_phoenix.canon_ids` in the drifted file to find canonical nodes
3. **Determine the fix type:**
   - **Spec change needed:** If the drift represents a legitimate requirement change, update `spec/app.md` first, then run `just prep` to regenerate the IU
   - **Accidental drift:** If the drift was unintended, discard changes and regenerate from IU contract
   - **Emergency patch:** Label as `temporary_patch` with justification, plan proper fix

**DO NOT:**
- ❌ Run scripts to "update manifest hashes" without spec changes
- ❌ Hand-edit generated files and just update the hash
- ❌ Clear drift without provenance trail

**Provenance must always flow:** `spec → canonical → IU → generated code`

### Step 8: Status Dashboard

Display final pipeline status:
- Files in sync / drifted / orphaned
- Test results
- Boundary violations

## Handling Drift (Emergency Procedure Only)

If you must bypass the full pipeline (emergency hotfix):

1. Document the drift reason in `.phoenix/.pi-agent/drift-justification.md`
2. Label the drift type in code comments: `// DRIFT: temporary_patch - [reason]`
3. Create a canonical node representing the change for traceability
4. Plan to proper-spec the change within 48 hours

**This breaks provenance. Use only for production emergencies.**

## Traceability Requirements

Every generated file must export:
```typescript
export const _phoenix = {
  iu_id: '...',
  name: 'IU Name',
  risk_tier: 'high' | 'medium' | 'low',
  canon_ids: ['abc123...', 'def456...']  // from IU source_canon_ids
} as const;
```

## File Structure

```
.phoenix/graphs/ius.json          # IU graph (input)
src/generated/app/*.ts            # Generated code (output)
src/generated/app/__tests__/*.ts  # Tests
```
