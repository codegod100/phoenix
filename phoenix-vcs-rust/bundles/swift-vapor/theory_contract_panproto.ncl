{
  # ThSwiftVapor: Theory for Swift Vapor web API servers
  
  theory_id = "swift-vapor",
  theory_name = "ThSwiftVapor",
  version = "0.1.0",
  description = "Theory for generating Swift Vapor web API servers with routing, controllers, models, and middleware",
  
  # Source theory
  source = {
    theory = "ThSpec",
    format = "spec_md",
    grammar = "markdown",
  },
  
  # Target theory
  target = {
    theory = "ThSwiftVapor",
    format = "swift_code",
    files = [
      "Package.swift",
      "Sources/App/configure.swift",
      "Sources/App/routes.swift",
      "Sources/App/Controllers/*.swift",
      "Sources/App/Models/*.swift",
    ],
  },
  
  # Sorts (domain types)
  sorts = {
    Route = "HTTP route with path, method, and handler",
    Controller = "Route handler class implementing RouteCollection",
    Model = "Database model conforming to Model protocol",
    Middleware = "Request/response processing component",
    Action = "Controller method handling requests",
    Field = "Model property with type and validation",
    Content = "Response body content type",
    Parameter = "Path, query, or body parameter",
  },
  
  # Operations (constructors)
  operations = {
    mk_route = {
      arity = ["String", "String", "Controller"],
      result = "Route",
      description = "Create HTTP route from path, method, and controller",
    },
    mk_controller = {
      arity = ["String", "Array Action"],
      result = "Controller",
      description = "Create controller with name and actions",
    },
    mk_model = {
      arity = ["String", "Array Field"],
      result = "Model",
      description = "Create database model with fields",
    },
    mk_middleware = {
      arity = ["String", "Array Route"],
      result = "Middleware",
      description = "Create middleware for routes",
    },
  },
  
  # Equations
  equations = [
    "μ_swift_vapor: ThSpec → ThSwiftVapor",
    "∀ spec. generate(spec) = apply_morphism(spec, μ_swift_vapor)",
    "route ∘ controller = registered_handler",
    "model ∘ fields = database_schema",
    "controller.actions = flattened_routes",
  ],
  
  # Axioms
  axioms = [
    "Routes must have valid HTTP methods (GET, POST, PUT, DELETE, PATCH)",
    "Controllers must implement RouteCollection protocol",
    "Models must conform to Model and Content protocols",
    "All model fields must have Codable types",
  ],
  
  # Examples
  examples = [
    {
      name = "users-api",
      input = "REST API with User CRUD operations",
      output = "Swift Vapor with UserController, User model, and routes",
    },
    {
      name = "items-api", 
      input = "Item inventory API with search",
      output = "Swift Vapor with ItemController, Item model, query parameters",
    },
  ],
  
  # Morphisms
  morphisms = {
    to_swift = {
      source = "ThSwiftVapor",
      target = "ThSwift",
      description = "Generate Swift source code",
    },
    to_routes = {
      source = "ThSwiftVapor", 
      target = "ThRoutes",
      description = "Generate route registrations",
    },
  },
}
