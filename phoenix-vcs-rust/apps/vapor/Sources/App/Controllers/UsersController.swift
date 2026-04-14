import Vapor

struct UsersController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let users = routes.grouped("api", "users")
        
        users.get(use: index)
        users.post(use: create)
        
        users.group(":userID") { user in
            user.get(use: show)
            user.put(use: update)
            user.patch(use: patch)
            user.delete(use: delete)
        }
    }
    
    // GET /api/users
    func index(req: Request) async throws -> [User] {
        try await User.query(on: req.db).all()
    }
    
    // POST /api/users
    func create(req: Request) async throws -> User {
        let user = try req.content.decode(User.self)
        try await user.save(on: req.db)
        return user
    }
    
    // GET /api/users/:userID
    func show(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        return user
    }
    
    // PUT /api/users/:userID
    func update(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        let updatedUser = try req.content.decode(User.self)
        user.name = updatedUser.name
        user.email = updatedUser.email
        
        try await user.save(on: req.db)
        return user
    }
    
    // PATCH /api/users/:userID
    func patch(req: Request) async throws -> User {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        let updatedData = try req.content.decode(PatchUserRequest.self)
        
        if let name = updatedData.name {
            user.name = name
        }
        if let email = updatedData.email {
            user.email = email
        }
        
        try await user.save(on: req.db)
        return user
    }
    
    // DELETE /api/users/:userID
    func delete(req: Request) async throws -> HTTPStatus {
        guard let user = try await User.find(req.parameters.get("userID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        try await user.delete(on: req.db)
        return .noContent
    }
}

struct PatchUserRequest: Content {
    var name: String?
    var email: String?
}