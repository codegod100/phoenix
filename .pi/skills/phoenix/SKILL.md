---
name: phoenix
description: Universal Phoenix command router. Calls ingest, canonicalize, plan, regen, status, drift, audit, inspect, or pipeline based on arguments passed.
---

# Phoenix

Universal entry point for all Phoenix operations. Routes commands to the appropriate skill.

## When to Use

- Any Phoenix operation - this is the main entry point
- When you want a simpler command than remembering individual skill names
- For CI/CD scripts that need flexible Phoenix operations

## How to Invoke

**From the Pi TUI (interactive_shell):**
```
/skill:phoenix                    # Show status (default)
/skill:phoenix pipeline           # Run full pipeline
/skill:phoenix regen --force      # Regenerate with force
```

**From another skill or code:**
```typescript
// Use the Pi SDK's skill execution mechanism
// DO NOT shell out - use the built-in skill routing
await executeSkill('phoenix', ['pipeline', '--fast']);
await executeSkill('phoenix', ['regen', '--force']);
```

**Important:** This skill is invoked through the Pi agent's skill system (`/skill:phoenix` or `executeSkill()`). Do NOT attempt to run it as a shell command - the `/skill:` prefix is not a valid shell path.

## Usage

```bash
/skill:phoenix                    # Show status (default)
/skill:phoenix status             # Same as above
/skill:phoenix init               # Initialize new project
/skill:phoenix ingest             # Parse spec files
/skill:phoenix canonicalize       # Extract canonical requirements
/skill:phoenix plan               # Plan Implementation Units
/skill:phoenix regen              # Generate code
/skill:phoenix pipeline           # Run full pipeline
/skill:phoenix audit              # Audit IUs for quality
/skill:phoenix drift              # Check spec/code sync
/skill:phoenix inspect            # Visualize project
/skill:phoenix constraint-review  # Review spec for missing constraints
/skill:phoenix --help             # Show this help
```

Any additional arguments are passed through to the target skill:
```bash
/skill:phoenix pipeline --from plan --fast
/skill:phoenix regen --force
/skill:phoenix status --json
```

## Command Router

```typescript
const commands: Record<string, string> = {
  'init': 'phoenix-init',
  'ingest': 'phoenix-ingest',
  'canonicalize': 'phoenix-canonicalize',
  'plan': 'phoenix-plan',
  'regen': 'phoenix-regen',
  'pipeline': 'phoenix-pipeline',
  'audit': 'phoenix-audit',
  'drift': 'phoenix-drift',
  'inspect': 'phoenix-inspect',
  'status': 'phoenix-status',
  'constraint-review': 'phoenix-constraint-review',
  'constraints': 'phoenix-constraint-review',
  '--help': 'help',
  '-h': 'help'
};
```

## Implementation

**Note:** This skill is a documentation-only router. The actual execution happens through the Pi agent's skill system.

When implementing a caller:
1. **In TUI/shell mode:** Use `/skill:phoenix <command> [args]`
2. **In code/skills:** Use `executeSkill('phoenix', [command, ...args])`
3. **Never shell out** - there's no CLI binary to execute

### Step 1: Parse Arguments

```typescript
function parseCommand(args: string[]): { skill: string; skillArgs: string[] } {
  if (args.length === 0 || args[0].startsWith('-')) {
    // No command provided - default to status
    return { skill: 'phoenix-status', skillArgs: args };
  }
  
  const cmd = args[0].toLowerCase();
  const rest = args.slice(1);
  
  // Map to actual skill name
  const skillMap: Record<string, string> = {
    'init': 'phoenix-init',
    'ingest': 'phoenix-ingest',
    'canonicalize': 'phoenix-canonicalize', 
    'canon': 'phoenix-canonicalize',
    'plan': 'phoenix-plan',
    'regen': 'phoenix-regen',
    'gen': 'phoenix-regen',
    'generate': 'phoenix-regen',
    'pipeline': 'phoenix-pipeline',
    'full': 'phoenix-pipeline',
    'audit': 'phoenix-audit',
    'drift': 'phoenix-drift',
    'inspect': 'phoenix-inspect',
    'visualize': 'phoenix-inspect',
    'status': 'phoenix-status',
    'st': 'phoenix-status',
    's': 'phoenix-status'
  };
  
  const targetSkill = skillMap[cmd];
  
  if (!targetSkill) {
    if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
      showHelp();
      return { skill: '', skillArgs: [] };
    }
    throw new Error(`Unknown command: ${cmd}. Run /skill:phoenix --help for usage.`);
  }
  
  return { skill: targetSkill, skillArgs: rest };
}
```

### Step 2: Route to Target Skill

The phoenix skill maps the command and delegates to the actual skill:

```typescript
const { skill, skillArgs } = parseCommand(args);

if (!skill) {
  return; // Help was shown
}

console.log(`🔥 phoenix → ${skill}${skillArgs.length > 0 ? ' ' + skillArgs.join(' ') : ''}`);

// Delegate to the target skill via Pi's skill system
// This is NOT a shell call - it uses the internal skill router
await executeSkill(skill, skillArgs);
```

**Target skills are:**
- `phoenix-init`, `phoenix-ingest`, `phoenix-canonicalize`
- `phoenix-plan`, `phoenix-regen`, `phoenix-pipeline`
- `phoenix-audit`, `phoenix-drift`, `phoenix-inspect`, `phoenix-status`

These are all documentation-based skills that the Pi agent interprets directly.

### Step 3: Help Output

```typescript
function showHelp() {
  console.log(`
🔥 Phoenix - Universal Command Router

Usage: /skill:phoenix <command> [options]

Commands:
  init          Initialize a new Phoenix project
  ingest        Parse spec files into clauses
  canonicalize  Extract canonical requirements (alias: canon)
  plan          Plan Implementation Units
  regen         Generate code from IUs (aliases: gen, generate)
  pipeline      Run full pipeline (alias: full)
  audit         Audit IUs for quality issues
  drift         Check spec/code sync status
  inspect       Visualize project structure (alias: visualize)
  status        Show project status (alias: st, s) [default]
  --help, -h    Show this help

Examples:
  /skill:phoenix                    # Show status
  /skill:phoenix pipeline           # Full pipeline
  /skill:phoenix regen --force      # Force regeneration
  /skill:phoenix status --json      # JSON output
  /skill:phoenix plan --dry-run     # Preview planning

All options are passed through to the target skill.
`);
}
```

## Examples

**Quick status check:**
```bash
/skill:phoenix
```

**Full pipeline:**
```bash
/skill:phoenix pipeline
```

**Regenerate with force:**
```bash
/skill:phoenix regen --force
```

**Check for drift:**
```bash
/skill:phoenix drift
```

**Initialize new project:**
```bash
/skill:phoenix init
```

## Short Aliases

For even quicker typing:
- `s`, `st` → status
- `canon` → canonicalize  
- `gen` → regen
- `full` → pipeline
- `viz` → inspect

## Error Handling

```
$ /skill:phoenix foo

✖ Unknown command: foo

Did you mean?
  - init
  - ingest  
  - regen

Run /skill:phoenix --help for all commands.
```

## Prerequisites

None - this skill routes to others which check their own prerequisites.

## See Also

- Individual skills: phoenix-init, phoenix-ingest, etc.
- /skill:phoenix --help - Quick reference
