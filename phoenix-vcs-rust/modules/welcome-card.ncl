# Lit Welcome Card Component
# Hero section with gradient background - Lit version

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-welcome-card",
  name = "Lit Welcome Card",
  description = "Welcome message component with theme colors - Lit version",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    activeTheme = themeName,
    mauve = theme.mauve,
    lavender = theme.lavender,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "welcome-card-template.ts"
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "welcome-card", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false }
  ]
}
