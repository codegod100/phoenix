{
  id = "dev.phoenix.hono-api-server",
  description = "A fast, lightweight REST API server built with Hono and TypeScript. Designed for edge deployment with Bun runtime.",
  theory = "HonoAPIServer",

  sorts = [
    { name = "ThPackageJson", kind = { type = "structural" } },
    { name = "ThTsConfig", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThServer", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },

    { name = "ProjectName", kind = { type = "val", value_kind = "string" } },
    { name = "ProjectDescription", kind = { type = "val", value_kind = "string" } },
    { name = "Port", kind = { type = "val", value_kind = "integer" } },
    { name = "Host", kind = { type = "val", value_kind = "string" } },

    { name = "RouteTable", kind = { type = "structural" } },
    { name = "MiddlewareStack", kind = { type = "structural" } },
    { name = "CORSConfig", kind = { type = "structural" } },
    { name = "EnvVars", kind = { type = "structural" } },

    { name = "GET", kind = { type = "structural" } },
    { name = "POST", kind = { type = "structural" } },
    { name = "PUT", kind = { type = "structural" } },
    { name = "DELETE", kind = { type = "structural" } },

    { name = "HealthRoute", kind = { type = "structural" } },
    { name = "ListUsersRoute", kind = { type = "structural" } },
    { name = "GetUserRoute", kind = { type = "structural" } },
    { name = "CreateUserRoute", kind = { type = "structural" } },
    { name = "UpdateUserRoute", kind = { type = "structural" } },
    { name = "DeleteUserRoute", kind = { type = "structural" } },
    { name = "ListItemsRoute", kind = { type = "structural" } },
    { name = "GetItemRoute", kind = { type = "structural" } },
    { name = "CreateItemRoute", kind = { type = "structural" } },

    { name = "Logger", kind = { type = "structural" } },
    { name = "CORS", kind = { type = "structural" } },
    { name = "RateLimit", kind = { type = "structural" } },

    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
    { name = "ArrayString", kind = { type = "structural" } },
  ],

  ops = [
    { name = "generate_package_json", inputs = [{ name = "name", sort = "ProjectName" }], output = "ThPackageJson" },
    { name = "generate_tsconfig", inputs = [], output = "ThTsConfig" },
    { name = "generate_nix", inputs = [{ name = "name", sort = "ProjectName" }], output = "ThNix" },
    { name = "generate_server", inputs = [{ name = "routes", sort = "RouteTable" }, { name = "middleware", sort = "MiddlewareStack" }, { name = "cors", sort = "CORSConfig" }], output = "ThServer" },
    { name = "generate_readme", inputs = [{ name = "name", sort = "ProjectName" }, { name = "desc", sort = "ProjectDescription" }], output = "ThREADME" },

    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_project_description", inputs = [{ name = "description", sort = "String" }], output = "ProjectDescription" },
    { name = "mk_port", inputs = [{ name = "port", sort = "Number" }], output = "Port" },
    { name = "mk_host", inputs = [{ name = "host", sort = "String" }], output = "Host" },

    { name = "mk_logger", inputs = [{ name = "enabled", sort = "Bool" }], output = "Logger" },
    { name = "mk_cors", inputs = [{ name = "origins", sort = "ArrayString" }, { name = "methods", sort = "ArrayString" }], output = "CORS" },
    { name = "mk_rate_limit", inputs = [{ name = "max_requests", sort = "Number" }, { name = "window", sort = "Number" }], output = "RateLimit" },

    { name = "mk_health_route", inputs = [{ name = "path", sort = "String" }], output = "HealthRoute" },
    { name = "mk_list_users_route", inputs = [{ name = "path", sort = "String" }], output = "ListUsersRoute" },
    { name = "mk_get_user_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "GetUserRoute" },
    { name = "mk_create_user_route", inputs = [{ name = "path", sort = "String" }], output = "CreateUserRoute" },
    { name = "mk_update_user_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "UpdateUserRoute" },
    { name = "mk_delete_user_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "DeleteUserRoute" },
    { name = "mk_list_items_route", inputs = [{ name = "path", sort = "String" }], output = "ListItemsRoute" },
    { name = "mk_get_item_route", inputs = [{ name = "path", sort = "String" }, { name = "param", sort = "String" }], output = "GetItemRoute" },
    { name = "mk_create_item_route", inputs = [{ name = "path", sort = "String" }], output = "CreateItemRoute" },

    { name = "mk_route_table", inputs = [{ name = "routes", sort = "ArrayString" }], output = "RouteTable" },
    { name = "mk_middleware_stack", inputs = [{ name = "middleware", sort = "ArrayString" }], output = "MiddlewareStack" },
    { name = "mk_cors_config", inputs = [{ name = "enabled", sort = "Bool" }, { name = "origins", sort = "ArrayString" }, { name = "methods", sort = "ArrayString" }], output = "CORSConfig" },
    { name = "mk_env_vars", inputs = [{ name = "vars", sort = "ArrayString" }], output = "EnvVars" },

    {
      name = "compose_app",
      inputs = [
        { name = "name", sort = "ProjectName" },
        { name = "desc", sort = "ProjectDescription" },
        { name = "port", sort = "Port" },
        { name = "host", sort = "Host" },
        { name = "routes", sort = "RouteTable" },
        { name = "middleware", sort = "MiddlewareStack" },
        { name = "cors", sort = "CORSConfig" },
        { name = "env_vars", sort = "EnvVars" },
      ],
      output = "ThIntegratedApp"
    },
  ],

  phoenix_config = {
    project_name = "Hono API Server",
    project_description = "A fast, lightweight REST API server built with Hono and TypeScript. Designed for edge deployment with Bun runtime.",
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
      { method = "GET", path = "/health", handler = "Server health status", request = {}, response = { status = "ok", timestamp = "ISO8601" }, middleware = [] },
      { method = "GET", path = "/api/users", handler = "List all users", request = { query = ["limit", "offset"] }, response = { users = "array", total = "number" }, middleware = ["rate-limit"] },
      { method = "GET", path = "/api/users/:id", handler = "Get user by ID", request = { params = ["id"] }, response = { id = "string", name = "string", email = "string" }, middleware = ["rate-limit"] },
      { method = "POST", path = "/api/users", handler = "Create new user", request = { body = ["name", "email"] }, response = { id = "string", created = true }, status = 201, middleware = ["rate-limit"] },
      { method = "PUT", path = "/api/users/:id", handler = "Full update user", request = { params = ["id"], body = ["name", "email"] }, response = { id = "string", updated = true }, middleware = ["rate-limit"] },
      { method = "DELETE", path = "/api/users/:id", handler = "Delete user", request = { params = ["id"] }, response = {}, status = 204, middleware = ["rate-limit"] },
      { method = "GET", path = "/api/items", handler = "List all items", request = { query = ["category", "sort", "limit"] }, response = { items = "array", meta = { total = "number" } }, middleware = ["rate-limit"] },
      { method = "GET", path = "/api/items/:id", handler = "Get item by ID", request = { params = ["id"] }, response = { id = "string", name = "string", price = "number" }, middleware = ["rate-limit"] },
      { method = "POST", path = "/api/items", handler = "Create new item", request = { body = ["name", "price", "category"] }, response = { id = "string", created = true }, status = 201, middleware = ["rate-limit"] },
    ],
    env_vars = [
      "PORT",
      "HOST",
      "LOG_LEVEL",
      "CORS_ORIGINS",
      "RATE_LIMIT_WINDOW",
      "RATE_LIMIT_MAX",
    ],
  },

  template = "ts-hono",
  build_type = "typescript",
  version = "0.1.0",
  spec_version = "1.0",
}