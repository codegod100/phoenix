{
  id = "dev.phoenix.tui-dashboard---terminal-user-interface",
  description = "This is NOT a web application - it's a TUI (Text User Interface) that runs in the terminal using ncurses-like capabilities via Textual.",
  theory = "GenericServer",

  # Template selection
  template = "python-textual",
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
    project_name = "tui-dashboard---terminal-user-interface",
    project_description = "This is NOT a web application - it's a TUI (Text User Interface) that runs in the terminal using ncurses-like capabilities via Textual.",
    template = "python-textual",
    build_type = "nodejs",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
    },
  },

  # Routes definition
  routes = [
    { method = "GET", path = "/api/users", handler = "listUsers", description = "List all users" },
    { method = "POST", path = "/api/users", handler = "createUser", description = "Create new user" },
    { method = "DELETE", path = "/api/users/:id", handler = "deleteUser", description = "Delete user" },
    { method = "GET", path = "/health", handler = "healthCheck", description = "Health check endpoint" },
  ],

}
