{
  id = "elena-app",
  name = "Elena App",
  description = "Root application component for Elena Dashboard",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    resource_file = "elena-app.ts",
    config_placeholders = {}
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "elena-app", type = "root" } }
  ],

  needs = [
    { interface = "WebComponent", strategy = { type = "named", name = "todo-list" }, optional = false },
    { interface = "WebComponent", strategy = { type = "named", name = "user-card" }, optional = false },
    { interface = "WebComponent", strategy = { type = "named", name = "welcome-card" }, optional = false }
  ]
}
