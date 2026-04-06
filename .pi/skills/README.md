# Phoenix Skills - Project Version

Phoenix VCS skill suite - version controlled with the project.

## Location

These skills are in `.pi/skills/` and travel with the repo.

## Available Skills

```bash
/skill:phoenix-init        # Initialize Phoenix project
/skill:phoenix-ingest      # Parse spec files
/skill:phoenix-canonicalize # Extract canonical requirements
/skill:phoenix-plan        # Plan Implementation Units
/skill:phoenix-regen       # Generate code from IUs
/skill:phoenix-pipeline    # Run full pipeline
/skill:phoenix-status      # Check pipeline state
/skill:phoenix-drift       # Detect drift
/skill:phoenix-audit       # Audit IU quality
/skill:phoenix-inspect     # Generate HTML report
```

## Quick Start

```bash
# From project root:
/skill:phoenix-pipeline
```

## Skill Files

| Skill | Path |
|-------|------|
| phoenix-init | `.pi/skills/phoenix-init/SKILL.md` |
| phoenix-ingest | `.pi/skills/phoenix-ingest/SKILL.md` |
| phoenix-canonicalize | `.pi/skills/phoenix-canonicalize/SKILL.md` |
| phoenix-plan | `.pi/skills/phoenix-plan/SKILL.md` |
| phoenix-regen | `.pi/skills/phoenix-regen/SKILL.md` |
| phoenix-pipeline | `.pi/skills/phoenix-pipeline/SKILL.md` |
| phoenix-status | `.pi/skills/phoenix-status/SKILL.md` |
| phoenix-drift | `.pi/skills/phoenix-drift/SKILL.md` |
| phoenix-audit | `.pi/skills/phoenix-audit/SKILL.md` |
| phoenix-inspect | `.pi/skills/phoenix-inspect/SKILL.md` |
| phoenix-utils | `.pi/skills/phoenix-utils/` |

## Shared Utilities

The `phoenix-utils` skill provides:
- `lib/types.ts` - TypeScript interfaces
- `lib/helpers.ts` - I/O, hashing, project detection
- `lib/prompts.ts` - LLM prompt templates

Other skills reference these via relative paths.

## Documentation

- `PHOENIX_INDEX.md` - Full skill suite overview

## Git Tracking

Add to `.gitignore` if you don't want skills versioned:
```
.pi/skills/
```

Or keep them tracked to share with the team.
