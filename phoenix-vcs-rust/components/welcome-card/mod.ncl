{
  id = "welcome-card",
  name = "Welcome Card Component",
  description = "Hero section with gradient background",
  version = "1.0.0",
  
  provides = [
    {
      interface = "WebComponent",
      properties = {
        tag = "welcome-card",
        category = "layout",
        features = ["gradient", "responsive"],
      },
    }
  ],
  
  needs = [
    {
      interface = "ComponentFramework",
      strategy = { type = "constrained", constraints = [
        { type = "property_equals", property = "paradigm", value = "reactive" }
      ]},
      optional = false,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "local",
    path = "./components/welcome-card/component.ts",
  },
  
  config_schema = {
    title = {
      type = "string",
      default = "Welcome",
    },
    message = {
      type = "string", 
      default = "Hello World",
    },
  },
  
  is_infrastructure = false,
}
