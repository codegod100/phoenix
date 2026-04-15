{
  id = "postgres",
  name = "PostgreSQL Database",
  description = "Production-grade SQL database",
  version = "15.0",
  
  provides = [
    {
      interface = "Database",
      properties = {
        type = "sql",
        persistence = "durable",
        max_connections = 100,
        features = ["transactions", "json", "fulltext"],
      },
      endpoint = "postgresql://localhost:5432",
      cost_per_hour = 0.05,
    },
    {
      interface = "Cache",  # Can also serve as cache
      properties = {
        type = "sql-backed",
        max_memory_mb = 512,
      },
    }
  ],
  
  needs = [],
  
  language = "nix",
  
  source = {
    type = "registry",
    name = "nixpkgs/postgresql",
    version = "15",
  },
  
  config_schema = {
    database = {
      type = "string",
      default = "app",
    },
    user = {
      type = "string",
      default = "postgres",
    },
    password = {
      type = "string",
      secret = true,
    },
  },
  
  is_infrastructure = true,
}
