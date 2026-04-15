# Elena App - Root application component (polymorphic by framework)

fun params =>
let themeName = params.themeName in
let framework = params.framework in
let theme = import "theme-%{themeName}%.ncl" in

let template_file = 
  if framework == "lit" then "elena-app-lit.ts"
  else if framework == "elenajs" then "elena-app-elenajs.ts"
  else "elena-app-lit.ts"
in

let framework_module =
  if framework == "lit" then "lit-core"
  else if framework == "elenajs" then "elenajs-core"
  else "lit-core"
in

{
  id = "elena-app",
  name = "Elena App",
  description = "Root application component with theme support",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  target_framework = params.framework,

  # Config from spec.md via params, plus theme info
  config = {
    userCardName = params.userCardName,
    userCardEmail = params.userCardEmail,
    activeTheme = themeName,
    title = params.title,
    # Theme colors for template
    primary = theme.blue,
    lavender = theme.lavender,
    text = theme.text,
    base = theme.base,
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    resource_file = template_file,
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "elena-app", type = "root", framework = params.framework } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = framework_module }, optional = false }
  ]
}
