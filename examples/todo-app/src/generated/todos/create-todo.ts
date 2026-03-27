import { Hono } from 'hono';
import { z } from 'zod';
import Database from 'better-sqlite3';

const db = new Database('app.db');

// Register table migration
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const CreateTodoSchema = z.object({
  title: z.string().min(1, 'Title must not be empty').max(200, 'Title must not exceed 200 characters'),
});

const router = new Hono();

// Create todo
router.post('/', async (c) => {
  const result = CreateTodoSchema.safeParse(await c.req.json());
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  
  const { title } = result.data;
  const info = db.prepare('INSERT INTO todos (title) VALUES (?)').run(title);
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid);
  return c.json(todo, 201);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '088be9c52621e3f6408f91eb003afcc59616238c00e70963dc7d1e900486eb6f',
  name: 'Create Todo',
  risk_tier: 'high',
  canon_ids: [6 as const],
} as const;