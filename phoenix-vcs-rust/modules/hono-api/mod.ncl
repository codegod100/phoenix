{
  id = "hono-api",
  name = "Hono HTTP Server",
  description = "Fast, lightweight HTTP server using Hono framework",
  version = "3.12.0",
  
  provides = [
    {
      interface = "HttpServer",
      properties = {
        framework = "hono",
        runtime = "bun",
        protocol = "http",
      },
      endpoint = "http://localhost:3000",
    }
  ],
  
  needs = [],  # Infrastructure module, no external needs
  
  language = "typescript",
  
  source = {
    type = "git",
    url = "https://github.com/honojs/node-server",
    reference = "main",
  },
  
  config_schema = {
    port = {
      type = "number",
      default = 3000,
    },
    host = {
      type = "string", 
      default = "0.0.0.0",
    },
    middleware = {
      type = "array",
      items = { type = "string" },
      default = ["logger", "cors"],
    },
  },
  
  is_infrastructure = true,
}
