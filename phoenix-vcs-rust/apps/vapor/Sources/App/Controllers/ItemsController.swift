import Vapor

struct ItemsController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let items = routes.grouped("api", "items")
        
        items.get(use: index)
        items.post(use: create)
        
        items.group(":itemID") { item in
            item.get(use: show)
            item.put(use: update)
            item.patch(use: patch)
            item.delete(use: delete)
        }
        
        // Nested route: GET /api/users/:userID/items
        let users = routes.grouped("api", "users")
        users.group(":userID", "items") { userItems in
            userItems.get(use: getUserItems)
        }
    }
    
    // GET /api/items
    func index(req: Request) async throws -> [Item] {
        try await Item.query(on: req.db).all()
    }
    
    // POST /api/items
    func create(req: Request) async throws -> Item {
        let item = try req.content.decode(CreateItemRequest.self)
        
        guard let user = try await User.find(item.userId, on: req.db) else {
            throw Abort(.notFound, reason: "User not found")
        }
        
        let newItem = Item(
            name: item.name,
            description: item.description,
            price: item.price,
            userId: user.id!
        )
        
        try await newItem.save(on: req.db)
        return newItem
    }
    
    // GET /api/items/:itemID
    func show(req: Request) async throws -> Item {
        guard let item = try await Item.find(req.parameters.get("itemID"), on: req.db) else {
            throw Abort(.notFound)
        }
        return item
    }
    
    // PUT /api/items/:itemID
    func update(req: Request) async throws -> Item {
        guard let item = try await Item.find(req.parameters.get("itemID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        let updateData = try req.content.decode(UpdateItemRequest.self)
        item.name = updateData.name
        item.itemDescription = updateData.description
        item.price = updateData.price
        
        try await item.save(on: req.db)
        return item
    }
    
    // PATCH /api/items/:itemID
    func patch(req: Request) async throws -> Item {
        guard let item = try await Item.find(req.parameters.get("itemID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        let patchData = try req.content.decode(PatchItemRequest.self)
        
        if let name = patchData.name {
            item.name = name
        }
        if let description = patchData.description {
            item.itemDescription = description
        }
        if let price = patchData.price {
            item.price = price
        }
        
        try await item.save(on: req.db)
        return item
    }
    
    // DELETE /api/items/:itemID
    func delete(req: Request) async throws -> HTTPStatus {
        guard let item = try await Item.find(req.parameters.get("itemID"), on: req.db) else {
            throw Abort(.notFound)
        }
        
        try await item.delete(on: req.db)
        return .noContent
    }
    
    // GET /api/users/:userID/items
    func getUserItems(req: Request) async throws -> [Item] {
        guard let userId = req.parameters.get("userID"),
              let uuid = UUID(uuidString: userId) else {
            throw Abort(.badRequest)
        }
        
        return try await Item.query(on: req.db)
            .filter("user_id", .equal, uuid)
            .all()
    }
}

struct CreateItemRequest: Content {
    var name: String
    var description: String?
    var price: Double?
    var userId: UUID
}

struct UpdateItemRequest: Content {
    var name: String
    var description: String?
    var price: Double?
}

struct PatchItemRequest: Content {
    var name: String?
    var description: String?
    var price: Double?
}