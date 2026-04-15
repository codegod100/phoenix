# Application Composer
# Assembles fine-grained modules into complete applications

{
  # Import all available modules
  modules = {
    # HTTP stack
    hono-core = import "../../modules/hono-core/mod.ncl",
    hono-logger = import "../../modules/hono-logger/mod.ncl",
    hono-cors = import "../../modules/hono-cors/mod.ncl",
    hono-server = import "../../modules/hono-server/mod.ncl",
    
    # Database stack
    postgres-core = import "../../modules/postgres-core/mod.ncl",
    postgres-pool = import "../../modules/postgres-pool/mod.ncl",
    postgres-migrations = import "../../modules/postgres-migrations/mod.ncl",
    sqlite = import "../../modules/sqlite/mod.ncl",
    
    # Frontend stack
    vite-core = import "../../modules/vite-core/mod.ncl",
    vite-dev-server = import "../../modules/vite-dev-server/mod.ncl",
    elenajs-core = import "../../modules/elenajs-core/mod.ncl",
    
    # Components
    welcome-card = import "../../components/welcome-card/mod.ncl",
    todo-list = import "../../components/todo-list/mod.ncl",
  },
  
  # Predefined compositions (replacing bundles)
  compositions = {
    # Production: Full stack with Postgres
    production-fullstack = {
      name = "Production Elena Dashboard",
      modules = [
        "hono-core",
        "hono-logger",
        "hono-cors",
        "hono-server",
        "postgres-core",
        "postgres-pool",
        "postgres-migrations",
        "vite-core",
        "elenajs-core",
        "welcome-card",
        "todo-list",
      ],
      bindings = {
        # Fulfill needs
        "hono-logger".needs.0 = { fulfilled_by = "hono-core" },
        "hono-cors".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.1 = { fulfilled_by = "hono-logger" },
        "hono-server".needs.2 = { fulfilled_by = "hono-cors" },
        "postgres-pool".needs.0 = { fulfilled_by = "postgres-core" },
        "postgres-migrations".needs.0 = { fulfilled_by = "postgres-pool" },
        "welcome-card".needs.0 = { fulfilled_by = "elenajs-core" },
        "todo-list".needs.0 = { fulfilled_by = "elenajs-core" },
      },
    },
    
    # Development: SQLite instead of Postgres
    development-fullstack = {
      name = "Development Elena Dashboard",
      modules = [
        "hono-core",
        "hono-logger",
        "hono-server",
        "sqlite",
        "vite-core",
        "vite-dev-server",
        "elenajs-core",
        "welcome-card",
        "todo-list",
      ],
      bindings = {
        "hono-logger".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.1 = { fulfilled_by = "hono-logger" },
        "vite-dev-server".needs.0 = { fulfilled_by = "vite-core" },
        # SQLite fulfills Database directly (no pool needed)
        # hono-server gets sqlite as Database
        "welcome-card".needs.0 = { fulfilled_by = "elenajs-core" },
        "todo-list".needs.0 = { fulfilled_by = "elenajs-core" },
      },
      overrides = {
        # Override hono-server's Database need to use sqlite
        "hono-server".needs = {
          interface = "Database",
          strategy = { type = "named", name = "sqlite" },
        },
      },
    },
    
    # Minimal: Just Hono + SQLite (no frontend)
    minimal-api = {
      name = "Minimal API Server",
      modules = [
        "hono-core",
        "hono-logger",
        "hono-server",
        "sqlite",
      ],
      bindings = {
        "hono-logger".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.0 = { fulfilled_by = "hono-core" },
        "hono-server".needs.1 = { fulfilled_by = "hono-logger" },
      },
    },
    
    # Frontend only: No backend
    frontend-only = {
      name = "Frontend Only",
      modules = [
        "vite-core",
        "vite-dev-server",
        "elenajs-core",
        "welcome-card",
        "todo-list",
      ],
      bindings = {
        "vite-dev-server".needs.0 = { fulfilled_by = "vite-core" },
        "welcome-card".needs.0 = { fulfilled_by = "elenajs-core" },
        "todo-list".needs.0 = { fulfilled_by = "elenajs-core" },
      },
    },
  },
  
  # Helper: Get all providers for an interface
  find_providers = fun interface_name =>
    std.record.values modules
    |> std.array.filter (fun m =>
      std.array.any (fun p => p.interface == interface_name) m.provides
    ),
  
  # Helper: Resolve needs for a composition
  resolve = fun composition_name =>
    let comp = compositions."${composition_name}" in
    let resolved = std.array.map (fun mod_name =>
      let mod = modules."${mod_name}" in
      {
        module = mod_name,
        fulfilled_needs = std.array.map (fun need =>
          let binding = std.record.get_or need.interface {} comp.bindings in
          {
            need = need.interface,
            fulfilled_by = std.record.get_or "fulfilled_by" "unknown" binding,
          }
        ) mod.needs,
      }
    ) comp.modules in
    {
      name = comp.name,
      modules = comp.modules,
      resolutions = resolved,
    },
  
  # Generate docker-compose from composition
  to_docker_compose = fun composition_name =>
    let comp = resolve composition_name in
    {
      version = "3.8",
      services = std.record.from_array (
        std.array.map (fun mod_name =>
          let mod = modules."${mod_name}" in
          {
            name = mod.id,
            value = {
              image = "${mod.language}:${mod.version}",
              environment = std.record.from_array (
                std.array.map (fun need =>
                  let binding = std.record.get_or need.interface {} comp.bindings in
                  {
                    name = "${need.interface}_URL",
                    value = "http://${std.record.get_or "fulfilled_by" "unknown" binding}:3000",
                  }
                ) mod.needs
              ),
            },
          }
        ) comp.modules
      ),
    },
}
