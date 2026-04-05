import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated API route modules
import api from './generated/app/api.js';
import categories from './generated/app/categories.js';
import items_dashboard from './generated/app/items-dashboard.js';
import items from './generated/app/items.js';

// Mount API routes
mount('/api', api);
mount('/api/categories', categories);
mount('/api/items', items);
mount('/ui/items-dashboard', items_dashboard);

// REQUIREMENT: Dashboard must be served at the root path "/" as the default landing page
app.get('/', (c) => c.redirect('/ui/items-dashboard'));

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
