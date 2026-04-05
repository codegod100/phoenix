import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// API route modules
import items from './generated/app/items.js';
import items_dashboard from './generated/app/items-dashboard.js';

// Mount API routes
mount('/', items);
mount('/items-dashboard', items_dashboard);

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
console.log(`Dashboard available at http://localhost:${port}/items-dashboard`);
serve({ fetch: app.fetch, port });
