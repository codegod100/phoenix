# Lit Core - Web Components Framework
# https://lit.dev/

{
  id = "lit-core",
  name = "Lit Core",
  description = "Lit web components framework with reactive templates",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = true,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ImportDecl"],
    vertices = [
      { id = "lit_import", kind = "ImportDecl", text = "import { LitElement, html, css } from 'lit';\n" },
      { id = "decorators_import", kind = "ImportDecl", text = "import { property, state, customElement } from 'lit/decorators.js';\n" }
    ]
  },

  provides = [
    { interface = "WebFramework", properties = { 
      framework = "lit", 
      type = "web-components",
      features = ["reactive", "templates", "shadow-dom"]
    }}
  ],

  needs = []
}
