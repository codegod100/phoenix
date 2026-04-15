{
  id = "welcome-card",
  name = "Welcome Card",
  description = "Welcome message component",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    vertices = [
      { 
        id = "welcome_card_class", 
        kind = "ClassDecl", 
        text = "export class WelcomeCard extends Elena(HTMLElement) {\n  static tagName = 'welcome-card';\n  static props = ['title', 'message'];\n  \n  title = 'Welcome';\n  message = 'Get started with Elena Dashboard';\n  \n  render() {\n    return html`\n      <div style=\"background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 2rem; margin: 1rem 0; color: white;\">\n        <h2 style=\"margin: 0 0 0.5rem 0;\">${this.title}</h2>\n        <p style=\"margin: 0; opacity: 0.9;\">${this.message}</p>\n        <div style=\"margin-top: 1rem;\">\n          <span style=\"display: inline-block; background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;\">\n            ElenaJS + Hono\n          </span>\n        </div>\n      </div>\n    `;\n  }\n}\n"
      }
    ],
    config_placeholders = {}
  },
  provides = [
    { interface = "WebComponent", properties = { tag = "welcome-card" } }
  ],
  needs = []
}
