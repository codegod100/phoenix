---
name: phoenix-audit
description: Audit Implementation Units for readiness and quality. Checks contracts, boundaries, evidence policies, and identifies gaps before regeneration.
---

# Phoenix Audit

Audit Implementation Units for implementation readiness.

## When to Use

- Before `/skill:phoenix-regen` to check IU quality
- To identify incomplete requirements
- To assess risk before generating high-tier IUs
- To find missing test coverage
- To review boundary policy violations

## Usage

```bash
/skill:phoenix-audit           # Audit all IUs
/skill:phoenix-audit Board     # Audit specific IU
/skill:phoenix-audit --strict  # Fail on warnings
/skill:phoenix-audit --report  # Generate audit report
```

## What It Audits

For each IU:
1. **Contract completeness** (all fields filled)
2. **Invariants clarity** (testable, specific)
3. **Risk tier appropriateness** (complexity vs. tier)
4. **Evidence requirements** (typecheck, tests, etc.)
5. **Boundary policy** (dependencies valid)
6. **Traceability** (canon_ids linked to actual nodes)
7. **Output file planning** (valid paths, no conflicts)

## Implementation Steps

### Step 1: Load Data

```typescript
const { root, phoenixDir } = requireProjectRoot();
const iuGraph = readGraph<IUGraph>(phoenixDir, 'ius');
const canonGraph = readGraph<CanonicalGraph>(phoenixDir, 'canonical');

if (!iuGraph || !canonGraph) {
  throw new Error('IU or canonical graph not found');
}
```

### Step 2: Define Audit Rules

```typescript
interface AuditRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (iu: ImplementationUnit, context: AuditContext) => AuditFinding | null;
}

const auditRules: AuditRule[] = [
  {
    id: 'contract-description',
    name: 'Contract has description',
    severity: 'error',
    check: (iu) => {
      if (!iu.contract.description || iu.contract.description.length < 10) {
        return {
          rule: 'contract-description',
          message: 'IU contract description missing or too short',
          severity: 'error'
        };
      }
      return null;
    }
  },
  {
    id: 'contract-invariants',
    name: 'Has invariants',
    severity: 'error',
    check: (iu) => {
      if (iu.contract.invariants.length === 0) {
        return {
          rule: 'contract-invariants',
          message: 'IU has no invariants defined',
          severity: 'error'
        };
      }
      return null;
    }
  },
  {
    id: 'invariant-specificity',
    name: 'Invariants are specific',
    severity: 'warning',
    check: (iu) => {
      const vagueWords = ['appropriate', 'reasonable', 'sufficient', 'proper'];
      for (const inv of iu.contract.invariants) {
        for (const word of vagueWords) {
          if (inv.toLowerCase().includes(word)) {
            return {
              rule: 'invariant-specificity',
              message: `Invariant contains vague word "${word}": ${inv.slice(0, 50)}...`,
              severity: 'warning'
            };
          }
        }
      }
      return null;
    }
  },
  {
    id: 'risk-tier-matches-complexity',
    name: 'Risk tier appropriate for complexity',
    severity: 'warning',
    check: (iu) => {
      const nodeCount = iu.source_canon_ids.length;
      
      if (nodeCount > 15 && iu.risk_tier === 'low') {
        return {
          rule: 'risk-tier-matches-complexity',
          message: `${nodeCount} requirements but risk tier is 'low' - consider 'medium' or 'high'`,
          severity: 'warning'
        };
      }
      
      if (nodeCount < 3 && iu.risk_tier === 'high') {
        return {
          rule: 'risk-tier-matches-complexity',
          message: `Only ${nodeCount} requirements but risk tier is 'high' - consider 'low' or 'medium'`,
          severity: 'info'
        };
      }
      
      return null;
    }
  },
  {
    id: 'high-risk-requires-tests',
    name: 'High-risk IUs require tests',
    severity: 'error',
    check: (iu) => {
      if (['high', 'critical'].includes(iu.risk_tier)) {
        const hasTestOutput = iu.outputs.some(o => o.type === 'test');
        if (!hasTestOutput) {
          return {
            rule: 'high-risk-requires-tests',
            message: `High-risk IU "${iu.name}" missing test output`,
            severity: 'error'
          };
        }
      }
      return null;
    }
  },
  {
    id: 'canon-ids-exist',
    name: 'Canon IDs link to real nodes',
    severity: 'error',
    check: (iu, ctx) => {
      const invalidIds = iu.source_canon_ids.filter(id => !ctx.canonGraph.nodes[id]);
      if (invalidIds.length > 0) {
        return {
          rule: 'canon-ids-exist',
          message: `${invalidIds.length} canon_ids don't exist in graph: ${invalidIds.join(', ')}`,
          severity: 'error'
        };
      }
      return null;
    }
  },
  {
    id: 'no-circular-dependencies',
    name: 'No circular dependencies',
    severity: 'error',
    check: (iu, ctx) => {
      // Check if IU depends on itself (direct or indirect)
      const visited = new Set<string>();
      const stack = new Set<string>();
      
      function hasCycle(iuId: string): boolean {
        if (stack.has(iuId)) return true;
        if (visited.has(iuId)) return false;
        
        visited.add(iuId);
        stack.add(iuId);
        
        const currentIU = ctx.iuGraph.ius.find(i => i.iu_id === iuId);
        if (currentIU) {
          for (const depId of currentIU.dependencies) {
            if (hasCycle(depId)) return true;
          }
        }
        
        stack.delete(iuId);
        return false;
      }
      
      if (hasCycle(iu.iu_id)) {
        return {
          rule: 'no-circular-dependencies',
          message: `Circular dependency detected involving ${iu.name}`,
          severity: 'error'
        };
      }
      
      return null;
    }
  },
  {
    id: 'output-paths-valid',
    name: 'Output file paths are valid',
    severity: 'error',
    check: (iu) => {
      for (const path of iu.output_files) {
        // Check path is in allowed location
        if (!path.startsWith('src/generated/')) {
          return {
            rule: 'output-paths-valid',
            message: `Output file "${path}" not in src/generated/`,
            severity: 'error'
          };
        }
        
        // Check filename validity
        if (path.includes(' ')) {
          return {
            rule: 'output-paths-valid',
            message: `Output file "${path}" contains spaces`,
            severity: 'error'
          };
        }
      }
      return null;
    }
  },
  {
    id: 'no-output-conflicts',
    name: 'No output file conflicts',
    severity: 'error',
    check: (iu, ctx) => {
      for (const otherIU of ctx.iuGraph.ius) {
        if (otherIU.iu_id === iu.iu_id) continue;
        
        for (const myFile of iu.output_files) {
          if (otherIU.output_files.includes(myFile)) {
            return {
              rule: 'no-output-conflicts',
              message: `Output file "${myFile}" also claimed by ${otherIU.name}`,
              severity: 'error'
            };
          }
        }
      }
      return null;
    }
  }
];
```

### Step 3: Run Audits

```typescript
interface AuditContext {
  iuGraph: IUGraph;
  canonGraph: CanonicalGraph;
}

function auditIU(iu: ImplementationUnit, context: AuditContext): AuditResult {
  const findings: AuditFinding[] = [];
  
  for (const rule of auditRules) {
    const finding = rule.check(iu, context);
    if (finding) {
      findings.push(finding);
    }
  }
  
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  
  return {
    iu_id: iu.iu_id,
    name: iu.name,
    ready: errors.length === 0,
    score: calculateScore(findings),
    findings,
    summary: {
      errors: errors.length,
      warnings: warnings.length,
      info: findings.filter(f => f.severity === 'info').length
    }
  };
}

function calculateScore(findings: AuditFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'error') score -= 20;
    if (f.severity === 'warning') score -= 10;
    if (f.severity === 'info') score -= 2;
  }
  return Math.max(0, score);
}
```

### Step 4: Generate Recommendations

```typescript
function generateRecommendations(result: AuditResult): string[] {
  const recs: string[] = [];
  
  for (const finding of result.findings) {
    switch (finding.rule) {
      case 'contract-invariants':
        recs.push('Add specific invariants to IU contract');
        break;
      case 'high-risk-requires-tests':
        recs.push(`Add test output to IU: { type: 'test', file: 'src/generated/app/__tests__/${result.name.toLowerCase()}.test.ts' }`);
        break;
      case 'risk-tier-matches-complexity':
        if (result.summary.errors === 0) {
          recs.push(`Review risk_tier - adjust based on actual complexity`);
        }
        break;
      case 'invariant-specificity':
        recs.push('Rewrite invariants with measurable criteria (numbers, booleans, specific strings)');
        break;
    }
  }
  
  return [...new Set(recs)];
}
```

### Step 5: Display Results

```
🔍 Phoenix Audit

  Board (a8940dc3...) - Score: 95/100 ✓ Ready
    ✓ Contract has description
    ✓ Has invariants
    ⚠ Invariant specificity: "reasonable height" → use pixels
    ✓ Risk tier appropriate
    ✓ Tests planned
    ✓ All canon IDs valid
    ✓ No circular deps
    ✓ Output paths valid

  API (1ff7069a...) - Score: 100/100 ✓ Ready
    ✓ All checks passed

  Cards (bd12de5e...) - Score: 70/100 ✗ Not Ready
    ✗ Missing test output (high-risk IU requires tests)
    ⚠ 10 requirements but risk tier is 'medium' - consider 'high'
    ⚠ Invariant contains vague word "appropriate"
    
    Recommendations:
      1. Add test output: src/generated/app/__tests__/cards.test.ts
      2. Review risk_tier for complexity
      3. Rewrite invariants with measurable criteria

  Summary:
    4 IUs ready
    1 IU not ready (Cards)
    
    Total: 3 errors, 4 warnings, 0 info
```

## Smoketest Checklist (Light Implementation Testing)

Beyond traceability checks, the audit can perform light implementation verification:

### What Smoketests Catch

1. **Database Implementation**: SQLite vs in-memory Maps
   - Check: Does database.ts import `bun:sqlite`?
   - Check: Are there SQL queries (INSERT/SELECT/UPDATE/DELETE)?
   - Check: Are there no `new Map()` or `Map.set()` calls?

2. **No-Op Functions**: Empty init functions that look correct
   - Check: Does `initDatabase()` actually do initialization?
   - Check: Are there empty blocks or just variable assignments?

3. **Export Compatibility**: Server expects functions that exist
   - Check: Does index.ts export functions server.ts imports?
   - Check: Are there empty export blocks?

4. **Traceability Exports**: All files have `_phoenix`
   - Check: Every generated file exports `_phoenix` constant?
   - Check: Does `_phoenix` contain iu_id, name, risk_tier?

5. **Basic Syntax**: Quick brace matching, no obvious errors
   - Check: Equal opening/closing braces
   - Check: No empty export blocks

### When to Run Smoketests

- After regeneration to catch obvious implementation bugs
- Before committing to verify spec compliance
- When audit passes but behavior is wrong (structural mismatch)

### Example Finding

```
=== Smoketest Checklist ===

✗ Database uses SQLite, not in-memory Maps
  → Uses in-memory Maps instead of SQLite
     Database.ts must use bun:sqlite with SQL queries, not Map objects

⚠ Database initialization is not a no-op
  → initDatabase is a no-op
     initDatabase() must actually initialize SQLite

✓ Generated files have _phoenix exports
✓ Server has required exports
```

### Why Smoketests Matter

Traceability checks that IDs match and files exist, but NOT that implementation satisfies requirements. A file can have:
- ✓ Correct `_phoenix` export
- ✓ Valid IU ID linkage
- ✗ Wrong implementation (Maps instead of SQLite)

Smoketests bridge this gap with light static analysis.

## Readiness Levels

| Score | Level | Action |
|-------|-------|--------|
| 95-100 | Excellent | Ready for regen |
| 80-94 | Good | Ready, minor warnings |
| 60-79 | Fair | Fix warnings before regen |
| 40-59 | Poor | Fix errors before regen |
| 0-39 | Critical | Major issues, redesign IU |

## Prerequisites

- Phoenix project initialized
- IU graph exists (`/skill:phoenix-plan`)
- Canonical graph exists

## Pipeline Position

Before regeneration - quality gate.

## See Also

- /skill:phoenix-regen - Next step if audit passes
- /skill:phoenix-plan - Edit IUs if audit fails
