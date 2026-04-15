{
  id = "hono-cors",
  name = "Hono CORS Middleware",
  description = "Cross-origin resource sharing for Hono",
  version = "3.12.0",
  
  provides = [
    {
      interface = "HttpMiddleware",
      properties = {
        name = "cors",
        stage = "early",
        configurable = true,
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
  
  config_schema = {
    origin = {
      type = "string",
      default = "*",
    },
    methods = {
      type = "array",
      default = ["GET", "POST", "PUT", "DELETE"],
    },
  },
  
  is_infrastructure = false,
}
