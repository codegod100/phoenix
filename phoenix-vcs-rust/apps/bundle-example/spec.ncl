{
  # Theory metadata
  theory_id = "swift-vapor",
  theory_name = "ThSwiftVapor",
  description = "Theory for Swift Vapor web API servers",

  # Source theory (what we parse from spec)
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },

  # Target theory (what we generate)
  target = {
    theory = "ThSwiftVapor",
    format = "swift_code",
  },

  # Sorts (types in the theory)
  sorts = {
    Route = "HTTP route definition",
    Controller = "Route handler class",
    Model = "Database model",
    Middleware = "Request/response middleware",
    Field = "Model attribute definition",
    Action = "Controller method definition",
  },

  # Operations (constructors)
  operations = {
    mk_route = {
      arity = ["String", "String", "Controller"],
      result = "Route",
    },
    mk_controller = {
      arity = ["String", "Array Action"],
      result = "Controller",
    },
    mk_model = {
      arity = ["String", "Array Field"],
      result = "Model",
    },
    mk_middleware = {
      arity = ["String", "String"],
      result = "Middleware",
    },
    mk_field = {
      arity = ["String", "String"],
      result = "Field",
    },
    mk_action = {
      arity = ["String", "String", "Array String"],
      result = "Action",
    },
  },

  # Equations (algebraic laws)
  equations = [
    "μ_swift_vapor: ThSpec → ThSwiftVapor",
    "∀ spec. generate(spec) = apply_morphism(spec, μ_swift_vapor)",
    "route ∘ controller = handler",
    "model ∘ fields = schema",
    "middleware ∘ routes = pipeline",
    "controller ∘ actions = handler_group",
  ],

  # Axioms (properties that must hold)
  axioms = [
    "All routes must have valid HTTP methods",
    "Controllers must implement RouteCollection",
    "Models must conform to Model protocol",
    "Middleware order affects request processing",
    "Controller actions must return Response",
  ],

  # Examples
  examples = [
    {
      name = "users-api",
      input = "REST API with User CRUD",
      output = "Swift Vapor routes, controllers, and models",
    },
    {
      name = "auth-service",
      input = "Authentication service with JWT",
      output = "Auth middleware and protected routes",
    },
  ],

  # Morphisms
  morphisms = {
    to_swift_code = {
      source = "ThSwiftVapor",
      target = "ThSwift",
      description = "Generate Swift source code",
    },
    to_vapor_app = {
      source = "ThSwiftVapor",
      target = "ThVaporApp",
      description = "Generate Vapor application structure",
    },
    to_swift_vapor = {
      source = "ThSpec",
      target = "ThSwiftVapor",
      description = "Transform specification to Swift Vapor theory",
      signature = "μ_swift_vapor",
    },
  },

  # Validation rules
  validation = {
    route_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"],
    controller_pattern = "Controller",
    model_protocols = ["Model", "Codable"],
  },
}