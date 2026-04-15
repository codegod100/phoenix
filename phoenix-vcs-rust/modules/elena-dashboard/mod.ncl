{
  id = "elena-dashboard",
  name = "Elena Dashboard",
  description = "Modern dashboard with ElenaJS web components",
  version = "1.0.0",
  
  provides = [
    {
      interface = "WebComponents",
      properties = {
        framework = "elenajs",
        component_count = 3,
      },
      endpoint = "http://localhost:5173",
    },
    {
      interface = "HttpServer",  # Can also serve static files
      properties = {
        type = "static",
        framework = "vite",
      },
    }
  ],
  
  needs = [
    {
      interface = "HttpServer",
      strategy = {
        type = "first_available",
      },
      optional = false,
    },
    {
      interface = "Database", 
      strategy = {
        type = "constrained",
        constraints = [
          { type = "has_property", property = "persistence" },
        ],
      },
      optional = false,
    },
    {
      interface = "Cache",
      strategy = {
        type = "first_available",
      },
      optional = true,
    },
  ],
  
  language = "typescript",
  
  source = {
    type = "local",
    path = "./apps/elena",
  },
  
  config_schema = {
    api_url = {
      type = "string",
      default = "http://localhost:3000",
    },
    title = {
      type = "string",
      default = "Elena Dashboard",
    },
  },
  
  is_infrastructure = false,
}
