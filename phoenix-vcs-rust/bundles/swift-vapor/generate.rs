// Swift Vapor Bundle - Native Rust Code Generation
// This file is loaded by the Phoenix VCS pipeline for isolated bundles

use std::collections::HashMap;
use std::path::PathBuf;

/// Generate all files for the Swift Vapor bundle
pub fn generate(project_name: &str, _spec_content: &str) -> HashMap<PathBuf, String> {
    let mut files = HashMap::new();
    
    files.insert(PathBuf::from("Package.swift"), generate_package_swift(project_name));
    files.insert(PathBuf::from("Sources/App/configure.swift"), generate_configure_swift());
    files.insert(PathBuf::from("Sources/App/routes.swift"), generate_routes_swift());
    files.insert(PathBuf::from("Sources/App/Models/User.swift"), generate_user_swift());
    files.insert(PathBuf::from("Sources/App/Controllers/UsersController.swift"), generate_users_controller_swift());
    
    files
}

/// Generate Package.swift
fn generate_package_swift(project_name: &str) -> String {
    format!(r#"// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "{}",
    platforms: [
        .macOS(.v13)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
        .package(url: "https://github.com/vapor/fluent.git", from: "4.9.0"),
        .package(url: "https://github.com/vapor/fluent-postgres-driver.git", from: "2.8.0"),
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Fluent", package: "fluent"),
                .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
            ]
        ),
        .testTarget(name: "AppTests", dependencies: [
            .target(name: "App"),
            .product(name: "XCTVapor", package: "vapor"),
        ])
    ]
)
"#, project_name)
}

/// Generate configure.swift
fn generate_configure_swift() -> String {
    r#"import Vapor
import Fluent
import FluentPostgresDriver

// phoenix: iu_id = "vapor-config"
// Configures the Vapor application

public func configure(_ app: Application) async throws {
    // Database configuration
    app.databases.use(.postgres(
        hostname: Environment.get("DATABASE_HOST") ?? "localhost",
        port: Environment.get("DATABASE_PORT").flatMap(Int.init(_:)) ?? PostgresConfiguration.ianaPortNumber,
        username: Environment.get("DATABASE_USERNAME") ?? "vapor",
        password: Environment.get("DATABASE_PASSWORD") ?? "vapor",
        database: Environment.get("DATABASE_NAME") ?? "vapor"
    ), as: .psql)

    // Migrations
    app.migrations.add(CreateUser())

    // Middleware
    app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
    app.middleware.use(ErrorMiddleware.default(environment: app.environment))

    // Routes
    try routes(app)
}

// Run the application
@main
enum Entrypoint {
    static func main() async throws {
        let app = Application(env)
        defer { app.shutdown() }
        try await configure(app)
        try await app.startup()
    }
}
"#.to_string()
}

/// Generate routes.swift
fn generate_routes_swift() -> String {
    r#"import Vapor

// phoenix: iu_id = "vapor-routes"
// Route definitions for the Vapor app

func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    
    // Health check
    api.get("health") { req async -> [String: String] in
        ["status": "ok", "timestamp": Date().ISO8601Format()]
    }

    // Root
    api.get { req async -> String in
        "It works!"
    }

    // Users controller
    let usersController = UsersController()
    api.get("users", use: usersController.index)
    api.post("users", use: usersController.create)
    api.get("users", ":id", use: usersController.show)
    api.put("users", ":id", use: usersController.update)
    api.delete("users", ":id", use: usersController.delete)
}
"#.to_string()
}

/// Generate User.swift (Model)
fn generate_user_swift() -> String {
    r#"import Vapor
import Fluent

// phoenix: iu_id = "user-model"
// User model for Fluent ORM

final class User: Model, Content {
    static let schema = "users"
    
    @ID(key: .id)
    var id: UUID?

    @Field(key: "name")
    var name: String

    @Field(key: "email")
    var email: String

    @Field(key: "password_hash")
    var passwordHash: String

    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?

    init() { }

    init(id: UUID? = nil, name: String, email: String, passwordHash: String) {
        self.id = id
        self.name = name
        self.email = email
        self.passwordHash = passwordHash
    }
}

struct CreateUser: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("name", .string, .required)
            .field("email", .string, .required)
            .field("password_hash", .string, .required)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .unique(on: "email")
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}
"#.to_string()
}

/// Generate UsersController.swift
fn generate_users_controller_swift() -> String {
    r#"import Vapor

// phoenix: iu_id = "users-controller"
// REST controller for User resource

struct UsersController {
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
        let updated = try req.content.decode(User.self)
        user.name = updated.name
        user.email = updated.email
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
"#.to_string()
}
