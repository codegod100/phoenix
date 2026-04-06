---
name: phoenix-utils
description: Shared patterns and types for Phoenix skills. Reference for implementing Phoenix operations.
---

# Phoenix Utilities

Reference patterns for Phoenix skill implementations.

## Project Structure

```
project/
├── spec/                      # Specification documents
│   └── app.md
└── src/
    └── generated/            # Generated code
```

## Data Types

### Clause (from spec)
```typescript
interface Clause {
  id: string;           // SHA-256 hash of normalized text
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'ASSUMPTION' | 'SCENARIO';
  text: string;         // Normalized
  raw_text: string;     // Original
  section: string;      // Parent heading
  source_file: string;  // Relative path
}
```

### Canonical Node (from canonicalize)
```typescript
interface CanonicalNode {
  canon_id: string;     // Content-addressed hash (SHA-256 of statement)
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'INVARIANT';
  statement: string;    // Clean requirement
  source_clause_ids: string[];
}
```

### Implementation Unit (from plan)
```typescript
interface ImplementationUnit {
  iu_id: string;        // Hash of canonical nodes + config
  name: string;         // "Dashboard Page"
  kind: 'module' | 'api' | 'web-ui' | 'function';
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  contract: {
    description: string;
    inputs: string[];
    outputs: string[];
    invariants: string[];
  };
  source_canon_ids: string[];  // References to canonical requirements
  output_files: string[];
  boundary_policy: { /* code constraints */ };
  evidence_policy: { /* required validations */ };
}
```

## Traceability Chain

```
CODE (iu_id) → IU (source_canon_ids) → CANON (canon_id) → CLAUSE (clause.id) → SPEC
```

**In code:**
```typescript
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

The IU (tracked separately) has `source_canon_ids` linking to requirements.

## Common Operations

### Read Spec Files
```typescript
const specFiles = fs.readdirSync('spec/')
  .filter(f => f.endsWith('.md'));
```

### Extract Clauses
```typescript
// Look for lines starting with "- " or "* "
// Check for markers: REQUIREMENT:, CONSTRAINT:, etc.
```

### Normalize Text
```typescript
const normalized = text
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
```

### Compute Content Hash
```typescript
const hash = sha256(normalizedStatement).slice(0, 16);
```
