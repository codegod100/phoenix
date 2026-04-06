---
name: phoenix-canonicalize
description: Extract canonical requirements from clauses. Normalizes statements and assigns node IDs.
---

# Phoenix Canonicalize

Transform clauses into clean, canonical requirements.

## When to Use

- After ingesting spec files
- Before planning implementation
- To resolve duplicates and ambiguities

## Input

Clauses from Ingest phase:
```
[REQ-001] system shall render complete html page
[REQ-002] page must display taskflow header
[CON-001] no theme toggle allowed
```

## Process

1. **Group by type**
   - Separate REQUIREMENT, CONSTRAINT, etc.

2. **Remove duplicates**
   - Same text = same requirement
   - Keep first occurrence

3. **Normalize**
   - Lowercase
   - Remove extra whitespace
   - Standardize terms

4. **Assign node IDs**
   - Format: `node-<hash>` where hash is first 8 chars of SHA-256 of normalized text
   - Example: `node-a1b2c3d4`

## Output

Canonical requirements:
```
node-a1b2c3d4: system shall render complete html page with inline css and javascript
node-b2c3d4e5: page must display header with title taskflow and task count summary
node-c3d4e5f6: no theme toggle allowed
```

## Quality Checks

- [ ] No duplicate statements
- [ ] All requirements are specific
- [ ] Constraints are measurable
- [ ] Language is consistent

## Next Step

Pass canonical requirements to Plan phase.
