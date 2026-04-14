{
  # Bundle metadata for template discovery
  id = "ts-hono",
  language = "typescript",
  framework = "hono",
  description = "Fast, lightweight web framework for the edge with TypeScript",
  version = "0.1.0",
  
  # Keywords for matching specs to this template
  keywords = [
    "api", "rest", "http", "server", "backend", "web",
    "hono", "typescript", "ts", "edge", "cloudflare", "bun",
    "middleware", "router", "json", "cors"
  ],
  
  # Bundle files to generate (separate from template.ncl)
  files = {
    "flake.nix" = "./flake.nix",
    "package.json" = "./package.json",
    "tsconfig.json" = "./tsconfig.json",
    "README.md" = "./README.md",
  },
  
  # Generation configuration
  generator = {
    type = "rust-native",
    rust_generator = "generate.rs",
    target_template = "ts-hono",
  },
  
  # Base dependencies
  base_deps = [
    "hono",
    "typescript",
  ],
}
