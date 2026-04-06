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

### Clause
```typescript
interface Clause {
  id: string;           // SHA-256 hash
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'ASSUMPTION' | 'SCENARIO';
  text: string;         // Normalized
  raw_text: string;     // Original
  section: string;      // Parent heading
  source_file: string;  // Relative path
}
```

### Canonical Node
```typescript
interface CanonicalNode {
  canon_id: string;     // node-001, node-002, etc.
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'INVARIANT';
  statement: string;    // Clean requirement
  source_clause_ids: string[];
}
```

### Implementation Unit
```typescript
interface ImplementationUnit {
  iu_id: string;        // Hash of requirements
  name: string;         // "Dashboard Page"
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  contract: {
    description: string;
    inputs: string[];
    outputs: string[];
    invariants: string[];
  };
  source_canon_ids: string[];  // ['node-001', 'node-002']
  output_files: string[];
}
```

## Traceability Export

Every generated file MUST include:

```typescript
export const _phoenix = {
  iu_id: 'abc123...',
  name: 'Dashboard Page',
  risk_tier: 'high',
  canon_ids: ['node-001', 'node-002'] as const,
} as const;
```

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
