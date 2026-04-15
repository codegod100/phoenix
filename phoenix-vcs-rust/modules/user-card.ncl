# User Card Component
# Imports theme directly from NCL

let theme = import "theme.ncl" in
fun params =>
{
  id = "user-card",
  name = "User Card",
  description = "Display user information card",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config uses theme colors directly
  config = {
    mauve = theme.mauve,
    base = theme.base,
    text = theme.text,
    subtext0 = theme.subtext0,
    surface0 = theme.surface0,
    surface1 = theme.surface1
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "user-card-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "user-card" } }
  ],

  needs = []
}
