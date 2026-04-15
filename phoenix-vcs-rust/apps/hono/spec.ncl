{
  id = "dev.phoenix.hono-api-server",
  description = "A fast, lightweight REST API server built with Hono and TypeScript. Designed for edge deployment with Bun runtime.",
  theory = "TypescriptHonoServer",

  # Template selection
  template = "ts-hono",
  build_type = "typescript",

  # Sorts - domain types
  sorts = [
    { name = "ThPackageJson", kind = {{ type = "structural" }} },
    { name = "ThApp", kind = {{ type = "structural" }} },
    { name = "ThNix", kind = {{ type = "structural" }} },
    { name = "ThREADME", kind = {{ type = "structural" }} },
    { name = "ThIntegratedApp", kind = {{ type = "structural" }} },

    { name = "ProjectName", kind = {{ type = "val", value_kind = "string" }} },
    { name = "ProjectDescription", kind = {{ type = "val", value_kind = "string" }} },
    { name = "Port", kind = {{ type = "val", value_kind = "integer" }} },
    { name = "Host", kind = {{ type = "val", value_kind = "string" }} },

    { name = "RouteTable", kind = {{ type = "structural" }} },
    { name = "ModelDef", kind = {{ type = "structural" }} },

    # HTTP Methods
    { name = "GET", kind = {{ type = "structural" }} },
    { name = "POST", kind = {{ type = "structural" }} },
    { name = "PUT", kind = {{ type = "structural" }} },
    { name = "DELETE", kind = {{ type = "structural" }} },
  ],

  # Operations - constructors
  ops = [
    { name = "generate_package_json", inputs = [{ name = "name", sort = "ProjectName" }], output = "ThPackageJson" },
    { name = "generate_app", inputs = [{ name = "routes", sort = "RouteTable" }], output = "ThApp" },
    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_route_table", inputs = [{ name = "routes", sort = "String" }], output = "RouteTable" },
  ],

  phoenix_config = {
    project_name = "hono-api-server",
    project_description = "A fast, lightweight REST API server built with Hono and TypeScript. Designed for edge deployment with Bun runtime.",
    template = "ts-hono",
    build_type = "typescript",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
    },
  },

  # Routes definition
  routes = [
    { method = "GET", path = "/health", handler = "listHealth", description = "Server health status" },
    { method = "GET", path = "/api/users", handler = "listUsers", description = "List all users" },
    { method = "GET", path = "/api/users/:id", handler = "getUsersByid", description = "Get user by ID" },
    { method = "POST", path = "/api/users", handler = "createUsers", description = "Create new user" },
    { method = "PUT", path = "/api/users/:id", handler = "updateUsersByid", description = "Full update" },
    { method = "DELETE", path = "/api/users/:id", handler = "deleteUsersByid", description = "Delete user" },
    { method = "GET", path = "/api/items", handler = "listItems", description = "List all items" },
    { method = "GET", path = "/api/items/:id", handler = "getItemsByid", description = "Get item by ID" },
    { method = "POST", path = "/api/items", handler = "createItems", description = "Create new item" },
    { method = "GET", path = "/api/status", handler = "listStatus", description = "Get API status" },
  ],

}
