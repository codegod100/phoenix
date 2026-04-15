{
  id = "todo-list",
  name = "Todo List Component",
  description = "Full-featured todo list with database persistence",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "Import"],
    resource_file = "todo-list-styled.ts",
    config_placeholders = {
      "{{BUTTON_VARIANT}}" = "success",
      "{{CHECKBOX_ACCENT}}" = "success"
    }
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list" } }
  ],

  needs = ["database", "styling"]
}
