---
name: phoenix-regen
description: Generate implementation code from Phoenix Implementation Units. Transforms IU contracts into TypeScript implementations. Use after planning, when IUs exist in .phoenix/graphs/ius.json.
---

# Phoenix Regeneration

Generate implementation code from Implementation Units (IUs).

## When to Use

- After `/skill:phoenix-plan` creates IUs
- When specifications change and code needs updating
- To regenerate drifted files
- For incremental updates (only changed IUs)

## Usage

```bash
/skill:phoenix-regen                    # Regenerate all IUs
/skill:phoenix-regen Board              # Regenerate specific IU
/skill:phoenix-regen --changed          # Only changed IUs (based on hashes)
/skill:phoenix-regen --force            # Regenerate even if hashes match
```

## Core Philosophy: Mechanical Generation

**Phoenix is not creative coding.**

Every generated line must trace to a specific requirement:
```
spec line 34 → canonical node → IU invariant → code implementation
```

**Anti-patterns (NEVER):**
- ❌ "Users probably want..."
- ❌ "A good UI should have..."
- ❌ "Let me add buttons to make it usable"

**Correct patterns:**
- ✅ "Spec says 'modal' → generate modal code"
- ✅ "No canonical node mentions X → don't generate X"
- ✅ "IU invariant says 'no reload' → no submit buttons"

## What It Does

1. **Load IUs** from `.phoenix/graphs/ius.json`
2. **Check incremental status** (skip if file exists with matching hash)
3. **Generate code** for each IU:
   - Read IU contract (description, invariants)
   - Read linked canonical nodes (requirements)
   - Generate TypeScript implementation
4. **Validate syntax** (TypeScript compilation)
5. **Generate tests** for each IU
6. **Write files** to `src/generated/app/`
7. **Update manifest** (file hashes, timestamps)
8. **Run tests** to verify

## Implementation Steps

### Step 1: Load IUs

```typescript
const { root, phoenixDir } = requireProjectRoot();
const iuGraph = readGraph<IUGraph>(phoenixDir, 'ius');

if (!iuGraph) {
  throw new Error('No IU graph found. Run /skill:phoenix-plan first.');
}

const ius = iuGraph.ius;
```

### Step 2: Check Incremental Status

For each IU, check if regeneration needed:

```typescript
function needsRegen(iu: ImplementationUnit, phoenixDir: string, root: string): boolean {
  // Check each output file
  for (const file of iu.output_files) {
    const fullPath = join(root, file);
    
    // File doesn't exist → needs regen
    if (!existsSync(fullPath)) return true;
    
    // Read file
    const content = readFileSync(fullPath, 'utf8');
    
    // Check for _phoenix export
    const phoenixMatch = content.match(/export const _phoenix = \{[\s\S]*?\}/);
    if (!phoenixMatch) return true;  // No metadata → needs regen
    
    // Check iu_id matches
    const idMatch = phoenixMatch[0].match(/iu_id:\s*['"]([^'"]+)['"]/);
    if (!idMatch || idMatch[1] !== iu.iu_id) return true;
    
    // Check CONTRACT comment exists
    if (!content.includes('// CONTRACT:')) return true;
    
    // Check INVARIANT comments exist
    for (const inv of iu.contract.invariants) {
      if (!content.includes(`// INVARIANT: ${inv.slice(0, 30)}`)) {
        return true;
      }
    }
  }
  
  return false;  // All checks passed → skip
}
```

### Step 3: Generate Implementation

For each IU that needs regeneration:

```typescript
async function generateIU(iu: ImplementationUnit, context: RegenContext): Promise<RegenResult> {
  const files = new Map<string, string>();
  const errors: string[] = [];
  
  // Get canonical requirements
  const canonNodes = context.canonNodes.filter(n => 
    iu.source_canon_ids.includes(n.canon_id)
  );
  
  // Get statements for context
  const canonStatements = canonNodes.map(n => n.statement);
  
  // Generate primary implementation file
  const primaryFile = iu.outputs.find(o => o.primary)?.file || iu.output_files[0];
  
  try {
    const implementation = await generateImplementation({
      iu,
      canonStatements,
      kind: iu.kind,
      allIUs: context.allIUs
    });
    
    files.set(primaryFile, implementation);
    
    // Generate secondary files (client, styles, etc.)
    for (const output of iu.outputs.filter(o => !o.primary)) {
      if (output.type === 'client') {
        const clientCode = await generateClient(iu, canonStatements);
        files.set(output.file, clientCode);
      }
      else if (output.type === 'test') {
        const testCode = await generateTest(iu, implementation);
        files.set(output.file, testCode);
      }
    }
  } catch (err) {
    errors.push(String(err));
  }
  
  return {
    iu_id: iu.iu_id,
    files,
    success: errors.length === 0,
    errors,
    manifest: {
      iu_id: iu.iu_id,
      files: Array.from(files.entries()).map(([path, content]) => ({
        path,
        hash: computeHash(content),
        size: content.length
      })),
      generated_at: new Date().toISOString(),
      model_id: 'pi-agent',
      promptpack_hash: 'phoenix-skill',
      toolchain_version: 'phoenix-regen/1.0'
    }
  };
}
```

### Step 4: Generate by IU Kind

Different generation strategies per kind:

**API IU:**
```typescript
function generateAPI(iu: ImplementationUnit, canonStatements: string[]): string {
  return `// CONTRACT: ${iu.contract.description}
${iu.contract.invariants.map(inv => `// INVARIANT: ${inv}`).join('\n')}

import { Database } from 'bun:sqlite';

// Types from requirements
export type ${iu.name} = {
  // Generate from canon statements mentioning data structures
};

${canonStatements
  .filter(s => s.includes('shall') || s.includes('must'))
  .map((stmt, i) => {
    // Parse "system shall X" → export function X()
    const action = extractAction(stmt);
    return `
// From: ${stmt}
export function ${action.name}(db: Database, ${action.params}): ${action.returnType} {
  // Implementation
  ${generateImplementationBody(action, iu)}
}`;
  }).join('\n\n')}

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.map(id => `'${id}'`).join(', ')}]
} as const;
`;
}
```

**Web-UI IU:**
```typescript
function generateWebUI(iu: ImplementationUnit, canonStatements: string[]): string {
  return `// CONTRACT: ${iu.contract.description}
${iu.contract.invariants.map(inv => `// INVARIANT: ${inv}`).join('\n')}

// Generate render function from display requirements
export function render${iu.name}(props: ${iu.name}Props): string {
  return \`
    <div class="${iu.name.toLowerCase()}">
      ${generateHTMLFromStatements(canonStatements)}
    </div>
  \`;
}

// Generate CSS from constraint statements
export const ${iu.name.toLowerCase()}Styles = \`
  ${generateCSSFromConstraints(canonStatements)}
\`;

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.map(id => `'${id}'`).join(', ')}]
} as const;
`;
}
```

**Client IU:**
```typescript
function generateClient(iu: ImplementationUnit, canonStatements: string[]): string {
  return `// CONTRACT: ${iu.contract.description}
// Client-side API client for ${iu.name}

const API_BASE = '/api';

${canonStatements
  .filter(s => s.includes('endpoint') || s.includes('post') || s.includes('get'))
  .map(stmt => {
    const endpoint = extractEndpoint(stmt);
    return `
export async function ${endpoint.name}(${endpoint.params}): Promise<${endpoint.returnType}> {
  const res = await fetch(\`\${API_BASE}${endpoint.path}\`, {
    method: '${endpoint.method}',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ${endpoint.bodyFields} })
  });
  if (!res.ok) throw new Error('Failed: ' + res.statusText);
  return res.json();
}`;
  }).join('\n\n')}

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.map(id => `'${id}'`).join(', ')}]
} as const;
`;
}
```

### Step 5: Generate Tests

```typescript
function generateTest(iu: ImplementationUnit, implementation: string): string {
  return `// Test for ${iu.name}
import { expect, test } from 'bun:test';
// TODO: Import from implementation

${iu.contract.invariants.map(inv => `
test('${inv.slice(0, 50)}...', () => {
  // Test implementation
  ${generateTestAssertion(inv)}
});
`).join('\n')}

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.map(id => `'${id}'`).join(', ')}]
} as const;
`;
}
```

### Step 6: Validate Syntax

After generating each file:

```typescript
async function validateSyntax(filePath: string, content: string): Promise<boolean> {
  const tempFile = `/tmp/phoenix-val-${Date.now()}.ts`;
  writeFileSync(tempFile, content, 'utf8');
  
  try {
    // Use bun to check TypeScript
    const result = await $`bun build ${tempFile} --outfile=/dev/null`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  } finally {
    try { unlinkSync(tempFile); } catch {}
  }
}
```

If syntax errors found:
1. Parse error message for line/column
2. Fix specific error in content
3. Re-validate
4. Only write when clean

### Step 7: Write Files

```typescript
for (const [filePath, content] of result.files) {
  const fullPath = join(root, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}
```

### Step 8: Update Manifest

```typescript
for (const result of results) {
  for (const file of result.manifest.files) {
    recordManifestEntry(phoenixDir, file.path, result.iu_id, root);
  }
}
```

### Step 9: Run Tests

```typescript
const testResult = await $`bun test`.cwd(root);
if (testResult.exitCode !== 0) {
  console.error('Tests failed!');
  // Show which tests failed
}
```

### Step 10: Update State

```typescript
const state = loadState(phoenixDir);
state.last_regen = new Date().toISOString();
saveState(phoenixDir, state);
```

## Output

```
🔧 Regeneration

  Board (medium) → 2 files
    src/generated/app/board.ui.ts ✔
    src/generated/app/__tests__/board.test.ts ✔

  API (medium) → 2 files
    src/generated/app/api.ts ✔
    src/generated/app/__tests__/api.test.ts ✔

  ... (more IUs)

  37 tests passed
  0 tests failed

  Manifest updated: .phoenix/manifests/generated_manifest.json
```

## Error Handling

1. **Syntax errors**: Show line number, fix, re-validate
2. **Missing dependencies**: Check imports from other IUs
3. **Test failures**: Show failed tests, don't update manifest
4. **Boundary violations**: Flag forbidden imports

## Prerequisites

- Phoenix project initialized
- IU graph exists (`/skill:phoenix-plan`)

## Pipeline Position

**Phase C (Regen)** → Next: `/skill:phoenix-status` or `/skill:phoenix-drift`

## Dependencies

- `phoenix-utils/lib/helpers.ts`
- `phoenix-utils/lib/types.ts`
- `phoenix-utils/lib/prompts.ts` (for LLM enhancement if needed)

## See Also

- /skill:phoenix-plan - Previous phase
- /skill:phoenix-status - Check results
- /skill:phoenix-drift - Detect drift
