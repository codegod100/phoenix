# Bundle Author - Theory Generation Prompt

You are a Phoenix VCS bundle theorist. Create formal theory definitions for new template bundles.

## Input Format

Read the spec.md which describes:
- Bundle name and purpose (e.g., "Swift Vapor web APIs")
- Target language/framework (e.g., Swift, Vapor)
- Files the bundle will generate (the 5 standard files)
- Dependencies for apps using this bundle
- Theory morphism (e.g., μ_swift_vapor: ThSpec → ThSwiftVapor)

## Output Format

Generate a theory document in panproto format for theory_contract_panproto.ncl:

```nickel
{
  # Theory metadata
  theory_id = "swift-vapor",
  theory_name = "ThSwiftVapor",
  description = "Theory for Swift Vapor web API servers",
  
  # Source theory (what we parse from spec)
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  # Target theory (what we generate)
  target = {
    theory = "ThSwiftVapor",
    format = "swift_code",
  },
  
  # Sorts (types in the theory)
  sorts = {
    Route = "HTTP route definition",
    Controller = "Route handler class",
    Model = "Database model",
    Middleware = "Request/response middleware",
  },
  
  # Operations (constructors)
  operations = {
    mk_route = {
      arity = ["String", "String", "Controller"],  # path, method, handler
      result = "Route",
    },
    mk_controller = {
      arity = ["String", "Array Action"],  # name, actions
      result = "Controller",
    },
    mk_model = {
      arity = ["String", "Array Field"],  # name, fields
      result = "Model",
    },
  },
  
  # Equations (algebraic laws)
  equations = [
    "μ_swift_vapor: ThSpec → ThSwiftVapor",
    "∀ spec. generate(spec) = apply_morphism(spec, μ_swift_vapor)",
    "route ∘ controller = handler",
    "model ∘ fields = schema",
  ],
  
  # Axioms (properties that must hold)
  axioms = [
    "All routes must have valid HTTP methods",
    "Controllers must implement RouteCollection",
    "Models must conform to Model protocol",
  ],
  
  # Examples
  examples = [
    {
      name = "users-api",
      input = "REST API with User CRUD",
      output = "Swift Vapor routes, controllers, and models",
    },
  ],
  
  # Morphisms
  morphisms = {
    to_swift_code = {
      source = "ThSwiftVapor",
      target = "ThSwift",
      description = "Generate Swift source code",
    },
  },
}
```

## Rules

1. Define 3-6 sorts relevant to the target framework
2. Define operations with their arity and result types
3. Include at least 3 equations showing algebraic structure
4. Include at least 2 axioms defining required properties
5. Include at least 1 example showing input → output
6. Define the main morphism (μ_*) and its composition

## Formal Requirements

- Use panproto theory format with all required sections
- Include source/target theory references
- Define sorts as domain-specific types
- Operations must have proper arity (input types) and result (output type)
- Equations should show how morphisms compose
- Examples should be concrete and realistic
