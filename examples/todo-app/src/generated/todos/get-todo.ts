import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { z } from 'zod';

// Initialize database
const db = new Database('todos.db');

// Register table migration
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const router = new Hono();

// Get single todo
router.get('/:id', (c) => {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(c.req.param('id'));
  if (!todo) return c.json({ error: 'Todo not found' }, 404);
  return c.json(todo);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '816a02acf9b0b67d12cff867447f8fefa205fae6ab5339d68df019eaed49590a',
  name: 'Get Todo',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;