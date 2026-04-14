{
  id = "lit",
  name = "Lit Web Components",
  description = "Bundle for generating TypeScript web applications using Lit framework for modern Web Components with reactive properties",
  version = "0.1.0",
  keywords = ["typescript", "lit", "web-components", "frontend"],
  author = "Phoenix VCS",
  
  # Bundle configuration
  files = [
    { path = "package.json", required = true },
    { path = "tsconfig.json", required = true },
    { path = "vite.config.ts", required = true },
    { path = "index.html", required = true },
    { path = "src/main.ts", required = true },
  ],
  
  # Generation configuration
  generator = {
    type = "template",
    target_template = "lit",
  },
}
