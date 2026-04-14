# Task: Generate Panproto TheoryDocument from Markdown

You are a theory document generator. Your task is to read a human-readable spec 
and generate a valid panproto TheoryDocument.

## Input Specification (Markdown)
```markdown
{{spec_content}}
```

## Target Contract (Nickel)
```nickel
{{contract_content}}
```

## CRITICAL: Decomposed Sorts (No ServerConfig Wrapper!)

Instead of one big ServerConfig sort, DECOMPOSE into separate sorts:
- ProjectName (val sort - holds the string)
- ProjectDescription (val sort - holds the string)
- Port, Host (val sorts)
- Routes (structural sort - holds route definitions)
- MiddlewareStack (structural sort)
- CORSConfig (structural sort)

## Required Structure

```nickel
{
  id = "dev.phoenix.{project-name}",
  description = "Human-readable description",
  theory = "{ProjectName}API",
  
  # Sorts - each API concept is its own sort!
  sorts = [
    # Artifact sub-theories
    { name = "ThPackageJson", kind = { type = "structural" } },
    { name = "ThTsConfig", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThServer", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    
    # Value sorts (kind with type and value_kind)
    { name = "ProjectName", kind = { type = "val", value_kind = "string" } },
    { name = "ProjectDescription", kind = { type = "val", value_kind = "string" } },
    { name = "Port", kind = { type = "val", value_kind = "integer" } },
    { name = "Host", kind = { type = "val", value_kind = "string" } },
    
    # API structural sorts
    { name = "RouteTable", kind = { type = "structural" } },
    { name = "MiddlewareStack", kind = { type = "structural" } },
    { name = "CORSConfig", kind = { type = "structural" } },
    { name = "EnvVars", kind = { type = "structural" } },
    
    # HTTP methods (each is a sort)
    { name = "GET", kind = { type = "structural" } },
    { name = "POST", kind = { type = "structural" } },
    { name = "PUT", kind = { type = "structural" } },
    { name = "PATCH", kind = { type = "structural" } },
    { name = "DELETE", kind = { type = "structural" } },
    
    # Route types
    { name = "HealthRoute", kind = { type = "structural" } },
    { name = "ListRoute", kind = { type = "structural" } },
    { name = "GetRoute", kind = { type = "structural" } },
    { name = "CreateRoute", kind = { type = "structural" } },
    { name = "UpdateRoute", kind = { type = "structural" } },
    { name = "DeleteRoute", kind = { type = "structural" } },
    
    # Middleware types
    { name = "Logger", kind = { type = "structural" } },
    { name = "CORS", kind = { type = "structural" } },
    { name = "Auth", kind = { type = "structural" } },
    { name = "RateLimit", kind = { type = "structural" } },
    
    # Primitives
    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
  ],
  
  # Operations - one constructor per sort
  ops = [
    # Sub-theory generation
    { name = "generate_package_json", inputs = [...], output = "JSON" },
    { name = "generate_tsconfig", inputs = [...], output = "JSON" },
    { name = "generate_nix", inputs = [...], output = "Nix" },
    { name = "generate_server", inputs = [...], output = "TypeScript" },
    { name = "generate_readme", inputs = [...], output = "Markdown" },
    
    # Value constructors (mk_X creates sort X)
    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_port", inputs = [{ name = "port", sort = "Number" }], output = "Port" },
    { name = "mk_host", inputs = [{ name = "host", sort = "String" }], output = "Host" },
    
    # Route constructors
    { name = "mk_health_route", inputs = [{ name = "path", sort = "String" }], output = "HealthRoute" },
    { name = "mk_list_route", inputs = [{ name = "path", sort = "String" }, { name = "resource", sort = "String" }], output = "ListRoute" },
    { name = "mk_get_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "GetRoute" },
    { name = "mk_create_route", inputs = [{ name = "path", sort = "String" }, { name = "resource", sort = "String" }], output = "CreateRoute" },
    { name = "mk_update_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "UpdateRoute" },
    { name = "mk_delete_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "DeleteRoute" },
    
    # Middleware constructors
    { name = "mk_logger", inputs = [{ name = "enabled", sort = "Bool" }], output = "Logger" },
    { name = "mk_cors", inputs = [{ name = "origins", sort = "Array String" }, { name = "methods", sort = "Array String" }], output = "CORS" },
    { name = "mk_rate_limit", inputs = [{ name = "max_requests", sort = "Number" }, { name = "window", sort = "Number" }], output = "RateLimit" },
    
    # Composition
    { name = "mk_route_table", inputs = [{ name = "routes", sort = "Array Route" }], output = "RouteTable" },
    { name = "mk_middleware_stack", inputs = [{ name = "middleware", sort = "Array Middleware" }], output = "MiddlewareStack" },
    
    # Final composition for ThNix
    {
      name = "compose_app",
      inputs = [
        { name = "name", sort = "ProjectName" },
        { name = "desc", sort = "ProjectDescription" },
        { name = "port", sort = "Port" },
        { name = "host", sort = "Host" },
        { name = "routes", sort = "RouteTable" },
        { name = "middleware", sort = "MiddlewareStack" },
      ],
      output = "ThIntegratedApp"
    },
  ],
  
  # Phoenix instance data
  phoenix_config = {
    project_name = "Extracted from # heading",
    project_description = "Extracted from ## Overview",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
      cors = {
        enabled = true,
        origins = ["*"],
        methods = ["GET", "POST", "PUT", "DELETE"],
        headers = ["Content-Type", "Authorization"],
      },
      middleware = [
        { name = "logger", enabled = true, config = {} },
        { name = "cors", enabled = true, config = {} },
        { name = "rate-limit", enabled = true, config = { max_requests = 100, window = 60 } },
      ],
    },
    routes = [
      # Extract all routes from ## API Endpoints section
      # Example:
      # { method = "GET", path = "/health", handler = "Health check", request = {}, response = { status = 200 }, middleware = [] }
    ],
    env_vars = [
      # Extract from ## Environment Variables
      "PORT",
      "HOST",
      "LOG_LEVEL",
    ],
  },
  
  # Metadata
  template = "ts-hono",
  build_type = "typescript",
  version = "0.1.0",
  spec_version = "1.0",
}
```

## KEY INSIGHT: Decomposed Sorts

- **val sorts**: Hold actual values (Port = 3000, Host = "0.0.0.0")
  - Use: `{ kind = { type = "val", value_kind = "string" } }` or `value_kind = "integer"`
- **structural sorts**: Hold structure (RouteTable, MiddlewareStack)
  - Use: `{ kind = { type = "structural" } }`
- Each concept has its own sort - no ServerConfig wrapper!
- ThNix composes the sorts together in compose_app

## Route Extraction Rules

From `## API Endpoints` section:
- **GET /path** → `mk_list_route` or `mk_health_route`
- **GET /path/:id** → `mk_get_route` with `param = "id"`
- **POST /path** → `mk_create_route`
- **PUT /path/:id** → `mk_update_route`
- **PATCH /path/:id** → `mk_update_route`
- **DELETE /path/:id** → `mk_delete_route`

## Middleware Extraction

From `## Middleware Stack` or `## Configuration`:
- **logger** → `{ name = "logger", enabled = true, config = {} }`
- **cors** → Extract origins and methods from description
- **auth/jwt** → `{ name = "auth", enabled = true, config = { jwt_secret = "..." } }`
- **rate-limit** → Extract max_requests and window

## CRITICAL RULES

1. **NO ServerConfig sort** - decompose into Port, Host, RouteTable, MiddlewareStack, etc.
2. **val sorts** for primitive values: `{ kind = { type = "val", value_kind = "string" } }` or `value_kind = "integer"`
3. **structural sorts** for complex types: `{ kind = { type = "structural" } }`
4. One constructor per sort: `mk_port`, `mk_logger`, `mk_get_route`, etc.
5. `compose_app` brings all the decomposed sorts together for ThIntegratedApp
6. Extract routes from `## API Endpoints` section
7. Extract middleware from `## Middleware Stack` section

## OUTPUT

Output ONLY the complete Nickel TheoryDocument with decomposed sorts.
No markdown code fences, no explanations.
