# User Card Component - Polymorphic by framework

fun params =>
let themeName = params.themeName in
let framework = params.framework in
let theme = import "theme-%{themeName}%.ncl" in

let template_file = 
  if framework == "lit" then "user-card-lit.ts"
  else if framework == "elenajs" then "user-card-elenajs.ts"
  else "user-card-lit.ts"
in

let framework_module =
  if framework == "lit" then "lit-core"
  else if framework == "elenajs" then "elenajs-core"
  else "lit-core"
in

{
  id = "user-card",
  name = "User Card",
  description = "User profile card with gradient avatar",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  logic_module = "component-logic",
  target_framework = params.framework,

  config = {
    activeTheme = themeName,
    mauve = theme.mauve,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0,
    danger = theme.red,
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = template_file,
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "user-card", framework = params.framework } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = framework_module }, optional = false }
  ]
}
