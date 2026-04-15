# ElenaJS Core - Web Components Framework
# https://elenajs.dev (hypothetical)

{
  id = "elenajs-core",
  name = "ElenaJS Core",
  description = "ElenaJS reactive web components framework",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = true,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ImportDecl"],
    vertices = [
      { id = "elena_import", kind = "ImportDecl", text = "import { Elena, html } from '@elenajs/core';\n" }
    ]
  },

  provides = [
    { interface = "WebFramework", properties = { 
      framework = "elenajs", 
      type = "web-components",
      features = ["reactive", "templates"]
    }}
  ],

  needs = []
}
