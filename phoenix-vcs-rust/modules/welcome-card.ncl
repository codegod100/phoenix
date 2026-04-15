{
  id = "welcome-card",
  name = "Welcome Card",
  description = "Welcome message component",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,
  
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "welcome-card.ts",
    config_placeholders = {}
  },
  
  provides = [
    { interface = "WebComponent", properties = { tag = "welcome-card" } }
  ],
  
  needs = []
}
