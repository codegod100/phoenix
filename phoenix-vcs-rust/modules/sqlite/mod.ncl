{
  id = "sqlite",
  name = "SQLite Database",
  description = "Lightweight embedded SQL database",
  version = "3.44",
  
  provides = [
    {
      interface = "Database",
      properties = {
        type = "sql",
        persistence = "file",
        embedded = true,
        features = ["zero-config", "serverless"],
      },
      endpoint = "file:./data/app.db",
      cost_per_hour = 0.0,
    }
  ],
  
  needs = [],
  
  language = "nix",
  
  source = {
    type = "inline",
    code = "sqlite3",
  },
  
  config_schema = {
    path = {
      type = "string",
      default = "./data/app.db",
    },
  },
  
  is_infrastructure = true,
}
