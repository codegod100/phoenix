# Elena App - Root component
# Imports theme directly from NCL

let theme = import "theme.ncl" in
fun params =>
{
  id = "elena-app",
  name = "Elena App",
  description = "Root application component for Elena Dashboard",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config from spec.md via params, plus theme colors
  config = {
    userCardName = params.userCardName,
    userCardEmail = params.userCardEmail,
    # Theme colors for template
    mauve = theme.mauve,
    lavender = theme.lavender,
    text = theme.text,
    base = theme.base
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
