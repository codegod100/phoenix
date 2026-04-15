{
  id = "postgres-core",
  name = "PostgreSQL Core",
  description = "PostgreSQL database engine",
  version = "15.0",
  
  provides = [
    {
      interface = "DatabaseEngine",
      properties = {
        type = "sql",
        flavor = "postgresql",
        persistence = "durable",
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
  
  is_infrastructure = true,
}
