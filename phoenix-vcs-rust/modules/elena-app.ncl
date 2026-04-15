# Elena App - Root component accepting props from spec.md
# Called as: makeModule { userCardName = "John Doe", userCardEmail = "john@example.com" }

fun params =>
{
  id = "elena-app",
  name = "Elena App",
  description = "Root application component for Elena Dashboard",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config from spec.md via generator
  config = {
    userCardName = params.userCardName,
    userCardEmail = params.userCardEmail
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    resource_file = "elena-app-template.ts",
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
