# Phoenix Regeneration Skill

Generate implementation code from Phoenix Implementation Units (IUs) after the pipeline has been prepped.

## When to Use

Use this skill when:
- The user has run `pi prep` (steps 1-3: ingest, canonicalize, plan)
- IU graph exists at `.phoenix/graphs/ius.json`
- You need to generate actual code implementations from IUs, not stubs

## Prerequisites

Before using this skill, the pipeline must be prepped:
```bash
pi prep  # Creates .phoenix/graphs/ius.json
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

**For API IUs (Items, Categories, API):**
- Read the IU contract description and invariants
- Generate full Hono router with all CRUD operations
- Include proper validation (zod schemas)
- Include database migrations
- Export `_phoenix` metadata

**For UI IUs (Items Dashboard):**
- Generate full HTML/CSS/JS dashboard
- Include filtering, sorting, modals
- Use Catppuccin Mocha theme
- Connect to API endpoints

**For all files:**
- Add `// CONTRACT:` comment with IU description
- Add `// INVARIANT:` comments for each invariant
- Export `_phoenix = { iu_id, name, risk_tier, canon_ids }`

### Step 5: Boundary Validation

Check that generated files:
- Only import from allowed packages
- Don't use forbidden paths
- Respect IU isolation boundaries

### Step 6: Evidence (Tests)

Run tests to verify:
```bash
bun test
```

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

Display final pipeline status.

## Handling Drift (Emergency Procedure Only)

If you must bypass the full pipeline (emergency hotfix):

1. Document the drift reason in `.phoenix/.pi-agent/drift-justification.md`
2. Label the drift type in code comments: `// DRIFT: temporary_patch - [reason]`
3. Create a canonical node representing the change for traceability
4. Plan to proper-spec the change within 48 hours

**This breaks provenance. Use only for production emergencies.**

## Helper Functions

This skill provides helper code in `phoenix-regen.ts`:

```typescript
// Use these utilities when generating code
import { computeHash, ensureDir, writeGeneratedFile } from './phoenix-regen.ts';
```

## File Structure

```
.phoenix/graphs/ius.json          # IU graph (input)
src/generated/app/*.ts            # Generated code (output)
src/generated/app/__tests__/*.ts  # Tests
```

## Implementation Patterns

### Items API
- Routes: GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
- Query params: search, categoryid, lowstock, sort, order
- Database: items table with category_id foreign key
- Validation: zod schemas for create/update

### Categories API
- Routes: GET /, GET /:id, POST /, PATCH /:id, DELETE /:id
- Database: categories table

### Items Dashboard UI
- Full HTML page with Catppuccin Mocha styling
- Search input, category filter, low stock checkbox
- Sort dropdowns (name/quantity, asc/desc)
- Table with item rows, low stock highlighting
- Add/Edit modal with form
- Category management button
- JavaScript fetch API integration

## Traceability

Every generated file must export:
```typescript
export const _phoenix = {
  iu_id: '...',
  name: 'IU Name',
  risk_tier: 'high',
  canon_ids: ['abc123...', 'def456...']  // from IU source_canon_ids
} as const;
```
