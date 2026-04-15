{
  id = "hono-logger",
  name = "Hono Logger Middleware",
  description = "Request/response logging for Hono",
  version = "3.12.0",
  
  provides = [
    {
      interface = "Logging",
      properties = {
        type = "http-middleware",
        format = "combined",
      },
    },
    {
      interface = "HttpMiddleware", 
      properties = {
        name = "logger",
        stage = "early",
      },
    }
  ],
  
  needs = [
    {
      interface = "HttpFramework",
      strategy = { type = "named", name = "hono-core" },
      optional = false,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/hono",
    version = "^3.12.0",
  },
  
  is_infrastructure = false,
}
