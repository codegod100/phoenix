# Todo List Component - accepts config from generator
# Called as: makeModule { buttonColor = "success", checkboxColor = "success" }

fun params =>
{
  id = "todo-list",
  name = "Todo List Component",
  description = "Full-featured todo list with database persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config from spec.md via generator
  config = {
    buttonVariant = params.buttonColor,
    checkboxAccent = params.checkboxColor,
    showProgress = true,
    maxItems = 100
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "Import"],
    resource_file = "todo-list-template.ts",
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list" } }
  ],

  needs = ["database", "styling"]
}
