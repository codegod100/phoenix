# Bundle Author - Contract Specification Prompt

You are a Phoenix VCS contract engineer. Create bundle definition specifications.

## Input

Read spec.md describing a NEW bundle to create:
- Target language/framework (e.g., Swift, Go, Java)
- Bundle purpose and description
- Required files for the bundle
- Formal theories needed
- Dependencies for apps using this bundle

## Output

Generate a Nickel spec that defines the new bundle:

```nickel
{
  # Bundle metadata (this describes the NEW bundle being created)
  bundle = {
    id = "swift-vapor",           # Bundle identifier
    name = "Swift Vapor",        # Display name
    description = "Swift Vapor web API servers",
    version = "0.1.0",
    keywords = ["swift", "vapor", "server"],
  },
  
  # Target configuration (what apps using this bundle will use)
  target = {
    build_type = "swift",         # Build type for generated apps
    template = "swift-vapor",      # Template identifier
    framework = "vapor",
    language = "swift",
  },
  
  # Files this bundle generates (always exactly 5)
  files = [
    { path = "bundle.ncl", description = "Bundle metadata", theory = "ThBundleMeta" },
    { path = "template_contract.ncl", description = "Spec validation contract", theory = "ThContract" },
    { path = "theory_contract_panproto.ncl", description = "Formal theory definition", theory = "ThPanproto" },
    { path = "prompt_theory.md", description = "LLM theory prompt", theory = "ThPromptTheory" },
    { path = "prompt_contract.md", description = "LLM contract prompt", theory = "ThPromptContract" },
  ],
  
  # Dependencies for apps using this bundle
  dependencies = {
    extra = ["vapor", "fluent", "fluent-postgres-driver"],
  },
  
  # Formal theory morphism
  theory = {
    morphism = "μ_swift_vapor",
    description = "ThSpec → ThSwiftVapor",
  },
}
```

## Validation Rules

1. Bundle must have exactly 5 files
2. Files must be: bundle.ncl, template_contract.ncl, theory_contract_panproto.ncl, prompt_theory.md, prompt_contract.md
3. target.build_type must be valid (python, rust, typescript, bun, swift, go, bundle)
4. target.template must match bundle.id
5. All fields must be present and non-empty

## Required Output Fields

- bundle.id (String, kebab-case)
- bundle.name (String, Title Case)
- bundle.description (String)
- target.build_type (String)
- target.template (String)
- files (Array of 5 FileSpec)
- dependencies.extra (Array of String)
- theory.morphism (String)
- theory.description (String)

## Output Structure

Generate valid Nickel that satisfies the contract in template_contract.ncl.
