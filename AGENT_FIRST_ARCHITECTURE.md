# Agent-First Phoenix VCS Architecture

**Each skill is completely self-contained.** No shared libraries, no cross-skill imports.

## Philosophy

- **Skill = Implementation**: The skill IS the code, not just documentation
- **No Shared Core**: Each skill contains all functions it needs
- **Copy-Friendly**: Skills can be copied, moved, or forked independently
- **Zero Dependencies**: Only Node.js stdlib (fs, path, crypto)

## Structure

```
.pi/skills/
├── phoenix-drift/
│   ├── SKILL.md              # Usage documentation
│   └── drift.js              ← EXECUTABLE (self-contained)
│       ├── canonId()         # SHA-256 hashing (inlined)
│       ├── detectDrift()     # Drift logic (inlined)
│       └── formatReport()    # Output formatting (inlined)
│
├── phoenix-status/
│   ├── SKILL.md
│   └── status.js             ← EXECUTABLE (self-contained)
│       ├── getVCSStatus()    # Status logic (inlined)
│       └── formatStatus()    # Output formatting (inlined)
│
├── phoenix-cascade/
│   ├── SKILL.md
│   └── cascade.js            ← EXECUTABLE (self-contained)
│       ├── buildGraph()      # Graph construction (inlined)
│       ├── computeCascade()  # Cascade logic (inlined)
│       └── formatEvent()     # Output formatting (inlined)
│
├── phoenix-audit/
│   ├── SKILL.md
│   └── audit.js              ← EXECUTABLE (self-contained)
│       ├── extractImports()  # Import parsing (inlined)
│       ├── detectChannels()  # Side channel detection (inlined)
│       └── validateBoundary() # Validation logic (inlined)
│
└── phoenix-ingest/
    ├── SKILL.md
    └── ingest.js             ← EXECUTABLE (self-contained)
        ├── normalizeText()   # Text normalization (inlined)
        ├── clauseSemhash()   # Clause hashing (inlined)
        └── ingestSpecs()     # Ingest logic (inlined)
```

## Usage

### Direct Execution

```bash
# Any skill can run standalone
node .pi/skills/phoenix-drift/drift.js
node .pi/skills/phoenix-status/status.js
node .pi/skills/phoenix-cascade/cascade.js cascade <iu-id>
node .pi/skills/phoenix-cascade/cascade.js invalidate <canon-id>
node .pi/skills/phoenix-audit/audit.js <file-path>
node .pi/skills/phoenix-ingest/ingest.js
```

### From Any Directory

```bash
# Absolute path works from anywhere
node /path/to/project/.pi/skills/phoenix-status/status.js

# With explicit project root
node /path/to/.pi/skills/phoenix-status/status.js /other/project
```

## Skill Internals

Each `.js` file follows this pattern:

```javascript
#!/usr/bin/env node
/**
 * Skill Name - Description
 * Self-contained skill - no external dependencies
 */

import { fs, path, crypto } from 'node:stdlib';  // Only Node.js built-ins

// === VCS FUNCTIONS (inlined, not imported) ===

function canonId(text) {
  // SHA-256 implementation directly in file
}

function detectDrift(projectRoot, manifest) {
  // Drift logic directly in file
}

function formatReport(report) {
  // Formatting directly in file
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');
// ... execution logic
```

## Benefits

| Aspect | Before (Shared Core) | After (Self-Contained) |
|--------|----------------------|------------------------|
| **Dependencies** | Import from `phoenix-vcs-core` | None (inlined) |
| **Portability** | Needs core library | Copy single file |
| **Versioning** | Core version affects all | Each skill versions independently |
| **Testing** | Test core + integration | Test skill in isolation |
| **Debugging** | Trace through imports | Everything in one file |
| **Deployment** | Deploy core + skills | Deploy individual skills |

## Adding a New Skill

1. Create folder: `.pi/skills/phoenix-newname/`
2. Create `SKILL.md`: Usage documentation
3. Create `newname.js`:
   - Inline all functions needed
   - Only use Node.js stdlib
   - Export CLI interface via `process.argv`
   - Exit 0 (success) or 1 (failure)

Example template:

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Inline your functions here
function myUtility() { /* ... */ }

// Main execution
const projectRoot = resolve(process.argv[2] || '.');
// ... do work
console.log('Result');
process.exit(0);
```

## No Shared Code Philosophy

**Why duplicate code across skills?**

1. **Independence**: Skills don't break when others change
2. **Clarity**: Everything needed is in one file
3. **Debugging**: No tracing through imports
4. **Forking**: Copy one skill, not the whole system
5. **Evolution**: Each skill evolves at its own pace

**Trade-off**: Code duplication vs. decoupling

We choose decoupling. 100 lines duplicated is better than hidden dependencies.

## Comparison: Old vs New

### Old (Centralized)
```
src/vcs/
├── identity.ts      ← Shared
├── drift.ts         ← Shared  
└── boundary.ts      ← Shared

.pi/skills/
└── phoenix-drift/
    └── drift.js     → imports from ../../../src/vcs/drift.js
```

### New (Self-Contained)
```
.pi/skills/
└── phoenix-drift/
    └── drift.js     ← Contains canonId(), detectDrift(), formatReport()
```

## Testing

```bash
# Test individual skill
cd examples/kanban
node ../../.pi/skills/phoenix-drift/drift.js

# Test from anywhere
node /home/nandi/code/phoenix/.pi/skills/phoenix-status/status.js /some/project
```

## Exit Codes

- `0`: Success / Passed / Healthy
- `1`: Error / Failed / Critical issues

Skills use exit codes for CI/CD integration.

## Migration from Centralized

If you have the old `src/vcs/` or `phoenix-vcs-core/`:

1. Copy functions from shared library into skill `.js` files
2. Remove all `import from '../phoenix-vcs-core/'` statements
3. Inline utility functions directly in skill files
4. Delete shared library when all skills migrated

Done! Skills are now self-contained.
