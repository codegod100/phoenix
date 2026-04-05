import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated API route modules
import api from './generated/app/api.js';
import categories from './generated/app/categories.js';
import items_dashboard from './generated/app/items-dashboard.js';
import items from './generated/app/items.js';

// Generated UI component modules
import Database from './generated/app/database.ui.js';
import ItemsDashboard from './generated/app/items-dashboard.ui.js';

// Mount API routes
mount('/api', api);
mount('/categories', categories);
mount('/items-dashboard', items_dashboard);
mount('/items', items);

// Register UI routes that use runtime HTML generation
app.get('/ui/database', (c) => {
  const ui = new Database();
  return c.html(ui.generateHTML());
});
app.get('/ui/items-dashboard', (c) => {
  const ui = new ItemsDashboard();
  return c.html(ui.generateHTML());
});

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
