# Lit Counter Component
# A simple reactive counter using Lit

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-counter",
  name = "Lit Counter",
  description = "Reactive counter with +/- buttons",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    activeTheme = themeName,
    primary = theme.primary,
    secondary = theme.secondary,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "lit-counter-template.ts"
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "lit-counter", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false }
  ]
}
