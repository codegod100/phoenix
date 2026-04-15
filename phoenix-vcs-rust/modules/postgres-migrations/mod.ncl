{
  id = "postgres-migrations",
  name = "PostgreSQL Migrations",
  description = "Schema migrations for PostgreSQL",
  version = "1.0.0",
  
  provides = [
    {
      interface = "DatabaseMigrations",
      properties = {
        type = "sql",
        direction = "up-down",
      },
    },
    {
      interface = "DatabaseLifecycle",
      properties = {
        stage = "schema-setup",
      },
    }
  ],
  
  needs = [
    {
      interface = "Database",
      strategy = { type = "constrained", constraints = [
        { type = "property_equals", property = "flavor", value = "postgresql" }
      ]},
      optional = false,
    }
  ],
  
  language = "typescript",
  
  source = {
    type = "registry",
    name = "npm/node-pg-migrate",
    version = "^6.2.0",
  },
  
  is_infrastructure = false,
}
