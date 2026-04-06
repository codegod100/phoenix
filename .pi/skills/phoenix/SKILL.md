---
name: phoenix
description: Universal Phoenix command router. Maps commands to specific Phoenix skills.
---

# Phoenix

Universal entry point for Phoenix operations.

## Command Map

| Command | Skill | Description |
|---------|-------|-------------|
| `init` | phoenix-init | Initialize project |
| `ingest` | phoenix-ingest | Read specs |
| `canonicalize` | phoenix-canonicalize | Extract requirements |
| `plan` | phoenix-plan | Create IUs |
| `regen` | phoenix-regen | Generate code |
| `pipeline` | phoenix-pipeline | Run all phases |
| `audit` | phoenix-audit | Check quality |
| `drift` | phoenix-drift | Check sync |
| `inspect` | phoenix-inspect | Visualize |
| `status` | phoenix-status | Show state |
| `constraints` | phoenix-constraint-review | Review specs |

## Usage

Since this is agent-skills only:

1. **Read the skill** that matches your need
2. **Follow the steps** in that skill
3. **Execute manually** (read, write, edit files)

## Example

```
User: /skill:phoenix pipeline

Agent reads: phoenix-pipeline/SKILL.md

Agent executes:
  [Ingest] Read spec/ files
  [Canonicalize] Extract requirements
  [Plan] Create IUs
  [Regen] Generate code
```

## Pipeline Flow

```
spec/*.md → Ingest → Canonicalize → Plan → Regen → Code
```

## Quick Reference

```
/skill:phoenix init          # New project
/skill:phoenix ingest        # Read specs
/skill:phoenix canonicalize  # Clean requirements
/skill:phoenix plan          # Create IUs
/skill:phoenix regen         # Generate code
/skill:phoenix pipeline      # Full flow
/skill:phoenix status        # Check state
/skill:phoenix audit         # Quality check
```
