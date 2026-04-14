import Vapor

struct HomeController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: index)
        routes.get("health", use: healthCheck)
    }
    
    func index(req: Request) async throws -> View {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let apiInfo = APIInfo()
        let data = try encoder.encode(apiInfo)
        return View(context: data)
    }
    
    func healthCheck(req: Request) async throws -> HealthResponse {
        HealthResponse(status: "healthy", timestamp: Date())
    }
}

struct APIInfo: Codable {
    let name: String = "Vapor API Server"
    let version: String = "1.0.0"
    let endpoints: [String] = [
        "GET /api/users",
        "POST /api/users",
        "GET /api/users/:userID",
        "PUT /api/users/:userID",
        "PATCH /api/users/:userID",
        "DELETE /api/users/:userID",
        "GET /api/items",
        "POST /api/items",
        "GET /api/items/:itemID",
        "PUT /api/items/:itemID",
        "PATCH /api/items/:itemID",
        "DELETE /api/items/:itemID",
        "GET /api/users/:userID/items"
    ]
}

struct HealthResponse: Content {
    let status: String
    let timestamp: Date
}