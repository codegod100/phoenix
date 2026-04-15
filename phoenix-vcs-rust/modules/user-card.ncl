{
  id = "user-card",
  name = "User Card",
  description = "Display user information card",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    vertices = [
      { 
        id = "user_card_class", 
        kind = "ClassDecl", 
        text = "export class UserCard extends Elena(HTMLElement) {\n  static tagName = 'user-card';\n  static props = ['name', 'email'];\n  \n  name = '';\n  email = '';\n  \n  render() {\n    const initials = this.name.split(' ').map(n => n[0]).join('').toUpperCase();\n    return html`\n      <div style=\"border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; display: flex; align-items: center; gap: 1rem;\">\n        <div style=\"width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;\">\n          ${initials}\n        </div>\n        <div>\n          <h3 style=\"margin: 0;\">${this.name}</h3>\n          <p style=\"margin: 0; color: #666;\">${this.email}</p>\n        </div>\n      </div>\n    `;\n  }\n}\n"
      }
    ],
    config_placeholders = {}
  },
  provides = [
    { interface = "WebComponent", properties = { tag = "user-card" } }
  ],
  needs = []
}
