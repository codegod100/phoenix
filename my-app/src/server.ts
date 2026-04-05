import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated API route modules
import api from './generated/app/api.js';
import categories from './generated/app/categories.js';
import items_dashboard from './generated/app/items-dashboard.js';
import items from './generated/app/items.js';

// Generated UI component modules (only those defined in IU graph)
import CategoriesUI from './generated/app/categories.ui.js';
import Database from './generated/app/database.ui.js';
import ItemsDashboardUI from './generated/app/items-dashboard.ui.js';
import LowStockUI from './generated/app/low-stock.ui.js';

// Mount API routes
mount('/api', api);
mount('/categories', categories);
mount('/items-dashboard', items_dashboard);
mount('/items', items);

// Mount UI apps (must exist in IU graph outputs)
mount('/ui/categories', CategoriesUI);
mount('/ui/database', Database);
mount('/ui/items-dashboard', ItemsDashboardUI);
mount('/ui/low-stock', LowStockUI);

// REQUIREMENT: Dashboard must be served at the root path "/" as the default landing page
app.get('/', (c) => c.redirect('/ui/items-dashboard'));

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
