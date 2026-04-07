---
name: phoenix-ingest
description: Parse specification markdown files into structured clauses with content-addressed IDs. Extracts REQUIREMENT, CONSTRAINT, DEFINITION, ASSUMPTION, and SCENARIO statements.
---

# Phoenix Ingest

Parse specification files into structured, content-addressed clauses.

## When to Use

- After editing spec files
- Before canonicalization
- To understand what requirements exist
- To bootstrap a Phoenix project

## Input Format

Markdown files in `spec/` directory:

```markdown
# Project Name

## Section Name

- REQUIREMENT: The system shall display a board
- CONSTRAINT: Maximum 100 cards per board
- DEFINITION: A card is a task unit
- ASSUMPTION: User has modern browser
- SCENARIO: User drags card between columns
  - GIVEN: Two columns exist
  - WHEN: User drags card
  - THEN: Card appears in target column
```

## Process

### Step 1: Find spec files

```bash
ls spec/*.md
```

### Step 2: Parse each file

For each file:
1. Read content with `read` tool
2. Track headings (## Section, ### Subsection)
3. Extract bullet points (- or *)
4. Identify markers (REQUIREMENT:, CONSTRAINT:, etc.)

### Step 3: Extract and hash clauses

For each clause:
1. **Normalize text** (lowercase, trim whitespace)
2. **Compute clause ID**: SHA-256 of normalized text
3. **Compute context hash**: SHA-256 of text + section + neighbors
4. **Classify change** (A/B/C/D) if re-ingesting

### Using VCS Core

The VCS core provides content-addressed hashing:

```typescript
import { clauseSemhash, contextSemhash, canonId, normalizeText } from 'phoenix-vcs/vcs';

// Normalize the clause text
const normalized = normalizeText("The system shall display a board");
// → "the system shall display a board"

// Compute content-addressed ID
const clauseId = canonId(normalized);
// → 'a1b2c3d4e5f6789012345678...' (64 char SHA-256)

// Compute context-aware hash
const contextHash = contextSemhash(normalized, ["Board", "Display"], prevHash, nextHash);
// → 'b2c3d4e5f6789012345678...'
```

### Step 4: Build output

Write to `.phoenix/graphs/spec.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-07T20:00:00Z",
  "clauses": [
    {
      "id": "sha256-hash",
      "type": "REQUIREMENT",
      "text": "the system shall display a board",
      "raw_text": "The system shall display a board",
      "section": "Board",
      "source_file": "spec/app.md",
      "clause_semhash": "sha256-of-text",
      "context_semhash": "sha256-with-context"
    }
  ]
}
```

## Output

Structured clauses with content-addressed IDs:
```
spec/web-dashboard.md:
  [a1b2c3d4...] REQUIREMENT: the system shall render complete html page
  [b2c3d4e5...] REQUIREMENT: the system shall display taskflow header
  [c3d4e5f6...] CONSTRAINT: no theme toggle allowed
```

## Change Classification

If re-ingesting existing specs, classify changes:

| Class | Meaning | Action |
|-------|---------|--------|
| A | Trivial (formatting) | No regeneration needed |
| B | Local semantic change | Regenerate affected IUs |
| C | Contextual shift | Review dependencies |
| D | Uncertain | Manual review required |

Use D-rate tracking to monitor classifier quality (target <5%).

## Next Step

Run `phoenix-canonicalize` to extract clean requirements.

## Integration with VCS

```bash
# Using the CLI
npx phoenix-vcs invalidate node-a1b2c3d4  # Check what changed clauses invalidate
```
