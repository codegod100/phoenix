# Todo List Component
# Imports theme directly from NCL

let theme = import "theme.ncl" in
fun params =>
{
  id = "todo-list",
  name = "Todo List Component",
  description = "Full-featured todo list with database persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config from spec.md via params, plus theme colors
  config = {
    buttonVariant = params.buttonColor,
    checkboxAccent = params.checkboxColor,
    showProgress = true,
    maxItems = 100,
    # Theme colors for template
    mauve = theme.mauve,
    red = theme.red,
    green = theme.green,
    teal = theme.teal,
    text = theme.text,
    subtext0 = theme.subtext0,
    overlay0 = theme.overlay0,
    surface0 = theme.surface0,
    surface1 = theme.surface1,
    base = theme.base
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    resource_file = "todo-list-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list" } }
  ],

  needs = ["database", "styling"]
}
