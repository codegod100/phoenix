---
name: phoenix-canonicalize
description: Extract canonical requirements from parsed clauses. Normalizes statements, links related requirements, assigns confidence scores. Use after ingest, before planning.
---

# Phoenix Canonicalize

Extract canonical requirements from parsed specification clauses.

## When to Use

- After `/skill:phoenix-ingest` parses specs
- Before `/skill:phoenix-plan` creates IUs
- When requirements need decontextualization
- To identify requirement relationships

## Usage

```bash
/skill:phoenix-canonicalize              # Extract from all clauses
/skill:phoenix-canonicalize --rule      # Rule-based only (no LLM)
/skill:phoenix-canonicalize --llm       # LLM-enhanced extraction
```

## What It Does

1. **Load clauses** from `.phoenix/graphs/spec.json`
2. **Extract canonical nodes**:
   - Normalize voice (active, system as subject)
   - Remove context dependencies
   - Identify type (REQUIREMENT, CONSTRAINT, etc.)
   - Compute confidence scores
3. **Link related nodes** (refines, depends, conflicts)
4. **Assign content-addressed IDs**
5. **Store** in `.phoenix/graphs/canonical.json`
6. **Compute warm hashes** for context tracking

## Implementation Steps

### Step 1: Load Input

```typescript
const specGraph = readGraph<SpecGraph>(phoenixDir, 'spec');
if (!specGraph) {
  throw new Error('No spec graph found. Run /skill:phoenix-ingest first.');
}

// Flatten all clauses
const allClauses: Clause[] = [];
for (const [docId, doc] of Object.entries(specGraph.documents)) {
  allClauses.push(...doc.clauses);
}
```

### Step 2: Rule-Based Extraction

First pass: Extract obvious canonical nodes without LLM:

```typescript
function extractRuleBased(clauses: Clause[]): CanonicalNode[] {
  const nodes: CanonicalNode[] = [];
  
  for (const clause of clauses) {
    // Skip if not a requirement-bearing type
    if (clause.type === 'CONTEXT') continue;
    
    // Normalize statement
    const statement = normalizeStatement(clause.text, clause.type);
    
    // Compute content ID
    const canonId = computeHash(statement + clause.type);
    
    // Determine confidence based on clarity
    const confidence = assessConfidence(clause.text, clause.type);
    
    // Extract tags (key nouns and verbs)
    const tags = extractTags(statement);
    
    nodes.push({
      canon_id: canonId,
      type: mapClauseType(clause.type),
      statement,
      confidence,
      source_clause_ids: [clause.id],
      linked_canon_ids: [],
      link_types: {},
      tags,
      extraction_method: 'rule',
      canon_anchor: computeHash(statement.slice(0, 50))
    });
  }
  
  return nodes;
}

function normalizeStatement(text: string, type: string): string {
  let normalized = text.toLowerCase();
  
  // Add implicit subject for passive voice
  if (!normalized.includes('system shall') && 
      !normalized.includes('user can') &&
      type === 'REQUIREMENT') {
    normalized = `The system shall ${normalized}`;
  }
  
  // Standardize modal verbs
  normalized = normalized
    .replace(/\bmust\b/g, 'shall')
    .replace(/\bshould\b/g, 'should')
    .replace(/\bneeds? to\b/g, 'shall');
  
  // Remove filler words
  normalized = normalized
    .replace(/\b(just|simply|easily|quickly)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

function assessConfidence(text: string, type: string): number {
  let confidence = 0.8;  // Base
  
  // Clear markers increase confidence
  if (text.match(/^(requirement|constraint|definition):/i)) confidence += 0.15;
  
  // Measurable quantities increase confidence
  if (text.match(/\d+/)) confidence += 0.05;
  
  // Vague words decrease confidence
  if (text.match(/\b(some|many|few|appropriate|reasonable)\b/i)) confidence -= 0.2;
  
  // Unclear scope decreases confidence
  if (text.length > 200) confidence -= 0.1;
  
  return Math.min(1.0, Math.max(0.1, confidence));
}

function extractTags(statement: string): string[] {
  // Extract nouns and key verbs
  const words = statement.toLowerCase().split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'shall', 'must', 'to', 'and', 'or'];
  
  return words
    .filter(w => w.length > 3)
    .filter(w => !stopWords.includes(w))
    .filter(w => w.match(/^[a-z]+$/))
    .slice(0, 8);  // Max 8 tags
}
```

### Step 3: LLM Enhancement (Optional)

If LLM available, enhance extraction:

```typescript
const prompt = fillPrompt(CANONICALIZE_PROMPT, {
  CLAUSES: JSON.stringify(allClauses.slice(0, 50))  // Batch in groups
});

// Call LLM via appropriate tool
const llmResponse = await callLLM(prompt);
const llmNodes = parseLLMJSON<CanonicalNode[]>(llmResponse);

// Merge with rule-based results
const mergedNodes = mergeNodes(ruleNodes, llmNodes);
```

### Step 4: Link Related Nodes

```typescript
function linkNodes(nodes: CanonicalNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      
      // Same section = likely related
      if (shareSourceSection(a, b)) {
        a.linked_canon_ids.push(b.canon_id);
        a.link_types[b.canon_id] = 'refines';
      }
      
      // Shared tags = potentially related
      const sharedTags = a.tags.filter(t => b.tags.includes(t));
      if (sharedTags.length >= 2 && !a.linked_canon_ids.includes(b.canon_id)) {
        a.linked_canon_ids.push(b.canon_id);
        a.link_types[b.canon_id] = 'depends';
      }
    }
  }
}
```

### Step 5: Compute Warm Hashes

```typescript
function computeWarmHashes(clauses: Clause[], nodes: CanonicalNode[]): Map<string, string> {
  const hashes = new Map<string, string>();
  
  for (const clause of clauses) {
    // Find matching canonical nodes
    const relatedNodes = nodes.filter(n => 
      n.source_clause_ids.includes(clause.id)
    );
    
    // Warm hash = hash of clause + related canonical IDs
    const warmContent = clause.id + relatedNodes.map(n => n.canon_id).join('');
    hashes.set(clause.id, computeHash(warmContent));
  }
  
  return hashes;
}

// Save warm hashes
const warmHashes = computeWarmHashes(allClauses, nodes);
writeGraph(phoenixDir, 'warm-hashes', Object.fromEntries(warmHashes));
```

### Step 6: Save Canonical Graph

```typescript
const canonicalGraph: CanonicalGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  nodes: Object.fromEntries(nodes.map(n => [n.canon_id, n])),
  provenance: {
    total_clauses: allClauses.length,
    extraction_method: 'rule',  // or 'llm' or 'hybrid'
    llm_model: llmUsed ? 'model-name' : undefined
  }
};

writeGraph(phoenixDir, 'canonical', canonicalGraph);
```

### Step 7: Update State

```typescript
const state = loadState(phoenixDir);
state.last_canonicalize = new Date().toISOString();
saveState(phoenixDir, state);
```

### Step 8: Report

```
🔍 Canonicalization

  Input: 24 clauses
  Output: 18 canonical nodes
    - 12 REQUIREMENT
    - 4 CONSTRAINT  
    - 2 DEFINITION

  Confidence distribution:
    High (>0.8): 15 nodes
    Medium (0.5-0.8): 3 nodes
    Low (<0.5): 0 nodes

  Links: 24 relationships identified
  
  Next: /skill:phoenix-plan
```

## Output Schema

`.phoenix/graphs/canonical.json`:
```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-06T10:35:00Z",
  "nodes": {
    "sha256-abc...": {
      "canon_id": "sha256-abc...",
      "type": "REQUIREMENT",
      "statement": "The system shall display the board as horizontal columns.",
      "confidence": 0.95,
      "source_clause_ids": ["clause-id-1"],
      "linked_canon_ids": ["sha256-def..."],
      "link_types": { "sha256-def...": "refines" },
      "tags": ["board", "display", "horizontal", "columns"],
      "extraction_method": "rule",
      "canon_anchor": "sha256-of-first-50-chars"
    }
  },
  "provenance": {
    "total_clauses": 24,
    "extraction_method": "rule",
    "llm_model": null
  }
}
```

## Edge Cases

1. **No clear requirements**: All clauses are CONTEXT → warn user
2. **Very low confidence**: Flag for manual review
3. **Conflicting requirements**: Detect and link as 'conflicts'
4. **Duplicate statements**: Same canon_id = deduplicate

## Prerequisites

- Phoenix project initialized
- Spec graph exists (`/skill:phoenix-ingest`)

## Pipeline Position

**Phase B** → Next: `/skill:phoenix-plan`

## Dependencies

- `phoenix-utils/lib/helpers.ts` - I/O, hashing
- `phoenix-utils/lib/types.ts` - CanonicalNode interface
- `phoenix-utils/lib/prompts.ts` - CANONICALIZE_PROMPT (if using LLM)

## See Also

- /skill:phoenix-ingest - Previous phase
- /skill:phoenix-plan - Next phase
