{
  id = "todo-list",
  name = "Todo List Component",
  description = "Interactive todo management with API integration",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Metadata for code generation
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "todo-list.ts",
    config_placeholders = {}
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list", framework = "elenajs" } }
  ],

  needs = [
    { interface = "HttpServer", strategy = { type = "first_available" }, optional = false }
  ]
}
