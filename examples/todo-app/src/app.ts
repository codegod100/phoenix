import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', uptime: process.uptime() }));

// Error handler — log details and return JSON
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json({ error: err.message }, 500);
});

/**
 * Mount a route module. Call this for each generated module.
 */
export function mount(path: string, router: Hono): void {
  app.route(path, router);
}

export { app };
