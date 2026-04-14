# Phoenix VCS Template: Bundle Author
# This template generates bundle definitions for Phoenix VCS

let template = {
  name = "bundle-author",
  description = "Generate Phoenix VCS bundle definitions from specifications",
  version = "0.1.0",
  
  # Template configuration
  config = {
    # Number of files in a bundle (always 5)
    file_count = 5,
    
    # Required files in every bundle
    required_files = [
      "bundle.ncl",
      "template_contract.ncl",
      "theory_contract_panproto.ncl",
      "prompt_theory.md",
      "prompt_contract.md",
    ],
    
    # File theories (which formal theory generates each file)
    file_theories = {
      "bundle.ncl" = "ThBundleMeta",
      "template_contract.ncl" = "ThContract",
      "theory_contract_panproto.ncl" = "ThPanproto",
      "prompt_theory.md" = "ThPromptTheory",
      "prompt_contract.md" = "ThPromptContract",
    },
  },
  
  # Prompt for LLM code generation
  prompt = m%"
You are a Phoenix VCS bundle architect. Generate a complete bundle definition.

## Bundle Structure

Every Phoenix VCS bundle consists of exactly 5 files:

1. **bundle.ncl** - Bundle metadata (id, name, description, keywords, files array)
2. **template_contract.ncl** - Nickel contract for validating specs against this bundle
3. **theory_contract_panproto.ncl** - Formal theory definition in panproto format
4. **prompt_theory.md** - Instructions for LLM theory generation
5. **prompt_contract.md** - Instructions for LLM contract generation

## Generation Rules

For each file, generate content that:
- Uses the appropriate formal theory
- Includes all required fields
- Follows Phoenix VCS conventions
- Is valid Nickel (for .ncl files) or Markdown (for .md files)

## Formal Theories

- **ThBundleMeta**: Bundle metadata with id, name, version, keywords, files[]
- **ThContract**: Nickel contract with validation predicates
- **ThPanproto**: Full GAT definition with sorts, operations, equations, axioms
- **ThPromptTheory**: Markdown instructions for theory generation
- **ThPromptContract**: Markdown instructions for contract generation

## Output Format

Generate each file as a separate string entry in the output object.
"%,
  
  # Keybindings (empty for bundle-author)
  keybindings = {},
  
  # Widgets (empty for bundle-author)
  widgets = {},
  
  # Layout (empty for bundle-author)
  layout = {},
  
  # Theme (empty for bundle-author)
  theme = {},
} in template
