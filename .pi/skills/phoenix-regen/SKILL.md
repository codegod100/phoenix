---
name: phoenix-regen
description: Language-agnostic code generator from Implementation Units. Generates RED (failing) code stubs for TDD in any language. Pluggable generator system supports TypeScript, Python, Nix, and custom languages.
---

# Phoenix Regen — Language-Agnostic Code Generator

Generate **RED** (failing) code from Implementation Units for **Test-Driven Development** in any programming language.

> **Phoenix is language-agnostic.** The pipeline generates stubs; you or an LLM implement to make them GREEN.

## Language Support

### Built-in Generators

| Language | Extension | Test Framework | Status |
|----------|-----------|----------------|--------|
| **TypeScript** | `.ts` | Vitest | ✅ |
| **Python** | `.py` | pytest | ✅ |
| **Nix** | `.nix` | nix-build | ✅ |

### Easy to Add

Create custom generators for: Rust, Go, Java, Kotlin, Swift, Ruby, Elixir, Haskell, etc.

## How It Works

```
Implementation Unit (IU)
    ↓
Detect/Select Language
    ↓
Load Generator
    ↓
Generate RED Code (intentionally wrong)
    ↓
Tests FAIL (RED)
    ↓
You or LLM implements
    ↓
Tests PASS (GREEN)
    ↓
Evidence validates
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

# Force Nix
node .pi/skills/phoenix-regen/regen.js --lang=nix

# Force TypeScript (default)
node .pi/skills/phoenix-regen/regen.js --lang=typescript
```

### List Available Generators

```bash
node .pi/skills/phoenix-regen/regen.js --list-languages
```

## Language Detection Order

1. **IU's `target_language` field** — explicit per-IU override
2. **Project config** — `.phoenix/config.json` `targetLanguage`
3. **Existing file extensions** — detect from `iu.output_path`
4. **Default** — `typescript`

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
  "outputDir": "src"
}
```

## Generated Output Structure

### TypeScript (Default)

```
src/generated/
├── domain/
│   ├── index.ts           # Implementation with RED stubs
│   └── __tests__/
│       └── index.test.ts  # Failing tests
```

### Python

```
src/
├── domain.py              # Implementation with RED stubs
└── test_domain.py         # Failing tests (pytest)
```

### Nix

```
./
├── domain.nix             # Nix expression with RED stubs
└── domain.test.nix        # Nix build tests
```

## RED Code Philosophy

Every generated function is **intentionally wrong**:

```typescript
// 🔴 RED: Always returns false (will fail "should return true" test)
export function validate(item: Item): boolean {
  return false;
}

// 🔴 RED: Returns input unchanged (will fail "should transform" test)
export function process(item: Item): Item {
  return item; // No transformation!
}
```

**Why?** TDD requires tests to fail first. RED proves the tests work.

## Creating Custom Generators

Create a file at `.phoenix/generators/<name>.js`:

```javascript
// .phoenix/generators/rust.js

export function generateImpl(iu, config) {
  const name = toSnakeCase(iu.name);

  return `
// 🔴 RED: ${iu.name}
pub struct ${toPascalCase(iu.name)} {
    id: String,
}

// 🔴 RED: Wrong implementation
pub fn process(item: &${toPascalCase(iu.name)}) -> ${toPascalCase(iu.name)} {
    item.clone() // ← Returns unchanged
}

// Traceability
pub const _phoenix: PhoenixMeta = PhoenixMeta {
    iu_id: "${iu.id}",
    name: "${iu.name}",
    risk_tier: "${iu.risk_tier}",
};
`;
}

export function generateTests(iu, implPath) {
  return `
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_transforms() {
        let input = Item { id: "123".to_string() };
        let result = process(&input);
        // 🔴 This FAILS — process returns unchanged
        assert_ne!(result.id, input.id);
    }
}
`;
}

export function getFileExtension() {
  return '.rs';
}

export function getTestFilePattern() {
  return { suffix: '_test.rs', subdir: 'tests' };
}
```

### Generator Interface

Every generator must export:

| Function | Returns | Purpose |
|----------|---------|---------|
| `generateImpl(iu, config)` | `string` | RED implementation code |
| `generateTests(iu, implPath)` | `string` | Failing test code |
| `getFileExtension()` | `string` | File extension (e.g., `.rs`) |
| `getTestFilePattern()` | `object\|string` | Test file naming convention |

### Test File Pattern Format

```javascript
// With subdirectory (TypeScript-style)
{ suffix: '.test.ts', subdir: '__tests__' }
// → src/generated/domain/__tests__/index.test.ts

// With prefix (Python-style)
{ prefix: 'test_', suffix: '.py', subdir: null }
// → src/test_domain.py

// Simple suffix only
'.test.rs'
// → src/generated/domain.test.rs
```

## Traceability

Every generated file includes VCS metadata:

### TypeScript
```typescript
export const _phoenix = {
  iu_id: 'ec4737a7...',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

### Python
```python
_phoenix = {
    "iu_id": "ec4737a7...",
    "name": "Dashboard Page",
    "risk_tier": "high",
}
```

### Nix
```nix
_phoenix = {
  iu_id = "ec4737a7...";
  name = "Dashboard Page";
  risk_tier = "high";
};
```

## Manifest Updates

Records generated artifacts with language info:

```json
{
  "files": {
    "ec4737a7...": {
      "impl": {
        "path": "src/generated/flake.nix",
        "hash": "a1b2c3d4...",
        "language": "nix"
      },
      "test": {
        "path": "src/generated/flake.test.nix",
        "hash": "e5f6g7h8...",
        "language": "nix"
      }
    }
  }
}
```

## Selective Regeneration

When specs change, only affected IUs regenerate:

```bash
# Check which IUs need regeneration
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4

# Only regenerate affected IUs (preserves implementations in others)
node .pi/skills/phoenix-regen/regen.js IU-a1b2c3d4
```

## Quality Gates (Evidence Phase)

Regen generates RED code. Evidence validates GREEN:

| Tier | Required Evidence |
|------|-------------------|
| low | typecheck, lint, boundary |
| medium | + unit_tests |
| high | + property_tests |
| critical | + static_analysis, human_signoff |

Evidence collection runs in `phoenix-evidence`.

## Examples

### Generate Nix Flake

```bash
# Set language to nix
node .pi/skills/phoenix-regen/regen.js examples/nix --lang=nix

# Output: src/generated/flake.nix (RED stub)
# Output: src/generated/flake.test.nix (failing test)
```

### Generate Python Module

```bash
node .pi/skills/phoenix-regen/regen.js examples/ml --lang=python

# Output: src/model.py
# Output: test_model.py
```

## Next Steps

After regen:

1. **See RED**: Run tests to verify they fail
2. **Implement**: Fix RED stubs (you or LLM)
3. **See GREEN**: Re-run tests to verify they pass
4. **Evidence**: Run `node .pi/skills/phoenix-evidence/evidence.js .`
5. **Audit**: Run `node .pi/skills/phoenix-audit/audit.js`

## Troubleshooting

### Unknown Language Error

```
Unknown language: rust
No generator found for 'rust'.
```

**Fix**: Create `.phoenix/generators/rust.js` or use built-in language.

### Generator Missing Function

```
Generator for 'python' is missing required functions: generateTests
```

**Fix**: Ensure generator exports all required functions.

## Language-Specific Notes

### TypeScript
- Uses Vitest for tests
- Generates interfaces for types
- ESM output with `.js` imports

### Python
- Uses pytest for tests
- Generates dataclasses for types
- snake_case naming convention

### Nix
- Uses nix-build for "tests"
- Generates attribute sets for types
- kebab-case file naming
