# Phoenix VCS - Justfile
# Use source directly (no build needed)

# Default recipe - show available commands
default:
    @just --list

# Run phoenix from source (no build required)
phoenix *args:
    bun run src/cli.ts {{args}}

# Run phoenix dev mode with hot reload
dev *args:
    bun run --watch src/cli.ts {{args}}

# Build phoenix (only needed for distribution)
build:
    bun build ./src/index.ts ./src/cli.ts --outdir=dist --target=bun

# Run tests
test:
    bunx vitest run

# Type check
typecheck:
    tsc --noEmit

# Bootstrap a project (from source)
bootstrap project-dir:
    bun run src/cli.ts bootstrap {{project-dir}}

# Regenerate code (from source)
regen project-dir:
    bun run src/cli.ts regen {{project-dir}}

# Promote drift to spec (from source)
promote project-dir:
    bun run src/cli.ts promote {{project-dir}}

# Check status (from source)
status project-dir:
    bun run src/cli.ts status {{project-dir}}

# Alias: pi (from source)
pi *args:
    bun run src/cli.ts {{args}}
