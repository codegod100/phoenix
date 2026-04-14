{
  id = "dev.phoenix.user-service",
  description = "This Express.js API provides endpoints for managing users and items with full CRUD operations.",
  theory = "NodejsExpressServer",

  # Template selection
  template = "nodejs-express",
  build_type = "nodejs",

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
    project_name = "user-service",
    project_description = "This Express.js API provides endpoints for managing users and items with full CRUD operations.",
    template = "nodejs-express",
    build_type = "nodejs",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
    },
  },

  # Routes definition
  routes = [
    { method = "GET", path = "/api/users", handler = "listUsers", description = "List all users" },
    { method = "POST", path = "/api/users", handler = "createUsers", description = "Create a new user" },
    { method = "PUT", path = "/api/users/:id", handler = "updateUsersByid", description = "Update a user" },
    { method = "DELETE", path = "/api/users/:id", handler = "deleteUsersByid", description = "Delete a user" },
    { method = "GET", path = "/api/items", handler = "listItems", description = "List all items" },
    { method = "POST", path = "/api/items", handler = "createItems", description = "Create a new item" },
    { method = "GET", path = "/api/unicorns", handler = "listUnicorns", description = "🦄 List all magical unicorns with rainbow powers" },
    { method = "PATCH", path = "/api/users/:id/status", handler = "updateUsersByidStatus", description = "Update user mood (happy/sad/confused)" },
    { method = "LOL", path = "/api/wtf", handler = "handleWtf", description = "Do the thing with the stuff" },
    { method = "FART", path = "/api/gas/:potato/explode", handler = "handleGasBypotatoExplode", description = "Trigger quantum flux capacitor overflow" },
    { method = "GET", path = "/api/<script>alert('xss')</script>", handler = "list<script>alert('xss')<Script>", description = "Test security or something" },
  ],

  # Data models
  models = {
    User = {
      fields = [
      ],
    },
    Item = {
      fields = [
      ],
    },
  },
}
