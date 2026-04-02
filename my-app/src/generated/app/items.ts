import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// ─── Database migrations ────────────────────────────────────────────────────

// ─── Database migrations ────────────────────────────────────────────────────

const router = new Hono();

registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  quantity: z.number().int(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').optional(),
  quantity: z.number().int().optional(),
});

router.get('/', (c) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  return c.json(items);
});

router.get('/:id', (c) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(c.req.param('id'));
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

router.post('/', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = CreateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const { name, quantity } = result.data;
  const info = db.prepare('INSERT INTO items (name, quantity) VALUES (?, ?)').run(name, quantity);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
  return c.json(item, 201);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = UpdateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const u = result.data;
  if (u.name !== undefined) db.prepare('UPDATE items SET name = ? WHERE id = ?').run(u.name, id);
  if (u.quantity !== undefined) db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(u.quantity, id);
  return c.json(db.prepare('SELECT * FROM items WHERE id = ?').get(id));
});

router.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return c.body(null, 204);
});

/** @internal Phoenix VCS traceability — do not remove. */


/** @internal Phoenix VCS traceability — do not remove. */


export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '8634d3aa38e01baa4b0302645e67fe2e6903e991f6c8056a537576b803539a33',
  name: 'Items',
  risk_tier: 'medium',
  canon_ids: [2 as const],
} as const;
