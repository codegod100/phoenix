# 🐦 Phoenix Skills Extension

A pi extension that adds a `/phoenix` command to browse and run project-specific skills.

## Installation

The extension is already installed in this project at `.pi/extensions/phoenix.ts`. It will be auto-discovered when you run pi in this directory.

## Usage

### Browse Skills
```
/phoenix
```
Shows an interactive selector with all available Phoenix skills, grouped by:
- 📁 Project Skills (from `.pi/skills/`)
- 🌐 Global Skills (from `~/.pi/agent/skills/`)

### Run a Specific Skill
```
/phoenix:skill-name
```
Runs the skill directly without showing the selector.

### List All Skills
```
/phoenix:list
```
Displays all skills in the chat with their descriptions and paths.

## Available Skills

| Skill | Description |
|-------|-------------|
| `project-review` | Review project structure and provide feedback |
| `code-quality` | Analyze code for anti-patterns and issues |
| `test-coverage` | Identify gaps in test coverage |
| `docs-check` | Verify documentation completeness |

## Creating New Skills

Create a new directory in `.pi/skills/` with a `SKILL.md` file:

```
.pi/skills/
└── my-skill/
    └── SKILL.md
```

The `SKILL.md` must have frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

## Overview
Brief explanation...

## Steps
1. Do this
2. Do that

## Output Format
What to produce...
```

## How It Works

1. **Discovery**: The extension scans `.pi/skills/` and `.agents/skills/` directories
2. **Caching**: Skills are cached per session (use "Refresh skill list" to reload)
3. **Execution**: When you select a skill, its content is sent as a user message to the agent
4. **Progressive Disclosure**: The agent receives the full skill content and follows its instructions
