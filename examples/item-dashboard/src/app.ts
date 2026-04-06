import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));

// Root route is defined in server.ts to redirect to dashboard
// REQUIREMENT: Dashboard must be served at the root path "/" as the default landing page

app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json({ error: err.message }, 500);
});

export function mount(path: string, router: Hono): void {
  app.route(path, router);
}

export { app };
