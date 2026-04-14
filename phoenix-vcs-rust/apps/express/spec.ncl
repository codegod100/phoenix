{
  id = "dev.phoenix.express-demo-api",
  description = "Express.js REST API with User and Item management",
  theory = "NodejsExpressServer",

  # Template selection
  template = "nodejs-express",
  build_type = "nodejs",

  # Sorts - domain types for Express API
  sorts = [
    { name = "ThPackageJson", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },

    { name = "ProjectName", kind = { type = "val", value_kind = "string" } },
    { name = "ProjectDescription", kind = { type = "val", value_kind = "string" } },
    { name = "Port", kind = { type = "val", value_kind = "integer" } },
    { name = "Host", kind = { type = "val", value_kind = "string" } },

    { name = "RouteTable", kind = { type = "structural" } },
    { name = "MiddlewareStack", kind = { type = "structural" } },
    { name = "ModelDef", kind = { type = "structural" } },
    { name = "ControllerDef", kind = { type = "structural" } },

    # HTTP Methods
    { name = "GET", kind = { type = "structural" } },
    { name = "POST", kind = { type = "structural" } },
    { name = "PUT", kind = { type = "structural" } },
    { name = "DELETE", kind = { type = "structural" } },

    # Routes
    { name = "HealthRoute", kind = { type = "structural" } },
    { name = "ListUsersRoute", kind = { type = "structural" } },
    { name = "GetUserRoute", kind = { type = "structural" } },
    { name = "CreateUserRoute", kind = { type = "structural" } },
    { name = "UpdateUserRoute", kind = { type = "structural" } },
    { name = "DeleteUserRoute", kind = { type = "structural" } },
    { name = "ListItemsRoute", kind = { type = "structural" } },
    { name = "GetItemRoute", kind = { type = "structural" } },
    { name = "CreateItemRoute", kind = { type = "structural" } },
    { name = "UpdateItemRoute", kind = { type = "structural" } },
    { name = "DeleteItemRoute", kind = { type = "structural" } },

    # Middleware
    { name = "Cors", kind = { type = "structural" } },
    { name = "Helmet", kind = { type = "structural" } },
    { name = "Morgan", kind = { type = "structural" } },
    { name = "BodyParser", kind = { type = "structural" } },
    { name = "ErrorHandler", kind = { type = "structural" } },

    # Models
    { name = "UserModel", kind = { type = "structural" } },
    { name = "ItemModel", kind = { type = "structural" } },

    # Base types
    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
    { name = "Date", kind = { type = "structural" } },
    { name = "ObjectId", kind = { type = "structural" } },
  ],

  # Operations - constructors
  ops = [
    { name = "generate_package_json", inputs = [{ name = "name", sort = "ProjectName" }], output = "ThPackageJson" },
    { name = "generate_app", inputs = [{ name = "routes", sort = "RouteTable" }, { name = "models", sort = "ModelDef" }, { name = "middleware", sort = "MiddlewareStack" }], output = "ThApp" },
    { name = "generate_nix", inputs = [{ name = "name", sort = "ProjectName" }], output = "ThNix" },
    { name = "generate_readme", inputs = [{ name = "name", sort = "ProjectName" }, { name = "desc", sort = "ProjectDescription" }], output = "ThREADME" },

    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_project_description", inputs = [{ name = "description", sort = "String" }], output = "ProjectDescription" },
    { name = "mk_port", inputs = [{ name = "port", sort = "Number" }], output = "Port" },
    { name = "mk_host", inputs = [{ name = "host", sort = "String" }], output = "Host" },

    # Middleware
    { name = "mk_cors", inputs = [], output = "Cors" },
    { name = "mk_helmet", inputs = [], output = "Helmet" },
    { name = "mk_morgan", inputs = [], output = "Morgan" },
    { name = "mk_body_parser", inputs = [], output = "BodyParser" },
    { name = "mk_error_handler", inputs = [], output = "ErrorHandler" },

    # Routes
    { name = "mk_health_route", inputs = [{ name = "path", sort = "String" }], output = "HealthRoute" },
    { name = "mk_list_users_route", inputs = [{ name = "path", sort = "String" }], output = "ListUsersRoute" },
    { name = "mk_get_user_route", inputs = [{ name = "path", sort = "String" }], output = "GetUserRoute" },
    { name = "mk_create_user_route", inputs = [{ name = "path", sort = "String" }], output = "CreateUserRoute" },
    { name = "mk_update_user_route", inputs = [{ name = "path", sort = "String" }], output = "UpdateUserRoute" },
    { name = "mk_delete_user_route", inputs = [{ name = "path", sort = "String" }], output = "DeleteUserRoute" },
    { name = "mk_list_items_route", inputs = [{ name = "path", sort = "String" }], output = "ListItemsRoute" },
    { name = "mk_get_item_route", inputs = [{ name = "path", sort = "String" }], output = "GetItemRoute" },
    { name = "mk_create_item_route", inputs = [{ name = "path", sort = "String" }], output = "CreateItemRoute" },
    { name = "mk_update_item_route", inputs = [{ name = "path", sort = "String" }], output = "UpdateItemRoute" },
    { name = "mk_delete_item_route", inputs = [{ name = "path", sort = "String" }], output = "DeleteItemRoute" },

    # Models
    { name = "mk_user_model", inputs = [], output = "UserModel" },
    { name = "mk_item_model", inputs = [], output = "ItemModel" },

    # Aggregators
    { name = "mk_route_table", inputs = [{ name = "routes", sort = "String" }], output = "RouteTable" },
    { name = "mk_middleware_stack", inputs = [{ name = "middleware", sort = "String" }], output = "MiddlewareStack" },
    { name = "mk_models", inputs = [{ name = "models", sort = "String" }], output = "ModelDef" },

    {
      name = "compose_app",
      inputs = [
        { name = "name", sort = "ProjectName" },
        { name = "desc", sort = "ProjectDescription" },
        { name = "port", sort = "Port" },
        { name = "host", sort = "Host" },
        { name = "routes", sort = "RouteTable" },
        { name = "models", sort = "ModelDef" },
        { name = "middleware", sort = "MiddlewareStack" },
      ],
      output = "ThIntegratedApp"
    },
  ],

  phoenix_config = {
    project_name = "express-demo-api",
    project_description = "Express.js REST API with User and Item management",
    template = "nodejs-express",
    build_type = "nodejs",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
    },
  },

  # Dependencies
  dependencies = {
    extra = ["express", "mongoose", "cors", "helmet", "morgan", "dotenv", "bcryptjs", "jsonwebtoken"],
  },

  # Server config
  server = {
    port = 3000,
    host = "0.0.0.0",
  },

  # Middleware stack
  middleware = [
    "cors",
    "helmet",
    "morgan",
    "express.json",
  ],

  # Routes definition
  routes = [
    { method = "GET", path = "/health", handler = "healthCheck", description = "Health check endpoint" },
    { method = "GET", path = "/api/users", handler = "listUsers", description = "List all users" },
    { method = "GET", path = "/api/users/:id", handler = "getUser", description = "Get user by ID" },
    { method = "POST", path = "/api/users", handler = "createUser", description = "Create new user" },
    { method = "PUT", path = "/api/users/:id", handler = "updateUser", description = "Update user" },
    { method = "DELETE", path = "/api/users/:id", handler = "deleteUser", description = "Delete user" },
    { method = "GET", path = "/api/items", handler = "listItems", description = "List all items" },
    { method = "GET", path = "/api/items/:id", handler = "getItem", description = "Get item by ID" },
    { method = "POST", path = "/api/items", handler = "createItem", description = "Create new item" },
    { method = "PUT", path = "/api/items/:id", handler = "updateItem", description = "Update item" },
    { method = "DELETE", path = "/api/items/:id", handler = "deleteItem", description = "Delete item" },
  ],

  # Data models
  models = {
    User = {
      fields = [
        { name = "name", type = "String", required = true },
        { name = "email", type = "String", required = true, unique = true },
        { name = "password", type = "String", required = true },
        { name = "createdAt", type = "Date", default = "Date.now" },
      ],
    },
    Item = {
      fields = [
        { name = "name", type = "String", required = true },
        { name = "description", type = "String" },
        { name = "price", type = "Number", required = true },
        { name = "owner", type = "ObjectId", ref = "User" },
        { name = "createdAt", type = "Date", default = "Date.now" },
      ],
    },
  },
}
