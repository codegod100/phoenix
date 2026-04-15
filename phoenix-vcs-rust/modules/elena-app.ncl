{
  id = "elena-app",
  name = "Elena App",
  description = "Root application component for Elena Dashboard",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = false,

    generation = {
    protocol = "typescript",
    vertex_kinds = ["ClassDecl", "ExprStmt"],
    vertices = [
      { 
        id = "app_class", 
        kind = "ClassDecl", 
        text = "export class ElenaApp extends Elena(HTMLElement) {\n  static tagName = 'elena-app';\n\n  render() {\n    return html`\n      <div style=\"max-width: 1200px; margin: 0 auto; padding: 2rem;\">\n        <h1 style=\"color: #333; margin-bottom: 2rem;\">Elena Dashboard</h1>\n        <welcome-card title=\"Welcome\" message=\"Elena Dashboard with SQLite persistence\"></welcome-card>\n        <user-card name=\"Alice Smith\" email=\"alice@example.com\"></user-card>\n        <todo-list></todo-list>\n      </div>\n    `;\n  }\n}\n"
      },
      { 
        id = "mount_app", 
        kind = "ExprStmt", 
        text = "// Mount the application\ndocument.addEventListener('DOMContentLoaded', () => {\n  const app = document.createElement('elena-app');\n  document.body.appendChild(app);\n  console.log('Elena Dashboard mounted');\n});\n"
      }
    ],
    config_placeholders = {}
  },

  provides = [
    { interface = "WebComponent", properties = { tag = "elena-app", type = "root" } }
  ],

  needs = [
    { interface = "WebComponent", strategy = { type = "named", name = "todo-list" }, optional = false },
    { interface = "WebComponent", strategy = { type = "named", name = "user-card" }, optional = false },
    { interface = "WebComponent", strategy = { type = "named", name = "welcome-card" }, optional = false }
  ]
}
