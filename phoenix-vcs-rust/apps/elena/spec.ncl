# Phoenix Generated Specification
{
  id = "dev.phoenix.app",
  name = "app",
  server = {
    host = "100.115.154.32",
    api_port = 3000,
    vite_port = 5173
  },
  components = ["todo-list", "user-card", "welcome-card"],
  
  # Tensor Network
  modules = [
    { id = "elenajs", name = "ElenaJS", language = "typescript" },
    { id = "bun-runtime", name = "Bun Runtime", language = "nix" },
    { id = "sqlite", name = "SQLite", language = "nix" },
    { id = "hono-server", name = "Hono Server", language = "typescript" },
    { id = "vite-dev-server", name = "Vite Dev Server", language = "typescript" }
  ],
  connections = [
    { provider = "sqlite", consumer = "hono-server", interface = "Database" },
    { provider = "hono-server", consumer = "vite-dev-server", interface = "HttpServer" },
    { provider = "vite-dev-server", consumer = "elenajs", interface = "Custom(\"DevServer\")" }
  ],
  dangling = []
}
