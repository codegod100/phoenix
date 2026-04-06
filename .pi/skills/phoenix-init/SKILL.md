---
name: phoenix-init
description: Initialize a new Phoenix project. Creates .phoenix/ directory structure, spec/ folder, and initial config. Use when starting a new Phoenix-managed project.
---

# Phoenix Init

Initialize a new Phoenix VCS project.

## When to Use

- Starting a new project with Phoenix version control
- Converting an existing project to Phoenix
- After `git init` but before first commit

## Usage

```bash
/skill:phoenix-init                    # Initialize in current directory
/skill:phoenix-init my-project-name    # Initialize with specific name
/skill:phoenix-init --arch bun-react   # With specific architecture
```

## What It Does

Creates the Phoenix project structure:

```
./
├── spec/
│   └── app.md              # Starter spec template
├── src/
│   └── generated/         # (created on first regen)
│       └── app/
├── .phoenix/
│   ├── .gitignore
│   ├── state.json         # Bootstrap state machine
│   ├── graphs/            # (populated by later skills)
│   │   ├── spec.json
│   │   ├── canonical.json
│   │   ├── ius.json
│   │   └── warm-hashes.json
│   ├── manifests/         # (populated by regen)
│   │   └── generated_manifest.json
│   └── store/             # (internal storage)
└── .pi-agent/             # Agent working directory
    └── .gitkeep
```

## Implementation Steps

1. **Check current directory**
   - Must not already have `.phoenix/` directory
   - If exists → error with message: "Phoenix project already initialized"

2. **Create directory structure**
   ```bash
   mkdir -p .phoenix/{graphs,manifests,store}
   mkdir -p .pi-agent
   mkdir -p spec
   mkdir -p src/generated/app/__tests__
   ```

3. **Create `.phoenix/.gitignore`**
   ```
   store/
   *.log
   ```

4. **Create `spec/app.md`** (starter template)
   ```markdown
   # Project Name
   
   Describe your project here.
   
   ## Feature A
   
   - REQUIREMENT: The system shall...
   - CONSTRAINT: Must not exceed...
   
   ## Feature B
   
   - DEFINITION: A widget is...
   - REQUIREMENT: Users can...
   ```

5. **Create `.phoenix/state.json`**
   ```json
   {
     "version": "1.0.0",
     "state": "cold",
     "last_ingest": null,
     "last_canonicalize": null,
     "last_plan": null,
     "last_regen": null
   }
   ```

6. **Show success message**
   ```
   🔥 Phoenix project initialized
   
   Next steps:
   1. Edit spec/app.md with your requirements
   2. Run /skill:phoenix-ingest to parse specs
   3. Run /skill:phoenix-canonicalize to extract requirements
   4. Run /skill:phoenix-plan to plan implementation
   5. Run /skill:phoenix-regen to generate code
   
   Or run /skill:phoenix-pipeline to do all at once.
   ```

## Error Handling

- **Directory exists**: "Phoenix project already initialized. Use /skill:phoenix-status to check state."
- **No write permissions**: "Cannot create directories. Check permissions."
- **Not a git repo**: Warn but continue ("Consider running `git init` for version control")

## Output Files

| File | Purpose |
|------|---------|
| `.phoenix/state.json` | Tracks bootstrap state |
| `.phoenix/.gitignore` | Excludes internal storage |
| `spec/app.md` | Starter specification |

## Dependencies

None. This is the first skill to run.

## See Also

- /skill:phoenix-pipeline - Run full pipeline
- /skill:phoenix-ingest - Next step after init
