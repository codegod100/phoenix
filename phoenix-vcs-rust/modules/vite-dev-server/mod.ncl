{
  id = "vite-dev-server",
  name = "Vite Dev Server",
  description = "Development server with HMR and proxy",
  version = "1.0.0",
  
  provides = [
    {
      interface = "DevServer",
      properties = {
        type = "vite",
        features = ["hmr", "proxy", "source-maps"],
        port = 5173,
      },
      endpoint = "http://localhost:5173",
    },
    {
      interface = "HttpMiddleware",  # For proxying API requests
      properties = {
        name = "api-proxy",
        type = "reverse-proxy",
      },
    }
  ],
  
  needs = [
    {
      interface = "BuildTool",
      strategy = { type = "named", name = "vite-core" },
      optional = false,
    },
    {
      interface = "HttpServer",  # To proxy to
      strategy = { type = "first_available" },
      optional = true,  # Can run standalone
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "local",
    path = "./modules/vite-dev-server/config.ts",
  },
  
  config_schema = {
    port = {
      type = "number",
      default = 5173,
    },
    proxy = {
      type = "object",
      properties = {
        path = { type = "string" },
        target = { type = "string" },
      },
    },
  },
  
  is_infrastructure = true,
}
