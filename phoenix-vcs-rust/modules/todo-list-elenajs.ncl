# Todo List Component - ElenaJS wrapper
# Uses shared component-logic.ts for core functionality

fun params =>
let themeName = params.themeName in
let theme = import "theme-%{themeName}%.ncl" in
{
  id = "elenajs-todo-list",
  name = "ElenaJS Todo List",
  description = "Todo list with add/complete/delete and API persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Core logic module used by this component
  logic_module = "component-logic",

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
    vertex_kinds = ["ClassDecl"],
    resource_file = "todo-list-elenajs-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list", framework = "elenajs" } }
  ],

  needs = [
    { interface = "WebFramework", strategy = { type = "named", name = "elenajs-core" }, optional = false }
  ]
}
