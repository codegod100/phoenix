# Phoenix VCS - Justfile
# Use source directly (no build needed)

# Get the directory where this justfile is located
export JUSTFILE_DIR := justfile_directory()

# Get the directory where just was invoked from (project root)
export PROJECT_DIR := invocation_directory()

# Default recipe - show available commands
default:
    @just --list

# Run phoenix from source (no build required)
phoenix *args:
    bun run {{JUSTFILE_DIR}}/src/cli.ts {{args}}

# Run phoenix dev mode with hot reload
dev *args:
    bun run --watch {{JUSTFILE_DIR}}/src/cli.ts {{args}}

# Build phoenix (only needed for distribution)
build:
    bun build {{JUSTFILE_DIR}}/src/index.ts {{JUSTFILE_DIR}}/src/cli.ts --outdir=dist --target=bun

# Run tests
test:
    bunx vitest run

# Type check
typecheck:
    tsc --noEmit

# Bootstrap a project (from source)
bootstrap project-dir:
    bun run {{JUSTFILE_DIR}}/src/cli.ts bootstrap {{project-dir}}

# Regenerate code (from source)
regen project-dir:
    bun run {{JUSTFILE_DIR}}/src/cli.ts regen {{project-dir}}

# Promote drift to spec (from source)
promote project-dir:
    bun run {{JUSTFILE_DIR}}/src/cli.ts promote {{project-dir}}

# Check status (from source)
status project-dir:
    bun run {{JUSTFILE_DIR}}/src/cli.ts status {{project-dir}}

# Alias: pi (from source)
pi *args:
    bun run {{JUSTFILE_DIR}}/src/cli.ts {{args}}

# ============================================================================
# PROJECT COMMANDS (run from within a project folder)
# ============================================================================

# Phoenix Pipeline - uses the folder you ran just from
prep:
    @echo "Running prep on: $(basename {{PROJECT_DIR}})"
    @cd {{PROJECT_DIR}} && bun run {{JUSTFILE_DIR}}/src/cli.ts ingest spec/app.md
    @cd {{PROJECT_DIR}} && bun run {{JUSTFILE_DIR}}/src/cli.ts canonicalize .
    @cd {{PROJECT_DIR}} && bun run {{JUSTFILE_DIR}}/src/cli.ts plan .
    @echo "✅ Prep complete at {{PROJECT_DIR}}/.phoenix/graphs/ius.json"

# Regenerate code for current project (run from project directory)
regen:
    @echo "Regenerating code for: $(basename {{PROJECT_DIR}})"
    @cd {{PROJECT_DIR}} && bun run {{JUSTFILE_DIR}}/src/cli.ts regen .
    @echo "✅ Regen complete"

# Health check for current project
health:
    @cd {{PROJECT_DIR}} && bun test

# Provenance trace for IU
provenance IU="":
    @cat {{PROJECT_DIR}}/.phoenix/graphs/ius.json 2>/dev/null | jq --arg iu "{{IU}}" '.[] | select(.iu_id | contains($iu)) | {name, iu_id}' || echo "No IU graph. Run: just prep"

# Show project status
project-status:
    @echo "Project: $(basename {{PROJECT_DIR}})"
    @echo "Path:    {{PROJECT_DIR}}"
    @ls -la {{PROJECT_DIR}}/.phoenix/graphs/ 2>/dev/null || echo "❌ No IU graph yet. Run: just prep"
