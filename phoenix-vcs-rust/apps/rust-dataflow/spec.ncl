{
  id = "dev.phoenix.dataflow---stream-processing-pipeline",
  description = "A high-performance data processing pipeline for ETL (Extract, Transform, Load) operations. Not a web server - this processes data streams through a directed graph of transformations.",
  theory = "GenericServer",

  # Template selection
  template = "rust",
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
    project_name = "dataflow---stream-processing-pipeline",
    project_description = "A high-performance data processing pipeline for ETL (Extract, Transform, Load) operations. Not a web server - this processes data streams through a directed graph of transformations.",
    template = "rust",
    build_type = "nodejs",
    server_config = {
      port = 3000,
      host = "0.0.0.0",
    },
  },

  # Routes definition
  routes = [
    { method = "GET", path = "/health", handler = "healthCheck", description = "Health check endpoint" },
  ],

}
