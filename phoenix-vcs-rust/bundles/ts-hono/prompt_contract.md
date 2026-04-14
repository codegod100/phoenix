# Task: Generate Nickel Spec from Markdown Using Contracts

You are a specification generator. Your task is to read a human-readable spec 
and generate a valid Nickel configuration that satisfies a given contract.

## Input Specification (Markdown)
```markdown
{{spec_content}}
```

## Target Contract (Nickel)
```nickel
{{contract_content}}
```

## Contract Explanation

The contract defines a record with:
- **Fields with `| Type`**: These are CONTRACTS - you MUST provide values of that type
- **Fields with `=`**: These are FIXED values - do NOT change them
- **`let ContractName = {...} in {}`**: Type definitions for nested structures

Example contract field:
```nickel
name | String,  # CONTRACT: Must provide a string value
```

Your output MUST satisfy: `name` is a string like `"MyApp"`

## Route Contract

The `routes | Array Route` field expects an array where each item has:
- `method`: HTTP method ("GET", "POST", "PUT", "PATCH", "DELETE")
- `path`: URL path pattern (e.g., "/users", "/items/:id", "/api/v1/status")
- `handler`: Description of what this endpoint does
- `request`: Object with `params`, `query`, `body`, `headers` fields
- `response`: Object with `status`, `body`, `headers` fields
- `middleware`: Array of middleware names to apply

Common route patterns from the spec:
- **GET list** → `{ method = "GET", path = "/items", handler = "List all items", request = {}, response = { status = 200, body = { items = [] } }, middleware = [] }`
- **GET by ID** → `{ method = "GET", path = "/items/:id", handler = "Get item by ID", request = { params = { id = "string" } }, response = { status = 200, body = { id = "", name = "" } }, middleware = [] }`
- **POST create** → `{ method = "POST", path = "/items", handler = "Create new item", request = { body = { name = "", value = 0 } }, response = { status = 201, body = { id = "", created = true } }, middleware = [] }`
- **PUT update** → `{ method = "PUT", path = "/items/:id", handler = "Update item", request = { params = { id = "string" }, body = { name = "" } }, response = { status = 200, body = { updated = true } }, middleware = [] }`
- **DELETE** → `{ method = "DELETE", path = "/items/:id", handler = "Delete item", request = { params = { id = "string" } }, response = { status = 204, body = {} }, middleware = [] }`

## Middleware Contract

The `middleware | Array Middleware` expects:
```nickel
[
  { name = "logger", enabled = true, config = {} },
  { name = "cors", enabled = true, config = { origins = ["*"] } },
  { name = "auth", enabled = true, config = { jwt_secret = "${JWT_SECRET}" } },
  { name = "rate-limit", enabled = true, config = { max_requests = 100, window = 60 } },
]
```

Common middleware:
- **logger** - Request/response logging
- **cors** - Cross-origin resource sharing
- **auth** - JWT or API key authentication
- **rate-limit** - Rate limiting
- **compression** - Response compression
- **helmet** - Security headers

## Generation Rules

1. **Satisfy ALL contracts**: Every field marked with `| Type` must have a value
2. **Keep FIXED values**: Never change fields with `=` (like `template = "ts-hono"`)
3. **Extract from spec**: All values must come from the markdown spec provided
4. **Use proper Nickel syntax**:
   - Strings: `"value"` (with quotes)
   - Numbers: `42` (no quotes)
   - Booleans: `true` or `false`
   - Arrays: `[item1, item2]`
   - Records: `{ field = value, ... }`

## Required Output Structure

Generate a COMPLETE Nickel record that looks like:

```nickel
{
  name = "Extracted from # heading",
  description = "Extracted from ## Overview",
  template = "ts-hono",  # FIXED - do not change
  build_type = "typescript",  # FIXED - do not change
  spec_version = "1.0",
  version = "0.1.0",
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
      # Generate from ## Middleware section
    ],
  },
  routes = [
    # Generate routes from ## API Endpoints section
  ],
  models = {},  # Extract from ## Data Models if present
  integrations = {},  # Extract from ## Integrations if present
  env_vars = [],  # Extract environment variables mentioned
}
```

## OUTPUT

Output ONLY the complete Nickel record. No markdown code fences, no explanations.
The output must be valid Nickel syntax that could be type-checked against the contract.
