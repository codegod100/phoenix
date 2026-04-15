# Todo List Component - Polymorphic by framework
# ONE definition, ANY framework output

fun params =>
let themeName = params.themeName in
let framework = params.framework in  # "lit" | "elenajs" | "react" | ...
let theme = import "theme-%{themeName}%.ncl" in

# Framework-specific template mapping
let template_file = 
  if framework == "lit" then "todo-list-lit.ts"
  else if framework == "elenajs" then "todo-list-elenajs.ts"
  else "todo-list-lit.ts"  # default
in

# Framework-specific framework module
let framework_module =
  if framework == "lit" then "lit-core"
  else if framework == "elenajs" then "elenajs-core"
  else "lit-core"
in

# Framework-specific vertex kinds
let vkinds =
  if framework == "lit" then ["ClassDecl"]
  else if framework == "elenajs" then ["ClassDecl"]
  else ["ClassDecl"]
in

{
  id = "todo-list",
  name = "Todo List",
  description = "Todo list with add/complete/delete and API persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Core logic module used by this component (shared across frameworks)
  logic_module = "component-logic",

  # Target framework (used by generator to pick right template)
  target_framework = params.framework,

  config = {
    activeTheme = themeName,
    # Theme colors from imported theme
    primary = theme.blue,
    success = theme.green,
    danger = theme.red,
    text = theme.text,
    base = theme.base,
    surface0 = theme.surface0,
    surface1 = theme.surface1,
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = vkinds,
    # Template selected by framework parameter
    resource_file = template_file,
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list", framework = params.framework } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = framework_module }, optional = false }
  ]
}
