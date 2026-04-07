# Agent-First Phoenix VCS Architecture

The VCS core code has been moved INTO the skill folders. Skills are now self-contained executables.

## Architecture

```
.pi/skills/
├── phoenix-vcs-core/          ← Shared utilities
│   ├── SKILL.md               (Usage docs)
│   ├── index.js               (Exports)
│   └── lib/
│       ├── identity.js        (SHA-256, D-rate, classification)
│       ├── drift.js           (Manifest comparison)
│       ├── boundary.js        (Architectural linting)
│       ├── cascade.js         (Graph operations)
│       ├── evidence.js        (Risk-tiered enforcement)
│       └── status.js          (Unified diagnostics)
│
├── phoenix-ingest/
│   ├── SKILL.md               (Usage docs)
│   └── ingest.js              ← EXECUTABLE ← imports from vcs-core
│
├── phoenix-drift/
│   ├── SKILL.md
│   └── drift.js               ← EXECUTABLE
│
├── phoenix-status/
│   ├── SKILL.md
│   └── status.js              ← EXECUTABLE
│
├── phoenix-cascade/
│   ├── SKILL.md
│   └── cascade.js             ← EXECUTABLE
│
├── phoenix-audit/
│   ├── SKILL.md
│   └── audit.js               ← EXECUTABLE
│
└── [other skills with .js files...]
```

## How to Use

### Direct Execution

```bash
# Run any skill directly
node .pi/skills/phoenix-ingest/ingest.js
node .pi/skills/phoenix-drift/drift.js
node .pi/skills/phoenix-status/status.js
node .pi/skills/phoenix-cascade/cascade.js cascade <iu-id>
node .pi/skills/phoenix-cascade/cascade.js invalidate <canon-id>
node .pi/skills/phoenix-audit/audit.js <file-path>
```

### From Anywhere

```bash
# Absolute path works from any directory
node /path/to/project/.pi/skills/phoenix-status/status.js

# With explicit project root
node /path/to/.pi/skills/phoenix-status/status.js /other/project
```

### As Skill Commands

When agent uses `/skill:phoenix-X`, it reads SKILL.md then runs the .js file.

## Import Pattern

Skills import from phoenix-vcs-core using relative paths:

```javascript
// From phoenix-drift/drift.js
import { loadManifest, detectDrift } from '../phoenix-vcs-core/lib/drift.js';

// From phoenix-cascade/cascade.js
import { buildDependencyGraph, computeCascade } from '../phoenix-vcs-core/lib/cascade.js';
```

## Benefits

1. **Agent-First**: Skills ARE the implementation
2. **Self-Contained**: Each skill has its own code
3. **Executable**: Direct `node skill.js` invocation
4. **Consistent**: All import from shared phoenix-vcs-core
5. **Versioned**: Skills track their own dependencies
6. **Testable**: Each .js file can be tested independently

## Migration from Centralized VCS Core

| Before | After |
|--------|-------|
| `src/vcs/*.ts` compiled to `dist/vcs/*.js` | `.pi/skills/phoenix-vcs-core/lib/*.js` |
| `npx phoenix-vcs drift` | `node .pi/skills/phoenix-drift/drift.js` |
| Centralized package | Distributed in skill folders |
| Agent calls CLI | Agent runs skill JS directly |

## Testing

```bash
# Test drift detection
cd examples/kanban
node ../../.pi/skills/phoenix-drift/drift.js

# Test status
node ../../.pi/skills/phoenix-status/status.js

# Test cascade
node ../../.pi/skills/phoenix-cascade/cascade.js invalidate node-abc123
```

## Future Skills

To add a new VCS skill:

1. Create `.pi/skills/phoenix-new/SKILL.md` (docs)
2. Create `.pi/skills/phoenix-new/new.js` (implementation)
3. Import from `../phoenix-vcs-core/lib/X.js`
4. Export CLI interface using `process.argv`
5. Exit with code 0 (success) or 1 (failure)

## Source vs Skills

The original `src/vcs/` TypeScript code remains as the **reference implementation** but skills use the **executable JS** versions in their folders. This means:

- `src/vcs/` = Reference (TypeScript, compiled)
- `.pi/skills/phoenix-vcs-core/lib/` = Skills runtime (JavaScript, native Node)

Both are kept in sync (or skills import from src/vcs if we set up proper builds).
