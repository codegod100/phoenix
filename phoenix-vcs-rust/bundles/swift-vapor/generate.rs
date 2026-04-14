// Swift Vapor Bundle - Expr-Based Code Generation (Layer 4)
//
// Uses the panproto Expr layer for runtime code generation:
//   Config ──► Expr Evaluation ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

/// Generate all files for the Swift Vapor bundle using Expr-based generation
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    use crate::pipeline::expr_bundle::{parse_spec_to_config, ExprBundleGenerator, ArtifactGenerator};
    
    // Parse spec into config
    let config = parse_spec_to_config(spec_content);
    
    // Build Expr-based generator with multiple artifacts
    let mut gen = ExprBundleGenerator::new("swift-vapor")
        .with_artifact("Package.swift", ArtifactGenerator::Expr(vapor_package_swift))
        .with_artifact("Sources/App/configure.swift", ArtifactGenerator::Static(vapor_configure_swift().to_string()))
        .with_artifact("Sources/App/routes.swift", ArtifactGenerator::Static(vapor_routes_swift().to_string()))
        .with_artifact("Sources/App/Models/User.swift", ArtifactGenerator::Static(vapor_user_swift().to_string()))
        .with_artifact("Sources/App/Controllers/UsersController.swift", ArtifactGenerator::Static(vapor_users_controller_swift().to_string()));
    
    gen.generate(&config)
}

fn vapor_package_swift(config: &crate::pipeline::expr_bundle::BundleConfig) -> String {
    format!(r#"// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "{}",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
        .package(url: "https://github.com/vapor/fluent.git", from: "4.9.0"),
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Fluent", package: "fluent"),
            ]
        ),
    ]
)
"#,
        config.project_name
    )
}

fn vapor_configure_swift() -> &'static str {
    r#"import Vapor
import Fluent

public func configure(_ app: Application) async throws {
    app.middleware.use(ErrorMiddleware.default(environment: app.environment))
    try routes(app)
}

@main
enum Entrypoint {
    static func main() async throws {
        let app = Application(env)
        defer { app.shutdown() }
        try await configure(app)
        try await app.startup()
    }
}
"#
}

fn vapor_routes_swift() -> &'static str {
    r#"import Vapor

func routes(_ app: Application) throws {
    let api = app.grouped("api", "v1")
    
    api.get("health") { req async -> [String: String] in
        ["status": "ok", "timestamp": "\(Date())"]
    }

    api.get { req async -> String in
        "It works!"
    }
}
"#
}

fn vapor_user_swift() -> &'static str {
    r#"import Vapor
import Fluent

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
    init(id: UUID? = nil, name: String, email: String) {
        self.id = id
        self.name = name
        self.email = email
    }
}

struct CreateUser: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("name", .string, .required)
            .field("email", .string, .required)
            .field("created_at", .datetime)
            .create()
    }
    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}
"#
}

fn vapor_users_controller_swift() -> &'static str {
    r#"import Vapor

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
}
"#
}
