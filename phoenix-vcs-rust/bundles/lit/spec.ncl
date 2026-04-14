{
  # ThLit: Theory of Lit Web Components
  # A GAT for generating TypeScript web apps with Lit
  
  theory_id = "lit",
  theory_name = "ThLit",
  version = "0.1.0",
  
  # Description
  description = "Theory for generating TypeScript web applications using Lit framework for frontend development with Web Components",
  
  # Source theory (what we parse from spec.md)
  source = {
    theory = "ThSpec",
    format = "spec_md",
    grammar = "markdown",
  },
  
  # Target theory (what we generate)
  target = {
    theory = "ThLit",
    format = "panproto",
    files = [
      "src/main.ts",
      "src/components/",
      "index.html",
      "package.json",
      "vite.config.ts",
    ],
  },
  
  # Sorts (types in the theory)
  sorts = {
    BundleId = "Identifier for the new bundle (e.g., swift-vapor)",
    BundleMeta = "Bundle metadata (name, description, keywords)",
    TargetConfig = "Target configuration (build_type, framework, language)",
    FileSpec = "Specification for a bundle file",
    DepSpec = "Dependency specification for generated apps",
    TheoryMorphism = "Formal morphism name (e.g., μ_swift_vapor)",
  },
  
  # Operations (constructors)
  operations = {
    # mk_bundle_def: creates a bundle definition
    mk_bundle_def = {
      arity = [
        "BundleId",
        "BundleMeta",
        "TargetConfig",
        "Array FileSpec",
        "Array DepSpec",
        "TheoryMorphism",
      ],
      result = "Bundle",
      description = "Create a complete bundle definition with id, metadata, config, files, dependencies, and morphism",
    },
    
    # mk_file_spec: create a file specification
    mk_file_spec = {
      arity = ["String", "String"],
      result = "FileSpec",
      description = "Create a file specification with path and description",
    },
    
    # mk_dep_spec: create a dependency specification
    mk_dep_spec = {
      arity = ["String", "Array String"],
      result = "DepSpec",
      description = "Create a dependency specification with name and packages",
    },
    
    # mk_theory_morphism: create a theory morphism
    mk_theory_morphism = {
      arity = ["String", "String", "String"],
      result = "TheoryMorphism",
      description = "Create a theory morphism with source, target, and transformation name",
    },
  },
  
  # Bundle definition for "lit" - Lit Web Components bundle
  
  # Bundle ID
  id = "lit",
  
  # Bundle metadata
  metadata = {
    name = "Lit",
    description = "Phoenix VCS bundle for generating TypeScript web applications using Lit framework for frontend development",
    keywords = ["typescript", "lit", "web-components", "frontend"],
  },
  
  # Build type
  build_type = "bundle",
  
  # Target configuration
  target_config = {
    language = "typescript",
    framework = "lit",
    build_type = "bundle",
  },
  
  # Files to generate for this bundle
  files = [
    {
      path = "bundle.ncl",
      description = "Bundle metadata with id='lit', name='Lit', keywords=['typescript', 'lit', 'web-components', 'frontend']",
    },
    {
      path = "template_contract.ncl",
      description = "Nickel contract validating TypeScript version >= 5, Vite build tool configuration, Lit dependencies present, Web component definitions valid, TypeScript decorators configured",
    },
    {
      path = "theory_contract_panproto.ncl",
      description = "Formal GAT defining ThLit: ThSpec → ThLit → String with Sorts: Component, Property, Event, Template, Style, Decorator, CustomElement and Operations: mk_component, mk_property, mk_event, mk_template, mk_style, mk_decorator, mk_custom_element",
    },
    {
      path = "prompt_theory.md",
      description = "Instructions for LLM to generate Lit component classes with @customElement decorators, reactive properties with @property decorator, lit-html templates with event bindings, CSS styles with :host selectors, event handling with @event decorators, TypeScript type definitions",
    },
    {
      path = "prompt_contract.md",
      description = "Instructions for LLM to validate Vite configuration for TypeScript/Lit, package.json dependencies (lit, typescript, vite), tsconfig.json with decorator support, Component file structure, Web component naming conventions",
    },
  ],
  
  # Dependencies
  dependencies = [
    {
      name = "typescript",
      packages = ["lit", "typescript", "vite", "@lit/reactive-element", "lit-html"],
    },
  ],
  
  # Theory morphism
  morphism = {
    source_theory = "ThSpec",
    target_theory = "ThLit",
    transformation = "μ_lit",
  },
  
  # Sort declarations
  bundle_sorts = {
    Component = "Lit web component class definition",
    Property = "Reactive property with @property decorator",
    Event = "Custom event handler binding",
    Template = "lit-html template function",
    Style = "CSS tagged template for component styles",
    Decorator = "TypeScript decorator (customElement, property, event)",
    CustomElement = "Registered web element tag name",
  },
  
  # Operation specifications
  bundle_operations = {
    mk_component = {
      arity = ["CustomElement", "Array Property", "Template", "Style", "Array Event"],
      result = "Component",
      description = "Create a Lit component with custom element registration, reactive properties, template, styles, and event handlers",
    },
    mk_property = {
      arity = ["String", "String", "Bool"],
      result = "Property",
      description = "Create a Lit reactive property with name, type, and attribute reflection",
    },
    mk_event = {
      arity = ["String", "String"],
      result = "Event",
      description = "Create a Lit event handler with event name and handler method",
    },
    mk_template = {
      arity = ["String", "Array String"],
      result = "Template",
      description = "Create a lit-html template with HTML string and bound property paths",
    },
    mk_style = {
      arity = ["String"],
      result = "Style",
      description = "Create a Lit CSS tagged template with CSS string",
    },
    mk_decorator = {
      arity = ["String", "Dict"],
      result = "Decorator",
      description = "Create a TypeScript decorator with name and options",
    },
    mk_custom_element = {
      arity = ["String", "String"],
      result = "CustomElement",
      description = "Create a custom element registration with tag name and class name",
    },
  },
  
  # Equations (semantic constraints)
  equations = [
    {
      name = "component_composition",
      description = "A component's template can reference its own properties and events",
    },
    {
      name = "property_binding",
      description = "Properties are automatically reflected to attributes with kebab-case conversion",
    },
    {
      name = "event_handling",
      description = "Event handlers are bound using the @eventPath decorator syntax",
    },
    {
      name = "template_rendering",
      description = "Templates use lit-html directive functions for conditional and repeat rendering",
    },
  ],
  
  # Examples
  examples = [
    {
      name = "Counter component",
      description = "Simple counter with increment/decrement and reactive count property",
    },
    {
      name = "Todo list",
      description = "List component with item addition, deletion, and filtering",
    },
    {
      name = "Data table",
      description = "Table component with sorting, pagination, and cell rendering",
    },
  ],
}