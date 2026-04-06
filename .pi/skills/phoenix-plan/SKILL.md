---
name: phoenix-plan
description: Plan Implementation Units from canonical requirements. Groups related requirements, assigns risk tiers, defines boundaries. Use after canonicalization, before code generation.
---

# Phoenix Plan

Plan Implementation Units (IUs) from canonical requirements.

## When to Use

- After `/skill:phoenix-canonicalize` extracts requirements
- Before `/skill:phoenix-regen` generates code
- When reorganizing architecture
- To review implementation scope

## Usage

```bash
/skill:phoenix-plan              # Plan all IUs
/skill:phoenix-plan --audit      # Show but don't save
/skill:phoenix-plan --merge      # Merge with existing IUs
```

## What It Does

1. **Load canonical nodes** from `.phoenix/graphs/canonical.json`
2. **Group into IUs** by noun/domain:
   - "Board" → all board-related requirements
   - "Cards" → card management requirements
   - "API" → endpoint requirements
   - "Database" → storage requirements
   - "UI" → display/interaction requirements
   - "Design System" → theme/component requirements
3. **Assign risk tiers** based on complexity
4. **Define contracts** (inputs, outputs, invariants)
5. **Set boundaries** (allowed/forbidden dependencies)
6. **Plan output files** (where code will be generated)
7. **Store** in `.phoenix/graphs/ius.json`

## Implementation Steps

### Step 1: Load Input

```typescript
const canonicalGraph = readGraph<CanonicalGraph>(phoenixDir, 'canonical');
if (!canonicalGraph) {
  throw new Error('No canonical graph found. Run /skill:phoenix-canonicalize first.');
}

const nodes = Object.values(canonicalGraph.nodes);
```

### Step 2: Group by Domain

Use both rules and optional LLM to group nodes:

```typescript
function groupIntoIUs(nodes: CanonicalNode[]): Map<string, CanonicalNode[]> {
  const groups = new Map<string, CanonicalNode[]>();
  
  // Rule 1: Extract primary noun from statement
  for (const node of nodes) {
    const noun = extractPrimaryNoun(node.statement, node.tags);
    if (!groups.has(noun)) groups.set(noun, []);
    groups.get(noun)!.push(node);
  }
  
  // Rule 2: Merge small groups (< 2 nodes) into related larger groups
  const smallGroups = Array.from(groups.entries()).filter(([_, ns]) => ns.length < 2);
  for (const [smallName, smallNodes] of smallGroups) {
    // Find best merge target by tag overlap
    let bestTarget: string | null = null;
    let bestOverlap = 0;
    
    for (const [bigName, bigNodes] of groups) {
      if (bigName === smallName) continue;
      const overlap = countSharedTags(smallNodes, bigNodes);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestTarget = bigName;
      }
    }
    
    if (bestTarget && bestOverlap > 0) {
      groups.get(bestTarget)!.push(...smallNodes);
      groups.delete(smallName);
    }
  }
  
  return groups;
}

function extractPrimaryNoun(statement: string, tags: string[]): string {
  // Priority nouns for software systems
  const priorityNouns = [
    'api', 'database', 'ui', 'auth', 'user', 'board', 
    'card', 'column', 'design-system', 'modal', 'button'
  ];
  
  for (const noun of priorityNouns) {
    if (tags.includes(noun) || statement.includes(noun)) {
      return noun.charAt(0).toUpperCase() + noun.slice(1);
    }
  }
  
  // Fallback: most frequent tag
  return tags[0]?.charAt(0).toUpperCase() + tags[0]?.slice(1) || 'Module';
}
```

### Step 3: Create IU for Each Group

```typescript
function createIU(
  name: string, 
  nodes: CanonicalNode[],
  allNodes: CanonicalNode[]
): ImplementationUnit {
  
  // Determine kind from nodes and name
  const kind = determineKind(name, nodes);
  
  // Assign risk tier
  const riskTier = assessRisk(nodes, kind);
  
  // Build contract
  const contract: IUContract = {
    description: generateDescription(name, nodes),
    inputs: extractInputs(nodes),
    outputs: extractOutputs(nodes),
    invariants: extractInvariants(nodes)
  };
  
  // Find dependencies on other IUs
  const dependencies = findDependencies(nodes, allNodes);
  
  // Determine output files
  const outputFiles = planOutputFiles(name, kind);
  
  // Set boundary policy
  const boundaryPolicy: BoundaryPolicy = {
    code: {
      allowed_ius: dependencies,
      allowed_packages: determineAllowedPackages(kind),
      forbidden_ius: [],
      forbidden_packages: determineForbiddenPackages(kind),
      forbidden_paths: ['src/generated/app/__tests__/*']  // Can't import tests
    },
    side_channels: {
      databases: kind === 'api' ? ['sqlite'] : [],
      queues: [],
      caches: [],
      config: [],
      external_apis: [],
      files: []
    }
  };
  
  // Evidence policy
  const evidencePolicy: EvidencePolicy = {
    required: determineEvidenceRequirements(riskTier, kind)
  };
  
  // Compute IU ID (content-addressed)
  const iuId = computeHash(
    name + 
    nodes.map(n => n.canon_id).sort().join('') +
    JSON.stringify(contract)
  );
  
  return {
    iu_id: iuId,
    name,
    kind,
    risk_tier: riskTier,
    contract,
    source_canon_ids: nodes.map(n => n.canon_id),
    dependencies,
    output_files: outputFiles,
    outputs: outputFiles.map(f => ({
      type: fileToOutputType(f),
      file: f,
      primary: !f.includes('__tests__')
    })),
    boundary_policy: boundaryPolicy,
    evidence_policy: evidencePolicy,
    enforcement: {
      dependency_violation: { severity: 'error' },
      side_channel_violation: { severity: 'warning' }
    }
  };
}

function determineKind(name: string, nodes: CanonicalNode[]): IUKind {
  const text = nodes.map(n => n.statement).join(' ').toLowerCase();
  
  if (name.toLowerCase().includes('api')) return 'api';
  if (name.toLowerCase().includes('database')) return 'module';
  if (name.toLowerCase().includes('test')) return 'test';
  if (text.includes('endpoint') || text.includes('route')) return 'api';
  if (text.includes('html') || text.includes('render') || text.includes('display')) return 'web-ui';
  if (text.includes('client') || text.includes('fetch')) return 'client';
  
  return 'module';
}

function assessRisk(nodes: CanonicalNode[], kind: IUKind): RiskTier {
  let score = 0;
  
  // Complexity metrics
  if (nodes.length > 10) score += 2;
  if (nodes.length > 5) score += 1;
  
  // Check for complex indicators
  const text = nodes.map(n => n.statement).join(' ');
  if (text.includes('real-time')) score += 2;
  if (text.includes('concurrent')) score += 2;
  if (text.includes('transaction')) score += 1;
  if (text.includes('security') || text.includes('auth')) score += 2;
  
  // Kind-based base risk
  if (kind === 'api') score += 1;
  if (kind === 'web-ui') score += 1;
  
  // Map score to tier
  if (score >= 5) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

function planOutputFiles(name: string, kind: IUKind): string[] {
  const baseName = name.toLowerCase().replace(/\s+/g, '-');
  
  switch (kind) {
    case 'api':
      return [`src/generated/app/${baseName}.ts`];
    case 'web-ui':
      return [
        `src/generated/app/${baseName}.ui.ts`,
        `src/generated/app/${baseName}.client.ts`,
        `src/generated/app/__tests__/${baseName}.test.ts`
      ];
    case 'client':
      return [`src/generated/app/${baseName}.client.ts`];
    case 'test':
      return [`src/generated/app/__tests__/${baseName}.test.ts`];
    default:
      return [
        `src/generated/app/${baseName}.ts`,
        `src/generated/app/__tests__/${baseName}.test.ts`
      ];
  }
}
```

### Step 4: Detect Dependencies

```typescript
function findDependencies(
  myNodes: CanonicalNode[], 
  allNodes: CanonicalNode[]
): string[] {
  const myIds = new Set(myNodes.map(n => n.canon_id));
  const deps = new Set<string>();
  
  for (const myNode of myNodes) {
    for (const linkedId of myNode.linked_canon_ids) {
      if (myIds.has(linkedId)) continue;  // Same IU
      
      // Find which IU owns the linked node
      // (This requires looking at all proposed IUs)
      deps.add(linkedId);  // Will resolve to IU ID later
    }
  }
  
  return Array.from(deps);
}
```

### Step 5: LLM Enhancement (Optional)

For better IU organization:

```typescript
const prompt = fillPrompt(PLAN_IU_PROMPT, {
  CANON_NODES: JSON.stringify(nodes.slice(0, 30))
});

const llmResponse = await callLLM(prompt);
const llmIUs = parseLLMJSON<ImplementationUnit[]>(llmResponse);

// Merge LLM suggestions with rule-based
const mergedIUs = mergeIUs(ruleIUs, llmIUs);
```

### Step 6: Save IU Graph

```typescript
// Resolve canon_id dependencies to iu_id dependencies
for (const iu of ius) {
  iu.dependencies = iu.dependencies.map(canonId => {
    const targetIU = ius.find(other => 
      other.source_canon_ids.includes(canonId)
    );
    return targetIU?.iu_id || '';
  }).filter(Boolean);
}

const iuGraph: IUGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  ius,
  coverage: {
    total_canon_nodes: nodes.length,
    covered_canon_nodes: ius.reduce((sum, iu) => sum + iu.source_canon_ids.length, 0),
    orphan_canon_ids: nodes
      .filter(n => !ius.some(iu => iu.source_canon_ids.includes(n.canon_id)))
      .map(n => n.canon_id)
  }
};

writeGraph(phoenixDir, 'ius', iuGraph);
```

### Step 7: Update State

```typescript
const state = loadState(phoenixDir);
state.last_plan = new Date().toISOString();
saveState(phoenixDir, state);
```

### Step 8: Report

```
📋 IU Planning

  6 Implementation Units planned:

  Board (medium) → board.ui.ts, board.test.ts
    6 canonical requirements
    Invariants: Board fills viewport, columns scroll horizontally

  API (medium) → api.ts, api.test.ts
    11 canonical requirements
    Invariants: 400 error for invalid column, auto-rebalance order

  Cards (high) → cards.ui.ts, cards.client.ts, cards.test.ts
    10 canonical requirements
    Invariants: Max 100 cards, created_at timestamp

  Database (medium) → database.ts, database.test.ts
    6 canonical requirements
    Invariants: FK cascade delete, unique (column_id, order_index)

  Design System (medium) → design-system.ui.ts, design-system.client.ts
    31 canonical requirements
    Invariants: Catppuccin colors only, modal blur backdrop

  UI (high) → ui.ui.ts, ui.client.ts, ui.test.ts
    19 canonical requirements
    Invariants: Real-time counts, no native alerts, ESC closes modals

  Coverage: 83/83 canonical nodes (100%)
  
  Next: /skill:phoenix-regen
```

## Output Schema

`.phoenix/graphs/ius.json`:
```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-06T10:40:00Z",
  "ius": [
    {
      "iu_id": "sha256-abc...",
      "name": "Board",
      "kind": "module",
      "risk_tier": "medium",
      "contract": {
        "description": "Main board display with columns and cards",
        "inputs": [],
        "outputs": ["rendered board HTML", "column count badges"],
        "invariants": [
          "Board fills viewport width",
          "Columns scroll horizontally if needed",
          "Column height fixed with internal scroll"
        ]
      },
      "source_canon_ids": ["canon-id-1", "canon-id-2"],
      "dependencies": ["other-iu-id"],
      "output_files": [
        "src/generated/app/board.ui.ts",
        "src/generated/app/__tests__/board.test.ts"
      ],
      "outputs": [
        { "type": "web-ui", "file": "src/generated/app/board.ui.ts", "primary": true },
        { "type": "test", "file": "src/generated/app/__tests__/board.test.ts", "primary": false }
      ],
      "boundary_policy": {
        "code": {
          "allowed_ius": [],
          "allowed_packages": [],
          "forbidden_ius": [],
          "forbidden_packages": [],
          "forbidden_paths": []
        },
        "side_channels": {
          "databases": [],
          "queues": [],
          "caches": [],
          "config": [],
          "external_apis": [],
          "files": []
        }
      },
      "evidence_policy": {
        "required": ["typecheck", "lint", "boundary_validation", "unit_tests"]
      },
      "enforcement": {
        "dependency_violation": { "severity": "error" },
        "side_channel_violation": { "severity": "warning" }
      }
    }
  ],
  "coverage": {
    "total_canon_nodes": 83,
    "covered_canon_nodes": 83,
    "orphan_canon_ids": []
  }
}
```

## Edge Cases

1. **Orphan canonical nodes**: Requirements not covered by any IU
2. **Circular dependencies**: IUs depending on each other
3. **Too many IUs**: > 20 IUs suggests over-granularity
4. **Giant IU**: > 20 requirements suggests under-granularity

## Prerequisites

- Phoenix project initialized
- Canonical graph exists (`/skill:phoenix-canonicalize`)

## Pipeline Position

**Phase C** → Next: `/skill:phoenix-regen`

## Dependencies

- `phoenix-utils/lib/helpers.ts`
- `phoenix-utils/lib/types.ts`
- `phoenix-utils/lib/prompts.ts` (for LLM enhancement)

## See Also

- /skill:phoenix-canonicalize - Previous phase
- /skill:phoenix-regen - Next phase
