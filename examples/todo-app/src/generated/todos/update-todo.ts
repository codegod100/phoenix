import { Hono } from 'hono';
import { z } from 'zod';
import Database from 'better-sqlite3';

const db = new Database('todos.db');

// Register table migration
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const UpdateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

const router = new Hono();

// Update todo
router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Todo not found' }, 404);
  
  const result = UpdateTodoSchema.safeParse(await c.req.json());
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  
  const updates = result.data;
  if (updates.title !== undefined) {
    db.prepare('UPDATE todos SET title = ? WHERE id = ?').run(updates.title, id);
  }
  if (updates.completed !== undefined) {
    db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(updates.completed ? 1 : 0, id);
  }
  
  const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  return c.json(updated);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'f919a513e6f8d05e248debc46ac84046e17e891472f61fc9c0cf35619ebff8f9',
  name: 'Update Todo',
  risk_tier: 'high',
  canon_ids: [8 as const],
} as const;