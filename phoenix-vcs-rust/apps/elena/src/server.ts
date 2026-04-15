import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({ origin: '*' }));

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'Elena Dashboard',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/users', (c) => {
  return c.json({
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Carol', email: 'carol@example.com' }
    ]
  });
});

app.get('/api/todos', (c) => {
  return c.json({
    todos: [
      { id: 1, text: 'Learn ElenaJS', completed: true },
      { id: 2, text: 'Build web components', completed: false },
      { id: 3, text: 'Deploy with Hono', completed: false }
    ]
  });
});

app.post('/api/todos', async (c) => {
  const body = await c.req.json();
  return c.json({ 
    id: Date.now(),
    text: body.text,
    completed: false,
    created: true 
  }, 201);
});

// Serve static files in production
app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elena Dashboard</title>
  <script type="module" src="/main.js"></script>
</head>
<body>
  <elena-app></elena-app>
</body>
</html>
  `);
});

const port = process.env.PORT || 3000;

serve({
  fetch: app.fetch,
  port: Number(port)
}, (info) => {
  console.log(`🚀 Elena Dashboard server running at http://localhost:${info.port}`);
});
