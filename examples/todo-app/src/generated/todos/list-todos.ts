import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { z } from 'zod';

// Initialize database
const db = new Database('todos.db');

// Register table migration
const registerMigration = (name: string, sql: string) => {
  db.exec(sql);
};

registerMigration('todos', `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const router = new Hono();

// List all todos
router.get('/', (c) => {
  const todos = db.prepare('SELECT * FROM todos ORDER BY created_at DESC').all();
  return c.json(todos);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'b4ca84ec9f97151d78e179fd1d2450329d547e78e438c71413713fe74fb940d5',
  name: 'List Todos',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;