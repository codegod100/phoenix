{
  theory_id = "nodejs-express",
  theory_name = "ThNodejsExpress",
  version = "0.1.0",
  
  description = "Phoenix VCS bundle for generating Node.js Express REST API servers with routing, controllers, models, and middleware",
  
  source = {
    theory = "ThSpec",
    format = "spec_md",
    grammar = "markdown",
  },
  
  target = {
    theory = "ThNodejsExpress",
    format = "panproto",
    files = [
      "bundle.ncl",
      "template_contract.ncl",
      "theory_contract_panproto.ncl",
      "prompt_theory.md",
      "prompt_contract.md",
    ],
  },
  
  sorts = {
    BundleId = "Identifier for the bundle (nodejs-express)",
    BundleMeta = "Bundle metadata with name, description, and keywords",
    TargetConfig = "Target configuration with Node.js Express specifics",
    FileSpec = "Specification for each generated file",
    DepSpec = "NPM dependency specification",
    TheoryMorphism = "Formal morphism name (μ_nodejs_express)",
    Route = "HTTP route definition with path, method, and handler",
    Controller = "Route handler functions with CRUD operations",
    Middleware = "Express middleware configuration",
    Model = "Mongoose model schema definition",
    Router = "Express router aggregation",
    Application = "Main Express app configuration",
  },
  
  operations = {
    mk_bundle_def = {
      arity = ["BundleId", "BundleMeta", "TargetConfig", "Array FileSpec"],
      result = "BundleDef",
      description = "Create a complete Node.js Express bundle definition",
    },
    mk_route = {
      arity = ["String", "String", "Controller"],
      result = "Route",
      description = "Create HTTP route from path, method, and controller",
    },
    mk_controller = {
      arity = ["String", "Array String"],
      result = "Controller",
      description = "Create controller with CRUD action methods",
    },
    mk_middleware = {
      arity = ["String", "String", "Array String"],
      result = "Middleware",
      description = "Create Express middleware with name, type, and dependencies",
    },
    mk_model = {
      arity = ["String", "Array Field"],
      result = "Model",
      description = "Create Mongoose model schema with fields",
    },
    mk_router = {
      arity = ["String", "Array Route"],
      result = "Router",
      description = "Create Express router with aggregated routes",
    },
    mk_app = {
      arity = ["Array Middleware", "Array Router"],
      result = "Application",
      description = "Create main Express application with middleware and routers",
    },
    mk_field = {
      arity = ["String", "String", "String"],
      result = "Field",
      description = "Create Mongoose field with name, type, and constraints",
    },
  },
  
  equations = [
    {
      name = "route_composition",
      lhs = "mk_route(path, method, mk_controller(name, actions))",
      rhs = "Router.routes ++ [Route { path, method, handler: name }]",
    },
    {
      name = "middleware_stacking",
      lhs = "mk_app([m1, m2], [r1, r2])",
      rhs = "Application { middleware: [m1, m2], routers: [r1, r2] }",
    },
    {
      name = "model_schema",
      lhs = "mk_model(name, [f1, f2, f3])",
      rhs = "Model { name, schema: Schema { fields: [f1, f2, f3] } }",
    },
    {
      name = "app_composition",
      lhs = "mk_app(middleware, routers)",
      rhs = "Application { middleware, routers, port: 3000 }",
    },
  ],
  
  extra_deps = {
    runtime = ["nodejs >= 18"],
    npm = ["express", "mongoose", "cors", "helmet", "dotenv", "morgan"],
  },
  
  morphism = "μ_nodejs_express",
  
  build_type = "bundle",
  
  bundle_meta = {
    name = "Node.js Express",
    description = "Generate REST API servers using Node.js and Express",
    keywords = ["nodejs", "express", "server", "javascript"],
    language = "javascript",
    framework = "express",
  },
  
  examples = [
    {
      input = "spec with Users and Items APIs",
      output = "package.json, app.js, routes/index.js, models/User.js, models/Item.js, controllers/userController.js, controllers/itemController.js, middleware/errorHandler.js, config/database.js",
    },
    {
      input = "API with authentication middleware",
      output = "middleware/auth.js with JWT verification, routes protected by auth middleware",
    },
    {
      input = "Model with relations",
      output = "Mongoose schemas with ref() fields for foreign keys",
    },
  ],
}