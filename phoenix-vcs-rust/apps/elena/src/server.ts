import { Hono } from 'hono';
import { serve } from '@hono/node-server';

import { Database } from 'bun:sqlite';

// Initialize SQLite database
const db = new Database('todos.db');
db.run(`CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'elena-dashboard', timestamp: new Date().toISOString() });
});

app.get('/api/users', (c) => {
  return c.json({ users: [{ id: 1, name: 'Alice', email: 'alice@example.com' }] });
});

app.get('/api/todos', (c) => {
  const todos = db.query('SELECT * FROM todos ORDER BY created_at DESC').all() as Array<{id: number; text: string; completed: number; created_at: string}>;
  return c.json({ todos: todos.map((t: any) => ({...t, completed: !!t.completed})) });
});

app.post('/api/todos', async (c) => {
  const body = await c.req.json() as {text: string};
  const result = db.run('INSERT INTO todos (text) VALUES (?)', [body.text]);
  const todo = db.query('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid) as any;
  return c.json({ ...todo, completed: !!todo.completed });
});

app.patch('/api/todos/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json() as {completed?: boolean};
  if (body.completed !== undefined) {
    db.run('UPDATE todos SET completed = ? WHERE id = ?', [body.completed ? 1 : 0, id]);
  }
  const todo = db.query('SELECT * FROM todos WHERE id = ?').get(id) as any;
  if (!todo) return c.json({ error: 'Not found' }, 404);
  return c.json({ ...todo, completed: !!todo.completed });
});

app.delete('/api/todos/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const result = db.run('DELETE FROM todos WHERE id = ?', [id]);
  if (result.changes === 0) return c.json({ error: 'Not found' }, 404);
  return c.json({ success: true });
});

const hostname = '100.115.154.32';
const port = 3000;
console.log(`Server running at http://${hostname}:${port}`);

serve({ fetch: app.fetch, port, hostname });
