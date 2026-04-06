---
name: phoenix-ingest
description: Parse specification markdown files into structured clauses. Extracts REQUIREMENT, CONSTRAINT, DEFINITION, ASSUMPTION, and SCENARIO statements.
---

# Phoenix Ingest

Parse specification files into structured clauses.

## When to Use

- After editing spec files
- Before canonicalization
- To understand what requirements exist

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

1. **Find spec files**
   - Look in `spec/` directory
   - Find all `.md` files

2. **Parse each file**
   - Read file content
   - Track headings (## Section, ### Subsection)
   - Extract bullet points (- or *)

3. **Extract clauses**
   - Check for markers: REQUIREMENT:, CONSTRAINT:, etc.
   - Normalize text (lowercase, trim)
   - Compute ID: SHA-256 of normalized text

4. **Build output**
   - List all clauses with type, text, section

## Output

List of clauses:
```
spec/web-dashboard.md:
  [REQ-001] system shall render complete html page
  [REQ-002] page must display taskflow header
  [CON-001] no theme toggle allowed
```

## Clause Types

| Marker | Type | Description |
|--------|------|-------------|
| REQUIREMENT: | What system must do |
| CONSTRAINT: | Limitations or rules |
| DEFINITION: | Terms and concepts |
| ASSUMPTION: | Preconditions |
| SCENARIO: | User workflows |

## Next Step

Pass clauses to Canonicalize phase.
