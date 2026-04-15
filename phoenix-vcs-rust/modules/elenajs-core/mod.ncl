{
  id = "elenajs-core",
  name = "ElenaJS Core",
  description = "Reactive web components framework",
  version = "1.0.0",
  
  provides = [
    {
      interface = "ComponentFramework",
      properties = {
        paradigm = "reactive",
        rendering = "shadow-dom",
        language = "typescript",
      },
    }
  ],
  
  needs = [],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/elenajs",
    version = "^1.0.0",
  },
  
  is_infrastructure = false,
}
