{
  id = "todo-list",
  name = "Todo List Component",
  description = "Interactive todo management component",
  version = "1.0.0",
  
  provides = [
    {
      interface = "WebComponent",
      properties = {
        tag = "todo-list",
        category = "data",
        features = ["crud", "api-integration", "local-state"],
      },
    },
    {
      interface = "DataConsumer",  # Consumes API data
      properties = {
        endpoint = "/api/todos",
        methods = ["GET", "POST"],
      },
    }
  ],
  
  needs = [
    {
      interface = "ComponentFramework",
      strategy = { type = "first_available" },
      optional = false,
    },
    {
      interface = "HttpClient",  # For API calls
      strategy = { type = "first_available" },
      optional = false,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "local",
    path = "./components/todo-list/component.ts",
  },
  
  is_infrastructure = false,
}
