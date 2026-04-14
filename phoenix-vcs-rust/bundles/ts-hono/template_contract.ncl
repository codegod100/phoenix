# Contract-Based Template for TypeScript-Hono
# 
# This template uses Nickel contracts to define the shape of the spec.
# The LLM generates Nickel code that must satisfy these contracts.

{
  # Contract: Application metadata
  name | String,
  description | String,
  
  # Fixed values (not generated)
  template = "ts-hono",
  build_type = "typescript",
  
  # Contract: Version info
  spec_version | String,
  version | String,
  
  # Contract: Server configuration
  server_config | {
    port | Number,
    host | String,
    
    # Contract: CORS configuration
    cors | {
      enabled | Bool,
      origins | Array String,
      methods | Array String,
      headers | Array String,
    },
    
    # Contract: Middleware stack
    middleware | Array Middleware,
  },
  
  # Contract: API routes - this is the main generated content
  routes | Array Route,
  
  # Contract: Data models (for request/response types)
  models | Dyn,
  
  # Contract: Integrations (database, cache, external APIs)
  integrations | Dyn,
  
  # Contract: Environment variables needed
  env_vars | Array String,
}

# Middleware contract - defines valid middleware shapes
let Middleware = {
  name | String,  # "logger", "cors", "auth", "rate-limit", "compression"
  enabled | Bool,
  config | Dyn,   # Middleware-specific configuration
} in {}

# Route contract - defines valid route shapes
let Route = {
  method | String,     # "GET", "POST", "PUT", "PATCH", "DELETE"
  path | String,       # e.g., "/users", "/api/v1/items/:id"
  handler | String,    # Description of what this endpoint does
  
  # Request contract
  request | {
    params | Dyn,      # URL parameters
    query | Dyn,       # Query string parameters
    body | Dyn,        # Request body schema
    headers | Dyn,     # Required headers
  },
  
  # Response contract
  response | {
    status | Number,   # HTTP status code
    body | Dyn,        # Response body schema
    headers | Dyn,     # Response headers
  },
  
  # Middleware specific to this route
  middleware | Array String,
} in {}
