# Lit Elena App - Root application using Lit

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-elena-app",
  name = "Lit Elena App",
  description = "Root Lit application with theme support - replaces elena-app",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    activeTheme = themeName,
    title = params.title,
    userCardName = params.userCardName,
    userCardEmail = params.userCardEmail,
    text = theme.text,
    base = theme.base,
    primary = theme.blue,
    lavender = theme.lavender
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    resource_file = "elena-app-template.ts"
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "elena-app", type = "root", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false }
  ]
}
