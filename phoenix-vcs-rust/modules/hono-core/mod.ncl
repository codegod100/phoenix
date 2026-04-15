{
  id = "hono-core",
  name = "Hono Core",
  description = "Minimal Hono HTTP framework",
  version = "3.12.0",
  
  provides = [
    {
      interface = "HttpFramework",
      properties = {
        framework = "hono",
        type = "minimal",
        features = ["routing", "middleware", "context"],
      },
    }
  ],
  
  needs = [],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/hono",
    version = "^3.12.0",
  },
  
  is_infrastructure = false,
}
