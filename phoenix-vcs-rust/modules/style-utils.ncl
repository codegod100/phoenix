{
  id = "style-utils",
  name = "Style Utilities",
  description = "CSS utility classes and theme tokens for consistent styling",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExportDecl"],
    resource_file = "style-utils.ts",
    config_placeholders = {}
  },

  provides = [
    { interface = "Styling", properties = { exports = "StyleUtils,theme,css" } }
  ],

  needs = []
}
