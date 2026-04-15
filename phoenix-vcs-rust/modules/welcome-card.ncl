# Welcome Card Component
# Imports theme based on themeName param from spec.md

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "welcome-card",
  name = "Welcome Card",
  description = "Welcome message component with theme colors",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Theme colors for template
  config = {
    mauve = theme.mauve,
    lavender = theme.lavender,
    text = theme.text,
    base = theme.base
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "welcome-card-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "welcome-card" } }
  ],

  needs = []
}
