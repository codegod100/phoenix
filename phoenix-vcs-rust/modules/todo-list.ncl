{
  id = "todo-list",
  name = "Todo List Component",
  description = "Full-featured todo list with database persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  # Config values available for code generation
  # These are evaluated by Nickel and passed to the template
  config = {
    buttonVariant = "success",
    checkboxAccent = "success",
    showProgress = true,
    maxItems = 100
  },

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "Import"],
    resource_file = "todo-list-template.ts",
    # The config values above are passed to the template during generation
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list" } }
  ],

  needs = ["database", "styling"]
}
