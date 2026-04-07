---
name: phoenix-utils
description: Shared patterns, types, and utilities for Phoenix skills. Reference-only library - not an executable skill.
---

# Phoenix Utilities

Reference patterns and shared utilities for Phoenix skill implementations.

## Purpose

This directory contains reusable code patterns and type definitions used by other Phoenix skills. It is **not an executable skill** - rather, it's a library that other skills can import or copy patterns from.

## Contents

```
phoenix-utils/
├── SKILL.md        # This documentation
└── lib/            # Shared utility code
    └── (shared modules)
```

## Usage

Other skills should inline or reference these patterns rather than importing them directly (skills are self-contained).

### Data Types Reference

#### Clause (from spec)
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

#### Canonical Node (from canonicalize)
```typescript
interface CanonicalNode {
  canon_id: string;     // Content-addressed hash (SHA-256 of statement)
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'INVARIANT';
  statement: string;    // Clean requirement
  source_clause_ids: string[];
}
```

#### Implementation Unit (from plan)
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

## Common Operations Reference

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

## Note for Skill Authors

When creating new skills:
1. Copy relevant type definitions from this reference
2. Inline utility functions (skills are self-contained)
3. Follow the patterns shown in existing skills
4. Keep skills independent - no external imports from lib/
