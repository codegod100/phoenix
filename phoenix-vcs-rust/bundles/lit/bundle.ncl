{
  id = "lit",
  name = "Lit Web Components",
  description = "Bundle for generating TypeScript web applications using Lit framework - Pure NCL generation",
  version = "2.0.0",
  keywords = ["typescript", "lit", "web-components", "frontend", "ncl-native"],
  author = "Phoenix VCS",
  
  # Bundle configuration - all paths are relative to bundle folder
  files = [
    { path = "package.json", required = true },
    { path = "tsconfig.json", required = true },
    { path = "vite.config.ts", required = true },
    { path = "index.html", required = true },
    { path = "src/main.ts", required = true },
    { path = "flake.nix", required = false },
    { path = "README.md", required = false },
  ],
  
  # NCL-based generation configuration
  # All generation logic is in NCL files within this bundle
  generator = {
    # Type of generator
    type = "ncl-native",
    
    # Rust code generation (optional - for complex bundles)
    rust_generator = "generate.rs",
    
    # NCL files for generation (relative to bundle root)
    entry_point = "generate.ncl",
    templates = "templates.ncl",
    
    # Function to call in generate.ncl
    generate_fn = "generate",
    
    # Template configuration  
    template_config = {
      # Components that can be generated
      components = [
        { 
          name = "hero",
          template_ref = "hero_component",
          params = ["message", "subtitle", "gradient_from", "gradient_to"],
        },
        { 
          name = "counter", 
          template_ref = "counter_component",
          params = [],
        },
        {
          name = "todo-list",
          template_ref = "todo_list_component", 
          params = [],
        },
      ],
    },
  },
  
  # Default dependencies
  dependencies = {
    production = ["lit"],
    development = ["typescript", "vite"],
  },
}
