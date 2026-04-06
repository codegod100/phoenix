---
name: phoenix-ingest
description: Parse specification markdown files into structured clauses. Extracts REQUIREMENT, CONSTRAINT, DEFINITION, ASSUMPTION, and SCENARIO statements. Use when specs change or before canonicalization.
---

# Phoenix Ingest

Parse specification files into structured clauses for the Phoenix pipeline.

## When to Use

- After editing `spec/app.md` or any `.md` file in `spec/`
- Before running `/skill:phoenix-canonicalize`
- To see what changed in specs (diff mode)
- After adding new spec files

## Usage

```bash
/skill:phoenix-ingest                    # Ingest all spec/*.md files
/skill:phoenix-ingest spec/api.md        # Ingest specific file
/skill:phoenix-ingest --verbose          # Show detailed clause breakdown
```

## What It Does

1. **Find spec files** in `spec/` directory
2. **Parse markdown** structure (headings, lists)
3. **Extract clauses** from bullet points
4. **Normalize text** (lowercase, standardize)
5. **Compute IDs** (SHA-256 hash of normalized text)
6. **Store results** in `.phoenix/graphs/spec.json`
7. **Show diff** from previous ingest

## Input Format

Markdown files in `spec/` directory with Phoenix syntax:

```markdown
# Project Name

## Section Name

- REQUIREMENT: The system shall display a board
- CONSTRAINT: Maximum 100 cards per board
- DEFINITION: A card is a task unit with title and description
- ASSUMPTION: User has modern web browser
- SCENARIO: User drags card between columns
  - GIVEN: Two columns exist
  - WHEN: User drags card
  - THEN: Card appears in target column
```

## Implementation Steps

### Step 1: Find Spec Files

```typescript
// Read helpers.ts for findSpecFiles pattern
const specFiles = findSpecFiles(projectRoot);
if (specFiles.length === 0) {
  throw new Error('No .md files found in spec/ directory');
}
```

### Step 2: Parse Each File

For each markdown file:

1. **Read file content**
   ```typescript
   const content = readFileSync(specFile, 'utf8');
   const lines = content.split('\n');
   ```

2. **Track current section**
   - Parse headings (`## Section`, `### Subsection`)
   - Keep stack of current section path
   - Example: `Board > Cards > Drag and Drop`

3. **Extract clauses from bullet points**
   - Look for lines starting with `- ` or `* `
   - Check for clause markers (REQUIREMENT:, CONSTRAINT:, etc.)
   - Multi-line clauses: continue until next bullet or blank line

4. **Classify clause type**
   ```typescript
   function classifyClause(text: string): ClauseType {
     if (text.match(/^requirement:/i)) return 'REQUIREMENT';
     if (text.match(/^constraint:/i)) return 'CONSTRAINT';
     if (text.match(/^definition:/i)) return 'DEFINITION';
     if (text.match(/^assumption:/i)) return 'ASSUMPTION';
     if (text.match(/^scenario:/i)) return 'SCENARIO';
     return 'CONTEXT';  // Default for plain bullets
   }
   ```

5. **Normalize text**
   - Lowercase
   - Remove extra whitespace
   - Standardize punctuation
   - Example: `"System SHALL display..."` → `"system shall display..."`

6. **Compute clause ID**
   ```typescript
   const id = computeHash(normalizedText + section + type);
   ```

7. **Build clause object**
   ```typescript
   interface Clause {
     id: string;
     type: ClauseType;
     text: string;           // Normalized
     raw_text: string;       // Original
     section: string;        // Parent heading
     section_level: number;  // 2 for ##, etc.
     line_start: number;
     line_end: number;
     source_file: string;    // Relative path
   }
   ```

### Step 3: Compute Diff

Compare with previous spec graph:

```typescript
const previous = readGraph<SpecGraph>(phoenixDir, 'spec');
const diff = computeDiff(previous, current);
// Returns: added, removed, modified clause counts
```

### Step 4: Save Graph

```typescript
const specGraph: SpecGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  documents: {}
};

for (const file of specFiles) {
  const docId = relativePath(projectRoot, file);
  specGraph.documents[docId] = {
    clauses: clauses,
    metadata: {
      total_lines: lines.length
    }
  };
}

writeGraph(phoenixDir, 'spec', specGraph);
```

### Step 5: Update State

```typescript
const state = loadState(phoenixDir);
state.last_ingest = new Date().toISOString();
saveState(phoenixDir, state);
```

### Step 6: Report Results

```
📥 Spec Ingestion

  spec/app.md → 24 clauses
    +3 added (Board section)
    ~2 modified (API endpoints)
    -1 removed (old constraint)

  Total: 24 clauses across 1 document
  
  Next: /skill:phoenix-canonicalize
```

## Output Schema

`.phoenix/graphs/spec.json`:
```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-06T10:30:00Z",
  "documents": {
    "spec/app.md": {
      "clauses": [
        {
          "id": "abc123...",
          "type": "REQUIREMENT",
          "text": "system shall display board as horizontal columns",
          "raw_text": "The system shall display the board as horizontal columns.",
          "section": "UI",
          "section_level": 2,
          "line_start": 45,
          "line_end": 45,
          "source_file": "spec/app.md"
        }
      ],
      "metadata": {
        "total_lines": 120
      }
    }
  }
}
```

## Edge Cases

1. **Empty spec file**: Warn but continue
2. **No clause markers**: Treat all bullets as CONTEXT type
3. **Multi-line clauses**: Join with spaces, keep line range
4. **Duplicate text**: Same ID = same clause (deduplicate)
5. **Nested lists**: Flatten to parent clause context

## Prerequisites

- Phoenix project initialized (`/skill:phoenix-init`)
- Spec files in `spec/` directory

## Pipeline Position

**Phase A** → Next: `/skill:phoenix-canonicalize`

## Dependencies

- `phoenix-utils/lib/helpers.ts` - for readGraph, writeGraph, computeHash
- `phoenix-utils/lib/types.ts` - for Clause, SpecGraph interfaces

## See Also

- /skill:phoenix-canonicalize - Next phase
- /skill:phoenix-pipeline - Full pipeline
