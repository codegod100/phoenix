---
name: phoenix-codegen
description: Language-aware code generation orchestrator. Detects language from context, applies ThIU → ThLang theory morphism, generates language-specific instructions for agent.
---

# Phoenix Codegen

**Language-aware orchestrator** with theory morphisms.

## Philosophy

The skill does NOT generate code directly. Instead:
1. **Detects** implementation language from project context
2. **Selects** appropriate theory lens (ThIU → ThLang)
3. **Applies** theory morphism to map IU constructs to language patterns
4. **Generates** language-specific instruction for agent

## Supported Languages

| Variant | Detected By | Theory Lens |
|---------|-------------|-------------|
| `typescript-web` | package.json + dashboard/modal in spec | ThIU → ThTypeScriptWeb |
| `typescript-api` | package.json (no web deps) | ThIU → ThTypeScriptAPI |
| `python-fastapi` | requirements.txt / pyproject.toml | ThIU → ThPythonFastAPI |
| `rust-axum` | Cargo.toml | ThIU → ThRustAxum |
| `nix` | flake.nix | ThIU → ThNix |

## Pipeline Position

```
ingest → canonicalize → plan → protolens → [CODEGEN] → evidence → audit → drift
                                      ↓
                              language detection
                              theory morphism
                              instruction generation
```

## Usage

```bash
node .pi/skills/phoenix-codegen/codegen.js <project-path>
```

## How It Works

### 1. Language Detection

```javascript
const lang = detectLanguage(projectPath, canonical, ius);
// Returns: 'typescript-web', 'python-fastapi', etc.
```

Detection order:
1. Check for `package.json` → TypeScript
2. Check for `Cargo.toml` → Rust  
3. Check for `requirements.txt` → Python
4. Check for `flake.nix` → Nix
5. Fallback based on canonical (dashboard → web)

### 2. Theory Morphism (ThIU → ThLang)

Each language has a lens that maps:

```
ThIU                  ThTypeScriptWeb
────────────────────  ────────────────────────
IU Export             Function signature
  "archive"     →     export async function archive(): Promise<Task>

IU Risk Tier          Async pattern
  "high"        →     async function with Promise<T>

Canonical Constraint  Implementation pattern
  "autocompleteoff" → autocomplete="off" attribute
  "Enter key"   →     keydown handler
```

### 3. Generated Artifacts

**`codegen-instruction.md`** - Agent instruction with:
- Language context (TypeScript, Python, etc.)
- IU → Function mappings
- Constraint → Implementation mappings
- File structure guidance

**`language-theory.json`** - Machine-readable theory mapping:
```json
{
  "language": "typescript-web",
  "iuMappings": [
    {
      "name": "Archive Domain",
      "functions": [
        {
          "name": "archiveTask",
          "signature": "export async function archiveTask(id: string): Promise<Task>",
          "isAsync": true
        }
      ],
      "components": {
        "form": false,
        "buttons": ["archive"],
        "list": false
      }
    }
  ]
}
```

## Example: TypeScript Web

Given IU:
```json
{
  "name": "Edit Domain",
  "boundary": { "exports": ["edit", "save"] },
  "risk_tier": "high"
}
```

Theory morphism produces:
```typescript
// Function signatures
export async function edit(id: string): Promise<Task>;
export async function save(data: TaskData): Promise<Task>;

// UI components detected
Form: true      // has "edit" or "save"
Buttons: []     
List: false
```

## Agent Instruction Structure

```markdown
# Phoenix Code Generation Instruction

## Language Context
**Detected Language:** TypeScript (Web)
**Module System:** esm

## Theory Mapping (ThIU → ThTypeScriptWeb)

### IU → Language Function Mapping
- Edit Domain (high):
    - async edit(): Promise<any>
    - async save(): Promise<any>

### Constraint → Implementation Mapping
- "autocompleteoff attribute" → autocomplete="off" on inputs
- "Enter key submits form" → keydown event listener

## Deliverable Structure
**Server Framework:** Node.js native http
**UI Pattern:** inline HTML/JS
**State Management:** in-memory Map
```

## "Draw The Rest Of The Owl"

```
Pipeline Artifacts    Language      Theory Morphism    Agent
      │                 │                │               │
      ▼                 ▼                ▼               ▼
┌──────────────┐   ┌────────┐      ┌──────────┐   ┌─────────┐
│ canonical    │   │ Detect │      │ Apply    │   │ Agent   │
│ requirements │──▶│ lang   │─────▶│ lens     │──▶│ reads   │
└──────────────┘   └────────┘      └──────────┘   │ theory  │
┌──────────────┐   ┌────────┐      ┌──────────┐   │ &       │
│ IU exports   │   │ Select │      │ Map to   │   │ generates│
└──────────────┘   │ lens   │      │ lang     │   │ code    │
                   └────────┘      │ patterns │   └─────────┘
                                    └──────────┘
```

## Adding New Languages

Add to `language-registry.js`:

```javascript
export const LanguageVariant = {
  // ... existing
  GO_STD: 'go-std',
};

export const LanguageLenses = {
  [LanguageVariant.GO_STD]: {
    name: 'Go (std)',
    extension: '.go',
    moduleSystem: 'go-modules',
    
    iuToLang: {
      function: (exportName) => ({
        signature: `func ${exportName}(input Input) (Output, error)`,
      }),
      // ...
    },
    
    fileStructure: {
      iuDir: (domain) => `${domain}`,
      iuIndex: 'index.go',
      deliverableDir: 'cmd',
      serverFile: 'main.go',
    },
    
    constraints: {
      'error handling': 'return (T, error) pattern',
    },
  },
};
```

## No Templates, Just Theory

❌ No hardcoded HTML in skill  
❌ No language-specific logic in skill  
❌ No file templates  

✅ Pure theory mapping  
✅ Language detection from context  
✅ Agent generates from theory  

The skill is a **theory morphism engine**, not a code generator.
