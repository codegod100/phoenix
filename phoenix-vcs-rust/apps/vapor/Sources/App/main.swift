import Vapor

@main
struct App: Application {
    init() {
        // No custom initialization needed
    }
}

extension App {
    static func main() async throws {
        var app = Application()
        defer { app.shutdown() }
        
        try await configure(app)
        await app.execute()
    }
}