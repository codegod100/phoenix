# AI Agent Guidelines

## Debugging Philosophy

### Read Source, Write Tests - Don't Explore Via Code
**NEVER debug by iteratively modifying code and running it.**

When something doesn't work:
1. **READ** the upstream source code (tree-sitter grammar, library implementation, etc.)
2. **UNDERSTAND** the data structures and APIs being used
3. **WRITE** a comprehensive test suite that covers edge cases
4. **THEN** implement the fix based on understanding

**Anti-pattern:** Adding print statements, changing code randomly, running to see what happens, repeating.

**Why this matters:**
- Exploratory coding creates messy git history
- Wastes time on compile-run cycles
- Often misses root cause, creating brittle fixes
- Technical debt from "temporary" debug code

**Example - Parser issue:**
- ❌ BAD: "Let me add debug prints and see what node types appear"
- ✅ GOOD: "Let me read tree-sitter-nickel's grammar.js to understand how arrays are structured, then write tests for both array and record formats"

### Verify Before Blaming Libraries
**TRIPLE CHECK before claiming a library has a bug.**

When something doesn't work as expected:
1. First assume YOUR code is wrong
2. Check your understanding of the library's API/syntax  
3. Write tests to verify your understanding
4. Only after exhaustive verification, consider library issues

**Common mistakes:**
- Assuming parser bug when it's actually syntax misunderstanding
- Claiming tokenizer issue when it's delimiter confusion  
- Blaming AST structure when traversal logic is wrong

**Remember:** Mature libraries like tree-sitter, nickel-lang-core, etc. have been battle-tested. The bug is almost certainly in your code.

### Test Coverage Before Fixes
**Write comprehensive tests BEFORE attempting fixes.**

For any parsing or transformation code:
1. Create test cases covering all input formats
2. Include edge cases (empty, nested, malformed)
3. Verify tests fail with current code
4. Implement fix to make tests pass
5. Refactor while keeping tests green

**Target:** >90% code coverage for parser logic, 100% for critical paths.

## Build Commands

### Rust Development
- **NEVER** use `cargo build --release` - always use debug mode
- **ALWAYS** use `nix develop` to enter the development shell before building
- Example workflow:
  ```bash
  nix develop
  cargo build
  ```

### Running Phoenix
- Debug binary: `./target/debug/phoenix-vcs`
- Pipeline: `./target/debug/phoenix-vcs pipeline`
- Direct run: `cargo run -- <args>` (within nix develop)

## Code Organization

### Module Structure
- `src/lib.rs` - Library exports (must declare all pub mods)
- `src/main.rs` - Binary entry point
- `src/cli.rs` - CLI implementation and subcommands
- `src/spec.rs` - Spec parsing and validation
- `src/ncl.rs` - Nickel/NCL parser
- `src/pipeline.rs` - Code generation pipeline

## Code Generation Rules

### Flake Generation
- Templates are in `src/cli.rs` (`generate_flake_from_config`)
- **NEVER** manually edit generated `flake.nix` files
- Fix templates in Phoenix, regenerate by running pipeline

### Spec-Driven Configuration
- **NEVER** put application-specific logic in Phoenix VCS code
- All app-specific build configuration belongs in the project's `.ncl` spec file
- Use spec fields: `pre_build`, `install_phase`, `cargo_subdir`, `extra_nix`, etc.
- Phoenix templates should be generic; projects configure via their `flake = { ... }` section

### Spec Schema
When adding new spec fields:
1. Add to `ParsedNcl` struct in `src/ncl.rs`
2. Add extraction function in `src/ncl.rs`
3. Add to `Spec` struct in `src/spec.rs` if needed
4. Update conversion in `convert_parsed_ncl`

## Nix Build Types

Template supports in `generate_flake_from_config`:
- `python` - `buildPythonApplication` with hatchling
- `rust` - `buildRustPackage`
- `pyo3` / `maturin` - `buildPythonPackage` with maturin

**Important**: maturin builds need `format = "pyproject"` not `pyproject = true`

## Error Handling Philosophy

- **NEVER** use workarounds, hacks, or temporary fixes - solve the root cause properly
- **NEVER** use fallbacks or placeholder implementations - fail hard with clear errors
- Fail fast with clear errors - no placeholders
- Invalid configs should error, not use defaults
- Example: Unknown `build_type` → error, not placeholder script
- Better to error out than produce broken/placeholder code

## LLM Code Generation Guidelines

### Fix Inputs and Prompts, Not Outputs

**NEVER post-process or patch LLM-generated code.**

When the LLM produces incorrect code (e.g., wrong imports, bad syntax):
1. **DO NOT** add regex replacements or string patching
2. **DO NOT** add "fixup" functions that mutate generated code
3. **DO** improve the prompt template to be clearer
4. **DO** add more examples in the template showing correct patterns
5. **DO** verify the template's `llm_prompt` field is being extracted correctly
6. **DO** add validation that fails if output doesn't meet requirements

**Why:** Post-processing creates technical debt and masks the real problem. The LLM will keep making the same mistakes in other contexts. Fix the root cause by improving inputs.

**Example - Textual imports:**
- ❌ BAD: `code.replace("from textual.widgets import Container", "...")`
- ✅ GOOD: Strengthen the prompt template with explicit rules and examples

## Spec Schema Requirements

Spec files define WHAT to build, not HOW. Output files are generated by the IU theory, not declared in specs.

### Requirements Section

Minimal requirement definition - only two fields required:

```nickel
requirements = [
  {
    description = "Display a simple interactive interface in the terminal",
    protocol = "UI",
  },
]
```

**Required fields:**
- `description` - What the system must do
- `protocol` - Domain/protocol this requirement belongs to

**NOT required:**
- `id` - auto-generated from description hash if needed
- `priority` - defaults to "must", IU theory determines ordering

### No Output Declarations

Specs do NOT declare output files. The IU (Implementation Unit) theory generates output paths from:
- Protocol name (e.g., "UI" → src/ui/)
- Language inference from protocol
- Canon decomposition rules

**DON'T:**
```nickel
design = {
  outputs = [
    { path = "src/app.py", language = "python" },  # WRONG
  ],
}
```

**DO:**
```nickel
{
  requirements = [
    { description = "...", protocol = "UI" },
  ],
  # No design.outputs - IU theory generates these
}
```

### Template Selection (REQUIRED)

**ALWAYS be explicit about template selection. NEVER infer from requirements.**

Templates define HOW code is generated. The spec MUST declare which template to use:

```nickel
{
  # Explicit template selection - REQUIRED
  template = "python-textual",  # or "python-flask", "rust", etc.
  
  # Alternative: explicit build_type with template inference
  build_type = "python",  # Uses templates/python.ncl
  
  requirements = [
    { description = "...", protocol = "UI" },
  ],
}
```

**Available templates:**
- `python-textual` - Terminal UI with Textual framework
- `python-flask` - Web API with Flask framework
- `python` - Generic Python (requires explicit dependencies)
- `rust` - Rust application

**NO INFERENCE** - Phoenix does NOT guess the framework from requirement text like "terminal" or "web". The spec author MUST explicitly choose the template.
