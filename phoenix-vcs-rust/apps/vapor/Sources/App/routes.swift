import Vapor

extension CreateUser: Migration {
    func prepare(on database: Database) async throws {
        try await database.schema("users")
            .id()
            .field("name", .string, .required)
            .field("email", .string, .required)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }
    
    func revert(on database: Database) async throws {
        try await database.schema("users").delete()
    }
}

extension CreateItem: Migration {
    func prepare(on database: Database) async throws {
        try await database.schema("items")
            .id()
            .field("name", .string, .required)
            .field("description", .string)
            .field("price", .double)
            .field("user_id", .uuid, .references("users", "id"))
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }
    
    func revert(on database: Database) async throws {
        try await database.schema("items").delete()
    }
}

struct CreateUser: Migration {}
struct CreateItem: Migration {}

func routes(_ app: Application) throws {
    try app.register(collection: UsersController())
    try app.register(collection: ItemsController())
}