# Phoenix Generated Specification
{
  id = "dev.phoenix.app",
  name = "app",
  server = {
    host = "100.115.154.32",
    api_port = 3000,
    vite_port = 5173
  },

  # Component styling configuration (from spec.md)
  component_config = {
    "todo-list" = {
      buttonVariant = "success",     # green (#48bb78)
      checkboxAccent = "success"   # green (#48bb78)
    },
    "user-card" = {},
    "welcome-card" = {}
  },
  components = ["elena-app", "todo-list", "user-card", "welcome-card", "style-utils"],
  
  # ASCII Tensor Diagram
  ascii = m%''
╔═══════════════════════════════════════════════════════════╗
║            TENSOR NETWORK STRING DIAGRAM                    ║
╚═══════════════════════════════════════════════════════════╝

     📝ᵢ 🗄️ᵢ
      │   │  
┌────────────────────────────────┐
│          hono-server           │
└────────────────────────────────┘
      │  
     🌐ₒ

     🌐ᵢ
      │  
┌────────────────────────────────┐
│        vite-dev-server         │
└────────────────────────────────┘
      │  
     📦ₒ

       ∅  
      │  
┌────────────────────────────────┐
│          bun-runtime           │
└────────────────────────────────┘
      │  
     📦ₒ

     📦ᵢ
      │  
┌────────────────────────────────┐
│            elenajs             │
└────────────────────────────────┘
      │  
     🎨ₒ

       ∅  
      │  
┌────────────────────────────────┐
│             sqlite             │
└────────────────────────────────┘
      │  
     🗄️ₒ

┌───────────────────────────────────────────────────────────┐
│                    WIRING (Cups)                            │
└───────────────────────────────────────────────────────────┘
  sqlite ──[🗄️]──> hono-server
  hono-server ──[🌐]──> vite-dev-server
  vite-dev-server ──[📦]──> elenajs

┌───────────────────────────────────────────────────────────┐
│              DANGLING WIRES (Unfulfilled Needs)             │
└───────────────────────────────────────────────────────────┘
  hono-server needs 📝 ⚠

Modules: 5 | Connections: 3 | Dangling: 1
'%
}
