# Lit Todo List Component
# Interactive todo management with API - Lit version

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-todo-list",
  name = "Lit Todo List",
  description = "Todo list with add/complete/delete and API persistence - Lit version",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    activeTheme = themeName,
    primary = theme.blue,
    success = theme.green,
    danger = theme.red,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0,
    surface1 = theme.surface1
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "todo-list-template.ts"
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false }
  ]
}
