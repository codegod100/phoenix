# Phoenix Generated Specification
{
  id = "dev.phoenix.app",
  name = "app",
  server = {
    host = "100.115.154.32",
    api_port = 3000,
    vite_port = 5173
  },
  components = ["elena-app", "todo-list", "user-card", "welcome-card"],
  
  # Mermaid Diagram (from tensor network)
  mermaid = m%''graph TD
  node0["((((hono-server: Logging.l @ Database.l → HttpServer @ sqlite: unit → Database): Logging.l @ Database.l → HttpServer @ Database @ vite-dev-server: HttpServer.l → DevServer): Logging.l @ Database.l @ HttpServer.l → HttpServer @ Database @ DevServer @ elenajs: DevServer.l → WebComponents): Logging.l @ Database.l @ HttpServer.l @ DevServer.l → HttpServer @ Database @ DevServer @ WebComponents @ bun-runtime: unit → JavaScriptRuntime)"]
'%

  # ASCII Art Representation
  ascii = m%''+--------------------------------------------------------+
|    🌐 Hono → 🗄️ SQLite → ⚡ Vite → 🎨 ElenaJS → 🚀 Bun     |
+--------------------------------------------------------+
'%
}
