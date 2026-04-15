{
  id = "hono-server",
  name = "Hono Server",
  description = "Production Hono server with middleware stack",
  version = "1.0.0",
  
  provides = [
    {
      interface = "HttpServer",
      properties = {
        framework = "hono",
        runtime = "bun",
        protocol = "http",
        features = ["routing", "logging", "cors"],
      },
      endpoint = "http://localhost:3000",
    }
  ],
  
  needs = [
    {
      interface = "HttpFramework",
      strategy = { type = "named", name = "hono-core" },
      optional = false,
    },
    {
      interface = "HttpMiddleware",  # Logger
      strategy = { type = "named", name = "hono-logger" },
      optional = true,
    },
    {
      interface = "HttpMiddleware",  # CORS
      strategy = { type = "named", name = "hono-cors" },
      optional = true,
    },
    {
      interface = "Logging",
      strategy = { type = "first_available" },
      optional = true,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "local",
    path = "./modules/hono-server/runtime.ts",
  },
  
  config_schema = {
    port = {
      type = "number",
      default = 3000,
    },
    middleware = {
      type = "array",
      items = { type = "string" },
      default = ["logger", "cors"],
    },
  },
  
  is_infrastructure = true,
}
