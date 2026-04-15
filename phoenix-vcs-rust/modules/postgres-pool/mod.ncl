{
  id = "postgres-pool",
  name = "PostgreSQL Connection Pool",
  description = "Connection pooling for PostgreSQL",
  version = "1.0.0",
  
  provides = [
    {
      interface = "Database",
      properties = {
        type = "pooled",
        flavor = "postgresql",
        max_connections = 20,
        features = ["pooling", "connection-reuse"],
      },
    }
  ],
  
  needs = [
    {
      interface = "DatabaseEngine",
      strategy = { type = "named", name = "postgres-core" },
      optional = false,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/pg-pool",
    version = "^3.6.0",
  },
  
  config_schema = {
    max = {
      type = "number",
      default = 20,
    },
    idle_timeout = {
      type = "number",
      default = 30000,
    },
  },
  
  is_infrastructure = false,
}
