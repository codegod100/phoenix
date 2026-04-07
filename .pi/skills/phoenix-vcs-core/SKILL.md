---
name: phoenix-vcs-core
description: Shared VCS utilities for Phoenix skills. Provides hashing, types, and core algorithms. Imported by other Phoenix skills.
---

# Phoenix VCS Core

Agent-first shared utilities for Phoenix VCS operations.

## Purpose

This skill contains reusable code for all Phoenix VCS skills:
- SHA-256 hashing functions
- Drift detection algorithms
- Graph operations
- Evidence collection
- Type definitions

## Used By

- `phoenix-ingest` → identity, hashing
- `phoenix-drift` → drift detection
- `phoenix-audit` → boundary validation
- `phoenix-cascade` → graph operations
- `phoenix-status` → unified diagnostics

## Import Pattern

From sibling skills:

```javascript
import { canonId, normalizeText } from '../phoenix-vcs-core/lib/identity.js';
import { detectDrift } from '../phoenix-vcs-core/lib/drift.js';
import { buildDependencyGraph } from '../phoenix-vcs-core/lib/cascade.js';
```

## Do Not Use Directly

This skill provides utilities only. Use specific skills:
- `/skill:phoenix-ingest` - Parse specs
- `/skill:phoenix-drift` - Check for edits
- `/skill:phoenix-status` - Full diagnostics
