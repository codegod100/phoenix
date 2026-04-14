import Vapor
import Fluent

final class Item: Model, Content {
    static let schema = "items"
    
    @ID(key: .id)
    var id: UUID?
    
    @Field(key: "name")
    var name: String
    
    @Field(key: "description")
    var itemDescription: String?
    
    @Field(key: "price")
    var price: Double?
    
    @Parent(key: "user_id")
    var user: User
    
    @Timestamp(key: "created_at", on: .create)
    var createdAt: Date?
    
    @Timestamp(key: "updated_at", on: .update)
    var updatedAt: Date?
    
    init() { }
    
    init(id: UUID? = nil, name: String, description: String? = nil, price: Double? = nil, userId: UUID) {
        self.id = id
        self.name = name
        self.itemDescription = description
        self.price = price
        self.$user.id = userId
    }
}