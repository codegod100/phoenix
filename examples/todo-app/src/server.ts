import { serve } from '@hono/node-server';
import { app, mount } from './app.js';
import { runMigrations } from './db.js';

// Generated route modules
import create_todo from './generated/todos/create-todo.js';
import delete_todo from './generated/todos/delete-todo.js';
import error_handling from './generated/todos/error-handling.js';
import get_todo from './generated/todos/get-todo.js';
import list_todos from './generated/todos/list-todos.js';
import update_todo from './generated/todos/update-todo.js';

// Mount routes
mount('/todos', create_todo);
mount('/todos', delete_todo);
mount('/todos', error_handling);
mount('/todos', get_todo);
mount('/todos', list_todos);
mount('/todos', update_todo);

const port = parseInt(process.env.PORT ?? '3000', 10);
runMigrations();
console.log(`Server running at http://localhost:${port}`);
serve({ fetch: app.fetch, port });
