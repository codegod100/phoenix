{
  # Bundle metadata for template discovery
  id = "ts-hono",
  language = "typescript",
  framework = "hono",
  description = "Fast, lightweight web framework for the edge with TypeScript",
  
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
}
