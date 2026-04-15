import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

const todos = [{ id: 1, text: 'Learn ElenaJS', completed: false }];

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', (c) => {
  return c.json({ users: [{ id: 1, name: 'Alice' }] });
});

app.get('/api/todos', (c) => {
  return c.json({ todos });
});

app.post('/api/todos', async (c) => {
  const body = await c.req.json();
  const todo = { id: Date.now(), text: body.text, completed: false };
  todos.push(todo);
  return c.json(todo);
});

app.patch('/api/todos/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const todo = todos.find(t => t.id === id);
  if (!todo) return c.json({ error: 'Not found' }, 404);
  if (body.completed !== undefined) todo.completed = body.completed;
  return c.json(todo);
});

app.delete('/api/todos/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const index = todos.findIndex(t => t.id === id);
  if (index === -1) return c.json({ error: 'Not found' }, 404);
  todos.splice(index, 1);
  return c.json({ success: true });
});

const hostname = '100.115.154.32';
const port = 3000;
console.log(`Server running at http://${hostname}:${port}`);

serve({ fetch: app.fetch, port, hostname });
