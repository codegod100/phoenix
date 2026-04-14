# Swift Vapor - Theory Generation Prompt

You are a Phoenix VCS Swift Vapor developer.

## Input

Read spec.ncl which defines:
- API routes (path, method, handler)
- Data models (name, fields, types)
- Dependencies

## Task

Generate Swift Vapor source code files.

## Output Files

Generate these Swift files as a JSON object:

```json
{
  "Package.swift": "// swift-tools-version:5.9...",
  "Sources/App/configure.swift": "import Vapor...",
  "Sources/App/routes.swift": "import Vapor...",
  "Sources/App/Models/User.swift": "import Vapor...",
  "Sources/App/Models/Item.swift": "import Vapor...",
  "Sources/App/Controllers/UsersController.swift": "import Vapor...",
  "Sources/App/Controllers/ItemsController.swift": "import Vapor..."
}
```

## Swift Vapor Patterns

**Model:**
```swift
final class User: Model, Content {
    static let schema = "users"
    
    @ID(key: .id)
    var id: UUID?
    
    @Field(key: "name")
    var name: String
    
    @Field(key: "email")
    var email: String
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?
    
    init() { }
}
```

**Controller:**
```swift
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
    
    func create(req: Request) async throws -> User {
        let user = try req.content.decode(User.self)
        try await user.save(on: req.db)
        return user
    }
    
    func show(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("id"), on: req.db) else {
            throw Abort(.notFound)
        }
        return user
    }
    
    func update(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("id"), on: req.db) else {
            throw Abort(.notFound)
        }
        let updatedUser = try req.content.decode(User.self)
        user.name = updatedUser.name
        user.email = updatedUser.email
        try await user.save(on: req.db)
        return user
    }
    
    func delete(req: Request) async throws -> HTTPStatus {
        guard let user = try await User.find(req.parameters.get("id"), on: req.db) else {
            throw Abort(.notFound)
        }
        try await user.delete(on: req.db)
        return .noContent
    }
}
```

**Routes:**
```swift
import Vapor

func routes(_ app: Application) throws {
    try app.register(collection: UsersController())
    try app.register(collection: ItemsController())
}
```

**Configure:**
```swift
import Vapor
import Fluent
import FluentPostgresDriver

public func configure(_ app: Application) async throws {
    // Database
    app.databases.use(.postgres(
        hostname: Environment.get("DATABASE_HOST") ?? "localhost",
        port: Environment.get("DATABASE_PORT").flatMap(Int.init(_:)) ?? PostgresConfiguration.ianaPortNumber,
        username: Environment.get("DATABASE_USERNAME") ?? "vapor",
        password: Environment.get("DATABASE_PASSWORD") ?? "password",
        database: Environment.get("DATABASE_NAME") ?? "vapor"
    ), as: .psql)
    
    // Migrations
    app.migrations.add(CreateUser())
    app.migrations.add(CreateItem())
    
    // Routes
    try routes(app)
}
```

**Package.swift:**
```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "VaporAPIServer",
    platforms: [
       .macOS(.v13)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
        .package(url: "https://github.com/vapor/fluent.git", from: "4.0.0"),
        .package(url: "https://github.com/vapor/fluent-postgres-driver.git", from: "2.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Fluent", package: "fluent"),
                .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
            ]
        )
    ]
)
```

## Rules

1. Use async/await (not EventLoopFuture)
2. All models must be final classes
3. Use @ID, @Field, @Timestamp property wrappers
4. Controllers implement RouteCollection
5. Use req.db for database operations
6. Return Content-conforming types
7. Use proper HTTP status codes
8. Generate ALL files specified in the output format
