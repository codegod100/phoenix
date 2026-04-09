---
name: phoenix-regen
description: Language-agnostic code generator from Implementation Units using theory morphisms. Generates clean implementations with automatic logging injection.
---

# Phoenix Regen — Theory-Driven Code Generator

Generate **clean implementations** from Implementation Units using **theory morphisms** (ThIU → ThLang → ThCode).

> **Phoenix is language-agnostic.** Theory morphisms map IU constructs to language-specific patterns with automatic logging injection.

## Language Support

### Built-in Generators

| Language | Extension | Status |
|----------|-----------|--------|
| **Python** | `.py` | ✅ |
| **TypeScript** | `.ts` | ✅ |
| **Nix** | `.nix` | ✅ |
| **Rust** | `.rs` | 🚧 |
| **Go** | `.go` | 🚧 |

### Easy to Add

Create custom generators for: Java, Kotlin, Swift, Ruby, Elixir, Haskell, etc.

## How It Works

```
Implementation Unit (IU)
    ↓
Detect/Select Language
    ↓
Load Generator with Theory Lens
    ↓
Apply Theory Morphism (ThIU → ThLang → ThCode)
    ↓
Generate Clean Code with Auto-Logging
    ↓
Code Ready for Use
```

## Theory Morphism Chain

```
ThSpec ──[μ_ingest]──► ThClause ──[μ_canon]──► ThCanon ──[μ_plan]──► ThIU
                                                                           ↓
ThCode ◄──[μ_codegen]────────────────────────────────────────────────────────┘
      ↓
[ThLog Injection] ←── from codegen instruction
      ↓
Generated Code (with logging)
```

## Usage

### Basic (Auto-Detect Language)

```bash
# Regenerate all IUs with auto-detected language
node .pi/skills/phoenix-regen/regen.js

# Regenerate specific IU
node .pi/skills/phoenix-regen/regen.js IU-ec4737a7
```

### Force Language

```bash
# Force Python for all IUs
node .pi/skills/phoenix-regen/regen.js --lang=python

# Force TypeScript
node .pi/skills/phoenix-regen/regen.js --lang=typescript

# Force Nix
node .pi/skills/phoenix-regen/regen.js --lang=nix
```

### List Available Generators

```bash
node .pi/skills/phoenix-regen/regen.js --list-languages
```

## Language Detection Order

1. **IU's `target_language` field** — explicit per-IU override
2. **Project config** — `.phoenix/config.json` `targetLanguage`
3. **Existing file extensions** — detect from `iu.output_path`
4. **Default** — `python` (for Textual TUI projects)

## Per-IU Language Configuration

Set language in the IU definition (from plan phase):

```json
{
  "iu_id": "a1b2c3d4...",
  "name": "Nix Flake Domain",
  "target_language": "nix",
  "output_path": "flake.nix"
}
```

## Project-Wide Language Configuration

Create `.phoenix/config.json`:

```json
{
  "targetLanguage": "python",
  "outputDir": "src/generated"
}
```

## Generated Output Structure

### Python (Textual TUI)

```
src/generated/
├── __init__.py           # Module exports
├── models.py             # @dataclass models
├── app.py                # Main Textual App
└── widgets/              # Textual widgets
    ├── __init__.py
    ├── sidebar.py
    ├── message_list.py
    └── ...
```

### TypeScript

```
src/generated/
├── models.ts             # Interface definitions
├── app.ts                # Main application
└── components/           # UI components
    ├── index.ts
    └── ...
```

### Nix

```
./
├── flake.nix             # Nix flake
└── ...
```

## Clean Code Philosophy

Every generated function is a **clean implementation skeleton**:

```python
# ✅ CLEAN: Proper structure with auto-injected logging
def on_auth_screen_auth_completed(self, event: AuthCompleted) -> None:
    # @phoenix-canon: node-2c760e46
    logger.info(f"[AUTH] AuthCompleted received for handle={event.handle}")
    
    # 1. Update session state
    self.app_state.session.handle = event.handle
    self.app_state.session.did = event.did
    self.app_state.session.authenticated = True
    logger.info(f"[AUTH] Session authenticated: handle={event.handle}")
    
    # TODO: Implement remaining logic
    pass
```

**Features:**
- Complete function signatures from IU boundary exports
- Auto-injected logging (from ThLog morphism)
- Traceability comments (`# @phoenix-canon: node-xxx`)
- Structured TODOs for unimplemented logic
- Phoenix VCS identity block

### Function Generation from Boundary Exports

When the plan phase extracts operations from requirements (populating `iu.boundary.exports`), the generator creates specific function stubs matching those names:

```json
// IU with boundary exports
{
  "boundary": {
    "exports": ["queryData", "filterByStatus", "validateInput"]
  }
}
```

Generates:

```python
# ✅ CLEAN: queryData - extracted from "provide function to query data"
def query_data(self, query: str) -> List[Data]:
    """Query data from storage.
    
    REQUIREMENT: The system MUST provide function to query data.
    """
    # @phoenix-canon: node-xxx
    logger.info(f"[IO] query_data called with query={query}")
    # TODO: Implement query logic
    return []
```

**Benefit:** Functions are named exactly as requirements specify, creating explicit traceability from spec text → function name → implementation.

## Automatic Logging Injection

The generator reads the `codegen-instruction.md` and injects logging requirements:

### Log Prefix Standards (Auto-Injected)

| Prefix | Domain | Example |
|--------|--------|---------|
| `[AUTH]` | Authentication | `logger.info(f"[AUTH] User {handle} authenticated")` |
| `[AUTH-MOUNT]` | Auto-login | `logger.info("[AUTH-MOUNT] Auto-login complete")` |
| `[UI]` | UI rendering | `logger.info("[UI] Composing sidebar layout")` |
| `[MOUNT]` | Lifecycle | `logger.info("[MOUNT] Widget initialized")` |
| `[REACTIVE]` | State changes | `logger.info("[REACTIVE] buffers changed")` |
| `[EVENT]` | Event handling | `logger.info("[EVENT] AuthCompleted received")` |
| `[BROKER]` | Broker comms | `logger.info("[BROKER] Message sent")` |
| `[IO]` | File/network | `logger.info("[IO] Saved to {path}")` |
| `[STATE]` | App state | `logger.info("[STATE] Connected")` |

### Example Auto-Injected Logging

```python
def on_mount(self):
    # @phoenix-canon: node-0a5f52d4
    logger.info("[MOUNT] Starting on_mount initialization")
    
    saved_creds = self.load_saved_credentials()
    logger.info(f"[AUTH-MOUNT] load_saved_credentials returned: {saved_creds is not None}")
    
    if saved_creds:
        logger.info("[AUTH-MOUNT] Saved credentials found, attempting auto-login")
        self.app_state.session.authenticated = True
        logger.info(f"[AUTH-MOUNT] Session set: handle={saved_creds.get('handle')}, auth=True")
        # ...
        logger.info("[AUTH-MOUNT] Auto-login complete, main UI should be visible")
```

## Creating Custom Generators

Create a file at `.phoenix/generators/<name>.js`:

```javascript
// .phoenix/generators/rust.js

export function generateImpl(iu, config) {
  const name = toSnakeCase(iu.name);

  return `
// ✅ CLEAN: ${iu.name}
pub struct ${toPascalCase(iu.name)} {
    id: String,
    // TODO: Add fields from IU requirements
}

impl ${toPascalCase(iu.name)} {
    pub fn new(id: &str) -> Self {
        log::info!("[MOUNT] Creating new {}", "${iu.name}");
        Self {
            id: id.to_string(),
        }
    }
    
    // TODO: Implement methods from IU boundary exports
}
`;
}

export function getFileExtension() {
  return '.rs';
}

export function getTestFilePattern() {
  return { prefix: 'test_', suffix: '.rs' };
}
```

Register in `.phoenix/config.json`:

```json
{
  "generators": {
    "rust": "./generators/rust.js"
  }
}
```

## Traceability

Every generated file includes Phoenix VCS identity:

```python
# === PHOENIX VCS TRACEABILITY ===
# DO NOT REMOVE — Required for VCS tracking
_phoenix = {
    "iu_id": "ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88",
    "name": "Dashboard Page",
    "risk_tier": "high",
    "generated_at": "2026-01-09T12:34:56Z",
}
```

The `_phoenix` object enables:
- **Drift detection**: Compare generated vs. actual code
- **Impact analysis**: Find code affected by spec changes
- **Version tracking**: Know which IU generated each file

## Evidence Integration

After implementing the generated stubs:

```bash
# Run evidence collection
node .pi/skills/phoenix-evidence/evidence.js ./my-project

# Evidence validates:
# - All IUs have corresponding code
# - Tests exist (if configured)
# - Traceability comments present
```

## Workflow

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   SPEC       │   │   CANON      │   │     IU       │   │    CODE      │
│  (Markdown)  │──▶│  (Nodes)     │──▶│  (Exports)   │──▶│  (Generated) │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
   μ_ingest          μ_canon           μ_plan          μ_codegen
                                                      + μ_log_inject
```

1. **Write spec** → Requirements in Markdown
2. **Run pipeline** → μ_ingest → μ_canon → μ_plan → μ_codegen + μ_log_inject
3. **Regenerate** → Clean code with auto-logging
4. **Implement** → Fill in TODO sections
5. **Collect evidence** → Validate implementation
6. **Drift check** → Ensure spec/code alignment

## Philosophy

> **Theory morphisms drive code generation.**
>
> ThIU (Implementation Units) → ThLang (Language constructs) → ThCode (Generated code) + ThLog (Auto-injected logging)
>
> Not TDD. Not RED stubs. Clean, traceable, loggable code from the start.

---

## Migration from TDD/RED Mode

If you have existing RED-generated code:

1. The new generator will preserve your implementations
2. Logging will be added to new/modified methods
3. Run drift detection to find gaps
4. Regenerate to fill missing implementations
