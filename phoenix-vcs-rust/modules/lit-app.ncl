# Lit App - Root application using Lit

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-app",
  name = "Lit App",
  description = "Root Lit application with theme support",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    activeTheme = themeName,
    title = params.title,
    text = theme.text,
    base = theme.base,
    primary = theme.primary,
    lavender = theme.lavender
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    resource_file = "lit-app-template.ts"
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "lit-app", type = "root", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false },
    { interface = "WebComponent", strategy = { type = "named", name = "lit-counter" }, optional = true }
  ]
}
