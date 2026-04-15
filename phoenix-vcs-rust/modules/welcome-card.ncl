# Welcome Card Component
# Imports theme directly from NCL

let theme = import "theme.ncl" in
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
