{
  id = "hono-server",
  name = "Hono HTTP Server",
  
  # This module generates code using emit_with_protocol
  generation = {
    protocol = "typescript",
    
    vertex_kinds = [
      "ImportDecl",
      "VarDecl", 
      "RouteHandler",
      "ExprStmt"
    ],
    
    # Vertices are the code fragments
    vertices = [
      {
        id = "import_hono",
        kind = "ImportDecl",
        text = ''import { Hono } from 'hono';\n''
      },
      {
        id = "import_serve",
        kind = "ImportDecl", 
        text = ''import { serve } from '@hono/node-server';\n\n''
      },
      {
        id = "app_const",
        kind = "VarDecl",
        text = ''const app = new Hono();\n\n''
      },
      {
        id = "todos_storage",
        kind = "VarDecl",
        text = ''const todos = [{ id: 1, text: 'Learn ElenaJS', completed: false }];\n\n''
      },
      {
        id = "health_route",
        kind = "RouteHandler",
        text = ''app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\n''
      },
      {
        id = "users_route",
        kind = "RouteHandler", 
        text = ''app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice' }] });\n});\n\n''
      },
      {
        id = "todos_get",
        kind = "RouteHandler",
        text = ''app.get('/api/todos', (c) => {\n  return c.json({ todos });\n});\n\n''
      },
      {
        id = "todos_post",
        kind = "RouteHandler",
        text = ''app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  const todo = { id: Date.now(), text: body.text, completed: false };\n  todos.push(todo);\n  return c.json(todo);\n});\n\n''
      },
      {
        id = "todos_patch",
        kind = "RouteHandler",
        text = ''app.patch('/api/todos/:id', async (c) => {\n  const id = parseInt(c.req.param('id'));\n  const body = await c.req.json();\n  const todo = todos.find(t => t.id === id);\n  if (!todo) return c.json({ error: 'Not found' }, 404);\n  if (body.completed !== undefined) todo.completed = body.completed;\n  return c.json(todo);\n});\n\n''
      },
      {
        id = "todos_delete",
        kind = "RouteHandler",
        text = ''app.delete('/api/todos/:id', (c) => {\n  const id = parseInt(c.req.param('id'));\n  const index = todos.findIndex(t => t.id === id);\n  if (index === -1) return c.json({ error: 'Not found' }, 404);\n  todos.splice(index, 1);\n  return c.json({ success: true });\n});\n\n''
      },
      {
        id = "hostname_const",
        kind = "VarDecl",
        text = ''const hostname = '{{HOST}}';\n''
      },
      {
        id = "port_const",
        kind = "VarDecl",
        text = ''const port = {{API_PORT}};\n''
      },
      {
        id = "log_stmt",
        kind = "ExprStmt",
        text = ''console.log(`Server running at http://${hostname}:${port}`);\n\n''
      },
      {
        id = "serve_call",
        kind = "ExprStmt",
        text = ''serve({ fetch: app.fetch, port, hostname });\n''
      }
    ],
    
    # Config placeholders that get replaced
    config_placeholders = {
      "{{HOST}}" = "server.host",
      "{{API_PORT}}" = "server.api_port"
    }
  },
  
  provides = [
    {
      interface = "HttpServer",
      properties = {
        framework = "hono",
        runtime = "bun"
      }
    }
  ],
  
  needs = [
    {
      interface = "HttpFramework",
      optional = false
    }
  ]
}
