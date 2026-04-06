---
name: phoenix-utils
description: Shared utilities for Phoenix skills. Provides project detection, graph I/O, hashing, and LLM resolution. Other Phoenix skills depend on this.
---

# Phoenix Utilities

Shared helpers for all Phoenix skills. Load this via reading `lib/helpers.ts` when implementing other Phoenix skills.

## Directory Structure

```
phoenix-utils/
├── SKILL.md
└── lib/
    ├── helpers.ts      # Core utilities
    ├── types.ts        # TypeScript interfaces
    └── prompts.ts      # LLM prompt templates
```

## Core Concepts

### Phoenix Project Structure

```
project/
├── spec/                      # Specification documents
│   └── app.md
├── src/
│   └── generated/            # Generated code (don't edit)
│       └── app/
├── .phoenix/                 # Phoenix metadata
│   ├── graphs/
│   │   ├── spec.json        # Parsed clauses
│   │   ├── canonical.json   # Canonical requirements
│   │   ├── ius.json         # Implementation Units
│   │   └── warm-hashes.json # Context hashes
│   ├── manifests/
│   │   └── generated_manifest.json
│   └── state.json           # Bootstrap state
└── .pi-agent/               # Agent working directory
    └── drift-justification.md
```

### Key Data Structures

**Clause** (from spec parsing):
```typescript
interface Clause {
  id: string;           // SHA-256 hash of text
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'ASSUMPTION' | 'SCENARIO';
  text: string;         // Normalized text
  section: string;      // H2/H3 heading context
  line_start: number;
  line_end: number;
}
```

**Canonical Node** (from canonicalization):
```typescript
interface CanonicalNode {
  canon_id: string;     // Content-addressed hash
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'INVARIANT';
  statement: string;    // Normalized, decontextualized
  confidence: number;    // 0-1 extraction confidence
  source_clause_ids: string[];
  linked_canon_ids: string[];
  link_types: Record<string, 'refines' | 'depends' | 'conflicts'>;
  tags: string[];
}
```

**Implementation Unit** (from planning):
```typescript
interface ImplementationUnit {
  iu_id: string;        // Hash of canonical nodes + config
  name: string;         // e.g., "Board", "API", "Cards"
  kind: 'module' | 'api' | 'web-ui' | 'function';
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  contract: {
    description: string;
    inputs: string[];
    outputs: string[];
    invariants: string[];
  };
  source_canon_ids: string[];
  output_files: string[];
  boundary_policy: { /* code constraints */ };
  evidence_policy: { /* required validations */ };
}
```

## Usage in Other Skills

When implementing a Phoenix skill, read these files first:

```bash
read ~/.pi/agent/skills/phoenix-utils/lib/types.ts
read ~/.pi/agent/skills/phoenix-utils/lib/helpers.ts
```

Then follow the patterns for:
1. **Finding Phoenix root**: Use `findProjectRoot()` pattern
2. **Reading graphs**: Use `readGraph()` pattern  
3. **Writing graphs**: Use `writeGraph()` pattern
4. **Content hashing**: Use `computeHash()` pattern
5. **LLM calls**: Use `resolveLLM()` → `callLLM()` pattern

## Error Handling Principles

All Phoenix skills should:
1. **Check prerequisites** before running (graphs exist, project initialized)
2. **Fail fast** with clear error messages
3. **Preserve state** on failure (don't corrupt graphs)
4. **Log progress** at each phase
5. **Validate outputs** match expected schemas
