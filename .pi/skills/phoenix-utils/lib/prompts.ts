// LLM Prompt Templates for Phoenix Skills
// Use these prompts when calling LLMs in Phoenix skills

// ============ CANONICALIZATION PROMPTS ============

/**
 * Extract canonical requirements from clauses
 * Use with: phoenix-canonicalize skill
 */
export const CANONICALIZE_PROMPT = `You are a requirements engineer. Extract canonical requirements from the provided specification clauses.

For each clause, extract:
1. **Normalized statement** - Active voice, clear subject/action
2. **Type** - REQUIREMENT (shall/must), CONSTRAINT (limitation), DEFINITION (is/are), INVARIANT (always true)
3. **Confidence** - 0.0 to 1.0 based on clarity
4. **Links** - Relationships to other requirements (refines, depends, conflicts)
5. **Tags** - Key nouns/verbs for search

Input format:
{
  "clauses": [
    {
      "id": "sha256-hash",
      "type": "REQUIREMENT",
      "text": "system shall display board as horizontal columns",
      "section": "UI"
    }
  ]
}

Output format:
{
  "nodes": [
    {
      "canon_id": "sha256-of-statement",
      "type": "REQUIREMENT",
      "statement": "The system shall display the board as horizontal columns.",
      "confidence": 0.95,
      "source_clause_ids": ["sha256-hash"],
      "linked_canon_ids": ["other-node-id"],
      "link_types": {"other-node-id": "refines"},
      "tags": ["board", "display", "horizontal", "columns"]
    }
  ]
}

Rules:
- Normalize voice: "board has columns" → "The system shall provide a board with columns"
- Extract implicit requirements from context
- Link related requirements (same section = likely related)
- Confidence < 0.7 for ambiguous statements`;

// ============ IU PLANNING PROMPTS ============

/**
 * Plan Implementation Units from canonical nodes
 * Use with: phoenix-plan skill
 */
export const PLAN_IU_PROMPT = `You are a software architect. Group canonical requirements into Implementation Units (IUs).

An IU is a cohesive unit of implementation with:
- Single responsibility (e.g., "Board", "API", "Cards")
- Clear boundaries (what it does/doesn't do)
- Risk tier based on complexity (low/medium/high/critical)
- Contract: description, inputs, outputs, invariants

Input:
{
  "canonical_nodes": [
    {
      "canon_id": "...",
      "type": "REQUIREMENT",
      "statement": "...",
      "tags": ["board", "columns"]
    }
  ]
}

Output:
{
  "ius": [
    {
      "iu_id": "sha256-of-name+canon-ids",
      "name": "Board",
      "kind": "module",
      "risk_tier": "medium",
      "contract": {
        "description": "Manages board display and column layout",
        "inputs": [],
        "outputs": ["rendered board HTML"],
        "invariants": ["Board fills viewport width"]
      },
      "source_canon_ids": ["canon-id-1", "canon-id-2"],
      "output_files": ["src/generated/app/board.ui.ts"]
    }
  ]
}

Grouping rules:
1. Group by noun ("Board", "Card", "API", "Database")
2. Cohesive requirements go together
3. UI components separate from business logic
4. API separate from implementation
5. Tests are separate IUs that depend on implementation IUs`;

// ============ CODE GENERATION PROMPTS ============

/**
 * Generate TypeScript implementation from IU contract
 * Use with: phoenix-regen skill
 */
export const GENERATE_CODE_PROMPT = `You are a precise code generator. Implement this IU contract in TypeScript.

IU Contract:
- Name: {IU_NAME}
- Kind: {IU_KIND} (api/web-ui/client/test)
- Risk: {RISK_TIER}
- Description: {DESCRIPTION}
- Invariants: {INVARIANTS}
- Source Requirements: {CANON_STATEMENTS}

Requirements:
1. Every line of code must trace to an invariant or requirement
2. Include // CONTRACT: and // INVARIANT: comments
3. Export _phoenix metadata with iu_id and canon_ids
4. No features not mentioned in the contract
5. Full implementation, not stubs

Output format:
```typescript
// CONTRACT: {DESCRIPTION}
// INVARIANT: {Each invariant as comment}

[Implementation code]

export const _phoenix = {
  iu_id: '{IU_ID}',
  name: '{IU_NAME}',
  risk_tier: '{RISK_TIER}',
  canon_ids: ['canon-id-1', 'canon-id-2']
} as const;
```

For APIs: Include database integration, validation, error handling
For UIs: Include HTML/CSS generation, event handlers
For Tests: Verify actual functionality, not just existence`;

/**
 * Generate test file for IU
 * Use with: phoenix-regen skill (test generation)
 */
export const GENERATE_TEST_PROMPT = `Generate tests for this IU implementation.

IU: {IU_NAME}
Implementation file content:
{IMPLEMENTATION_CONTENT}

Contract invariants:
{INVARIANTS}

Test requirements:
1. Test actual functionality (DB operations, UI rendering)
2. Use bun:test framework
3. Include positive and negative cases
4. Test every invariant
5. Tests should fail if the feature doesn't work

Output:
```typescript
import { expect, test } from 'bun:test';
// ... imports from implementation

// Test cases...

export const _phoenix = {
  iu_id: '{IU_ID}',
  name: '{IU_NAME}',
  risk_tier: '{RISK_TIER}',
  canon_ids: [...]
} as const;
````;

// ============ DRIFT DETECTION PROMPTS ============

/**
 * Analyze drift between spec and implementation
 * Use with: phoenix-drift skill
 */
export const ANALYZE_DRIFT_PROMPT = `Analyze the drift between specification and implementation.

Current spec requirements:
{SPEC_REQUIREMENTS}

Current implementation:
{IMPLEMENTATION_CONTENT}

Compare and identify:
1. Requirements implemented correctly
2. Requirements missing from implementation
3. Implementation features not in spec (unauthorized additions)
4. Tests that verify requirements

Output format:
{
  "status": "clean|drifted|orphaned",
  "findings": [
    {
      "type": "implemented|missing|unauthorized",
      "requirement": "...",
      "location": "file:line",
      "severity": "error|warning|info"
    }
  ],
  "recommendations": ["Regenerate IU", "Update spec", "Manual fix"]
}`;

// ============ AUDIT PROMPTS ============

/**
 * Audit IU readiness
 * Use with: phoenix-audit skill
 */
export const AUDIT_IU_PROMPT = `Audit this IU for implementation readiness.

IU:
{IU_JSON}

Check for:
1. Clear contract (all fields filled)
2. Boundaries defined (no scope creep)
3. Testable invariants
4. Appropriate risk tier
5. Evidence policy requirements
6. Dependencies on existing IUs

Output:
{
  "ready": true|false,
  "score": 0-100,
  "gaps": ["Missing output_files", "Ambiguous invariant", ...],
  "recommendations": ["Add more specific invariants", "Lower risk tier", ...]
}`;

// ============ PROMPT HELPERS ============

/**
 * Fill template variables
 */
export function fillPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
