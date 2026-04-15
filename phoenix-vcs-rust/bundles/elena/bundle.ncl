{
  id = "elena",
  name = "ElenaJS Web Components",
  description = "Bundle for generating TypeScript web applications using ElenaJS framework with Hono backend - Pure NCL generation",
  version = "1.0.0",
  keywords = ["typescript", "elenajs", "web-components", "hono", "fullstack", "ncl-native"],
  author = "Phoenix VCS",
  
  # Bundle configuration - all paths are relative to bundle folder
  files = [
    { path = "package.json", required = true },
    { path = "tsconfig.json", required = true },
    { path = "vite.config.ts", required = true },
    { path = "index.html", required = true },
    { path = "src/main.ts", required = true },
    { path = "src/server.ts", required = true },
    { path = "flake.nix", required = false },
    { path = "README.md", required = false },
  ],
  
  # NCL-based generation configuration
  generator = {
    type = "ncl-native",
    rust_generator = "generate.rs",
    entry_point = "generate.ncl",
    templates = "templates.ncl",
    generate_fn = "generate",
    
    template_config = {
      components = [
        { 
          name = "welcome",
          template_ref = "welcome_component",
          params = ["title", "message"],
        },
        { 
          name = "todo", 
          template_ref = "todo_component",
          params = [],
        },
        {
          name = "user-card",
          template_ref = "user_card_component", 
          params = ["name", "email"],
        },
      ],
    },
  },
  
  # Default dependencies
  dependencies = {
    production = ["elenajs", "hono"],
    development = ["typescript", "vite", "@hono/node-server"],
  },
}
