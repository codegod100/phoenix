---
name: phoenix-audit
description: Audit Implementation Units with boundary validation and architectural linting. Executable skill - runs audit.js directly.
---

# Phoenix Audit

Boundary validation per PRD architectural rules.

## When to Use

- Before committing code
- After generating code
- To validate architectural integrity

## How to Run

```bash
node .pi/skills/phoenix-audit/audit.js <file-path>
```

## What It Checks

1. **Forbidden imports** - IU dependencies that violate policy
2. **Forbidden packages** - Blacklisted npm packages
3. **Side channels** - Undeclared DB, API, or system calls
4. **Traceability** - _phoenix export presence

## Example

```bash
node .pi/skills/phoenix-audit/audit.js src/generated/app/dashboard.ts
```

Output:
```
🔍 Phoenix Audit
   File: src/generated/app/dashboard.ts

╔══════════════════════════════════════════════════════════════╗
║  Phoenix VCS Boundary Validation                               ║
╚══════════════════════════════════════════════════════════════╝

✅ src/generated/app/dashboard.ts
   Side channels: database (warning - undeclared)

Status: ⚠️ WARNING (0 errors, 1 warning)
```

## Exit Codes

- 0: Passed (or warnings only)
- 1: Failed (boundary errors found)

## Next Step

Fix boundary violations or update IU boundary policy.
