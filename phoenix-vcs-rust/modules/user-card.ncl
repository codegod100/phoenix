# Lit User Card Component
# User profile display with avatar - Lit version

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "lit-user-card",
  name = "Lit User Card",
  description = "User profile card with gradient avatar - Lit version",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Core logic module used by this component
  logic_module = "component-logic",

  config = {
    activeTheme = themeName,
    mauve = theme.mauve,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "user-card-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "user-card", framework = "lit" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "lit-core" }, optional = false }
  ]
}
