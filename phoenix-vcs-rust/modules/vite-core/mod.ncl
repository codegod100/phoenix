{
  id = "vite-core",
  name = "Vite Core",
  description = "Next generation frontend tooling",
  version = "5.0.0",
  
  provides = [
    {
      interface = "BuildTool",
      properties = {
        type = "bundler",
        features = ["hmr", "typescript", "css"],
      },
    }
  ],
  
  needs = [],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/vite",
    version = "^5.0.0",
  },
  
  is_infrastructure = false,
}
