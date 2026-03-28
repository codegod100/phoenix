import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated route modules
import projects from './generated/todos/projects.js';
import tasks from './generated/todos/tasks.js';
import web_experience from './generated/todos/web-experience.js';

// Mount routes
mount('/projects', projects);
mount('/tasks', tasks);
mount('', web_experience);

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
