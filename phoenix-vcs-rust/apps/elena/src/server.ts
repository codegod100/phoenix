import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/users', (c) => {
  return c.json({ users: [{ id: 1, name: 'Alice' }] });
});

app.get('/api/todos', (c) => {
  return c.json({ todos: [{ id: 1, text: 'Learn ElenaJS', completed: false }] });
});

app.post('/api/todos', async (c) => {
  const body = await c.req.json();
  return c.json({ id: Date.now(), text: body.text, completed: false });
});

const port = 3000;
console.log(`Server running at http://localhost:${port}`);

serve({ fetch: app.fetch, port });
