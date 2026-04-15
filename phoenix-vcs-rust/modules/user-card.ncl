{
  id = "user-card",
  name = "User Card",
  description = "Display user information card",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,
  
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "user-card.ts",
    config_placeholders = {}
  },
  
  provides = [
    { interface = "WebComponent", properties = { tag = "user-card" } }
  ],
  
  needs = []
}
