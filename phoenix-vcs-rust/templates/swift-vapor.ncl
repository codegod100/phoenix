# Phoenix VCS Template: Swift Vapor
# Template for generating Swift Vapor web API servers

let template = {
  name = "swift-vapor",
  description = "Swift Vapor web API server with Fluent ORM",
  version = "0.1.0",
  
  # Template configuration
  config = {
    # Swift tools version
    swift_tools_version = "5.9",
    
    # Default Vapor dependencies
    dependencies = [
      "vapor",
      "fluent",
      "fluent-postgres-driver",
    ],
    
    # Generated files
    files = [
      "Package.swift",
      "Sources/App/configure.swift",
      "Sources/App/routes.swift",
      "Sources/App/Controllers/UsersController.swift",
      "Sources/App/Controllers/ItemsController.swift",
      "Sources/App/Models/User.swift",
      "Sources/App/Models/Item.swift",
    ],
  },
  
  # Prompt for LLM code generation
  prompt = m%"
You are a Swift Vapor developer. Generate a complete Vapor web API server.

## Input

Read the spec.ncl which defines:
- API routes (path, method, handler)
- Data models (name, fields, types)
- Middleware requirements

## Output Files

Generate these Swift files:

1. **Package.swift** - Swift Package Manager manifest with Vapor dependencies

2. **Sources/App/configure.swift** - App configuration:
   - Database configuration
   - Middleware setup
   - Route registration

3. **Sources/App/routes.swift** - Route definitions using Vapor's routing DSL

4. **Sources/App/Controllers/*.swift** - Controller classes implementing RouteCollection:
   - UsersController with CRUD operations
   - ItemsController with CRUD operations

5. **Sources/App/Models/*.swift** - Fluent Model classes:
   - User model with fields from spec
   - Item model with fields from spec
   - All models conform to Model, Content protocols

## Swift Vapor Patterns

```swift
// Model example
final class User: Model, Content {
    static let schema = "users"
    
    @ID(key: .id)
    var id: UUID?
    
    @Field(key: "name")
    var name: String
    
    init() { }
}

// Controller example
struct UsersController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let users = routes.grouped("users")
        users.get(use: index)
        users.post(use: create)
        users.group(":id") { user in
            user.get(use: show)
            user.put(use: update)
            user.delete(use: delete)
        }
    }
    
    func index(req: Request) async throws -> [User] {
        try await User.query(on: req.db).all()
    }
}
```

## Rules

1. Use async/await (not EventLoopFuture)
2. All models must be final classes
3. Use @ID, @Field, @OptionalField property wrappers
4. Controllers implement RouteCollection
5. Use req.db for database access
6. Return Content-conforming types from handlers
7. Use proper HTTP status codes (200, 201, 204, 404)
"%,
  
  # Keybindings (empty for server)
  keybindings = {},
  
  # Widgets (empty for server)
  widgets = {},
  
  # Layout (empty for server)
  layout = {},
  
  # Theme (empty for server)
  theme = {},
} in template
