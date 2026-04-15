{
  id = "hono-server",
  name = "Hono HTTP Server",
  description = "Production Hono server with middleware stack, SQLite persistence, and code generation",
  version = "1.0.0",
  language = "typescript",
  is_infrastructure = true,

  generation = {
    protocol = "typescript",
    vertex_kinds = ["ImportDecl", "VarDecl", "RouteHandler", "ExprStmt"],
    vertices = [
      { id = "import_hono", kind = "ImportDecl", text = "import { Hono } from 'hono';\n" },
      { id = "import_serve", kind = "ImportDecl", text = "import { serve } from '@hono/node-server';\n\n" },
      { id = "import_sqlite", kind = "ImportDecl", text = "import { Database } from 'bun:sqlite';\n\n" },
      { id = "db_init", kind = "VarDecl", text = "// Initialize SQLite database\nconst db = new Database('todos.db');\ndb.run(`CREATE TABLE IF NOT EXISTS todos (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  text TEXT NOT NULL,\n  completed INTEGER DEFAULT 0,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n)`);\n\n" },
      { id = "app_const", kind = "VarDecl", text = "const app = new Hono();\n\n" },
      { id = "health_route", kind = "RouteHandler", text = "app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', service: 'elena-dashboard', timestamp: new Date().toISOString() });\n});\n\n" },
      { id = "users_route", kind = "RouteHandler", text = "app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice', email: 'alice@example.com' }] });\n});\n\n" },
      { id = "todos_get", kind = "RouteHandler", text = "app.get('/api/todos', (c) => {\n  const todos = db.query('SELECT * FROM todos ORDER BY created_at DESC').all();\n  return c.json({ todos: todos.map(t => ({...t, completed: !!t.completed})) });\n});\n\n" },
      { id = "todos_post", kind = "RouteHandler", text = "app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  const result = db.run('INSERT INTO todos (text) VALUES (?)', [body.text]);\n  const todo = db.query('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);\n  return c.json({ ...todo, completed: !!todo.completed });\n});\n\n" },
      { id = "todos_patch", kind = "RouteHandler", text = "app.patch('/api/todos/:id', async (c) => {\n  const id = parseInt(c.req.param('id'));\n  const body = await c.req.json();\n  if (body.completed !== undefined) {\n    db.run('UPDATE todos SET completed = ? WHERE id = ?', [body.completed ? 1 : 0, id]);\n  }\n  const todo = db.query('SELECT * FROM todos WHERE id = ?').get(id);\n  if (!todo) return c.json({ error: 'Not found' }, 404);\n  return c.json({ ...todo, completed: !!todo.completed });\n});\n\n" },
      { id = "todos_delete", kind = "RouteHandler", text = "app.delete('/api/todos/:id', (c) => {\n  const id = parseInt(c.req.param('id'));\n  const result = db.run('DELETE FROM todos WHERE id = ?', [id]);\n  if (result.changes === 0) return c.json({ error: 'Not found' }, 404);\n  return c.json({ success: true });\n});\n\n" },
      { id = "hostname_const", kind = "VarDecl", text = "const hostname = '{{HOST}}';\n" },
      { id = "port_const", kind = "VarDecl", text = "const port = {{API_PORT}};\n" },
      { id = "log_stmt", kind = "ExprStmt", text = "console.log(`Server running at http://${hostname}:${port}`);\n\n" },
      { id = "serve_call", kind = "ExprStmt", text = "serve({ fetch: app.fetch, port, hostname });\n" }
    ],
    config_placeholders = {
      "{{HOST}}" = "server.host",
      "{{API_PORT}}" = "server.api_port"
    }
  },

  provides = [
    { interface = "HttpServer", properties = { framework = "hono", runtime = "bun", protocol = "http", features = ["routing", "logging", "cors", "sqlite"] }, endpoint = "http://localhost:3000" }
  ],

  needs = [
    { interface = "HttpFramework", strategy = { type = "named", name = "hono-core" }, optional = false },
    { interface = "HttpMiddleware", strategy = { type = "named", name = "hono-logger" }, optional = true },
    { interface = "HttpMiddleware", strategy = { type = "named", name = "hono-cors" }, optional = true },
    { interface = "Logging", strategy = { type = "first_available" }, optional = true },
    { interface = "Database", strategy = { type = "named", name = "sqlite-store" }, optional = true }
  ]
}
