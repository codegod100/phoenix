# Contract-Based Template for TypeScript-Hono (Theory Document Format)
# 
# Architecture: Server/API concepts are DECOMPOSED into separate sorts
# Each concept (route, middleware, config, etc.) is its own sort!

# Forward declarations for types
let rec
  # Route definition
  Route = {
    method | String,     # GET, POST, PUT, PATCH, DELETE
    path | String,       # "/api/users", "/items/:id"
    handler | String,    # Description of what this does
    request | { _ : Dyn },
    response | { _ : Dyn },
    middleware | Array String,
  },
  
  # Middleware configuration
  Middleware = {
    name | String,       # "logger", "cors", "auth", "rate-limit"
    enabled | Bool,
    config | { _ : Dyn },
  },
  
  # CORS configuration
  CORS = {
    enabled | Bool,
    origins | Array String,
    methods | Array String,
    headers | Array String,
  },
  
  # Server configuration
  ServerConfig = {
    port | Number,
    host | String,
    cors | CORS,
    middleware | Array Middleware,
  },
  
  # Input for operation
  InputSpec = {
    name | String,
    sort | String,
  },
  
  # Sort kind
  ValKind = { type | String, value_kind | String },
  StructuralKind = { type | String },
  
  # Sort declaration
  SortSpec = {
    name | String,
    kind | { type | String },
  },
  
  # Operation
  OpSpec = {
    name | String,
    inputs | Array InputSpec,
    output | String,
  },
  
  # Phoenix instance config
  PhoenixConfig = {
    project_name | String,
    project_description | String,
    server_config | ServerConfig,
    routes | Array Route,
    env_vars | Array String,
  }

# TheoryDocument format - each API concept is its own sort!
in {
  # Required fields
  id | String,
  description | String,
  theory | String,
  
  # Sorts - each API concept is a FIRST-CLASS SORT
  sorts | Array SortSpec,
  
  # Operations - constructors for each sort
  ops | Array OpSpec,
  
  # Phoenix instance data
  phoenix_config | PhoenixConfig,
  
  # Metadata
  template | String,
  build_type | String,
  version | String,
  spec_version | String,
}
