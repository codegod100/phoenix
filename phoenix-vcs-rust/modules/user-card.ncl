# User Card - accepts config from spec.md
# Called as: makeModule { avatarColor = "blue" }

fun params =>
{
  id = "user-card",
  name = "User Card",
  description = "Display user information card",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

  config = {
    avatarColor = params.avatarColor
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
