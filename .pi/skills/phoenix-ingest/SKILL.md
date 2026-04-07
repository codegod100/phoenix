---
name: phoenix-ingest
description: Parse specification files into content-addressed clauses with SHA-256 hashing. Executable skill - runs ingest.js directly.
---

# Phoenix Ingest

Parse spec files into structured, content-addressed clauses.

## When to Use

- After editing spec files
- Before canonicalization
- To bootstrap a Phoenix project

## How to Run

```bash
node .pi/skills/phoenix-ingest/ingest.js [project-root]
```

## What It Does

1. Reads all `.md` files from `spec/` directory
2. Extracts clauses (REQUIREMENT, CONSTRAINT, etc.)
3. Normalizes text for stable comparison
4. Computes SHA-256 hashes for each clause
5. Writes `.phoenix/graphs/spec.json`

## Clause Types

- **REQUIREMENT**: System shall/should/must
- **CONSTRAINT**: Limitations or restrictions
- **DEFINITION**: Term definitions
- **ASSUMPTION**: Prerequisites
- **SCENARIO**: Usage examples

## Output Format

```json
{
  "version": "1.0.0",
  "clause_count": 42,
  "files": ["spec/app.md"],
  "clauses": [
    {
      "id": "sha256-of-normalized-text",
      "type": "REQUIREMENT",
      "text": "system shall display board",
      "clause_semhash": "sha256",
      "context_semhash": "sha256-with-context"
    }
  ]
}
```

## Example

```bash
$ node .pi/skills/phoenix-ingest/ingest.js

📥 Phoenix Ingest
   Project: /home/nandi/code/phoenix
   Spec dir: /home/nandi/code/phoenix/spec

✅ Ingested 12 clauses from 2 files
   Output: .phoenix/graphs/spec.json

   REQUIREMENT: 8
   CONSTRAINT: 2
   DEFINITION: 2
```

The skill is self-contained and inlines the necessary VCS identity functions from `src/vcs/identity.ts`:
- `canonId(text)` - SHA-256 hash generator
- `normalizeText(text)` - Text normalization for stable hashing

## Next Step

Run `phoenix-canonicalize` to extract clean requirements.
