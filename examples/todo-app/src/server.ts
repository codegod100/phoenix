import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated route modules
import data_integrity from './generated/todos/data-integrity.js';
import filtering_and_views from './generated/todos/filtering-and-views.js';
import integration from './generated/todos/integration.js';
import projects from './generated/todos/projects.js';
import quick_stats from './generated/todos/quick-stats.js';
import tasks from './generated/todos/tasks.js';
import web_experience from './generated/todos/web-experience.js';

// Mount routes
mount('/data-integrity', data_integrity);
mount('/filtering-and-views', filtering_and_views);
mount('/integration', integration);
mount('/projects', projects);
mount('/quick-stats', quick_stats);
mount('/tasks', tasks);
mount('', web_experience);

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
