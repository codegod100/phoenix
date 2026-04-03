import { Hono } from 'hono';
import { z } from 'zod';
import { db, registerMigration } from './db.js';

// Migration
registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Zod Schemas
export const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(200),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').default(0),
  category_id: z.number().int().nullable().optional(),
});

export const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').max(200).optional(),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').optional(),
  category_id: z.number().int().nullable().optional(),
});

// Router
const router = new Hono();

// GET / - List all items with category names
router.get('/', (c) => {
  const items = db
    .prepare(`
      SELECT 
        items.id,
        items.name,
        items.quantity,
        items.category_id,
        items.created_at,
        categories.name as category_name
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      ORDER BY items.created_at DESC
    `)
    .all();
  return c.json(items, 200);
});

// GET /:id - Get single item
router.get('/:id', (c) => {
  const id = c.req.param('id');
  const item = db
    .prepare(`
      SELECT 
        items.id,
        items.name,
        items.quantity,
        items.category_id,
        items.created_at,
        categories.name as category_name
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      WHERE items.id = ?
    `)
    .get(id);
  
  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }
  
  return c.json(item, 200);
});

// POST / - Create item
router.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = CreateItemSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const { name, quantity, category_id } = result.data;

  // FK validation
  if (category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }
  }

  const info = db
    .prepare('INSERT INTO items (name, quantity, category_id) VALUES (?, ?, ?)')
    .run(name, quantity, category_id ?? null);

  const item = db
    .prepare(`
      SELECT 
        items.id,
        items.name,
        items.quantity,
        items.category_id,
        items.created_at,
        categories.name as category_name
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      WHERE items.id = ?
    `)
    .get(info.lastInsertRowid);

  return c.json(item, 201);
});

// PATCH /:id - Update item
router.patch('/:id', async (c) => {
  const id = c.req.param('id');

  // Check item exists
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = UpdateItemSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const updates = result.data;

  // FK validation if category_id provided
  if (updates.category_id !== undefined && updates.category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(updates.category_id);
    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }
  }

  // Apply updates
  if (updates.name !== undefined) {
    db.prepare('UPDATE items SET name = ? WHERE id = ?').run(updates.name, id);
  }
  if (updates.quantity !== undefined) {
    db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(updates.quantity, id);
  }
  if (updates.category_id !== undefined) {
    db.prepare('UPDATE items SET category_id = ? WHERE id = ?').run(updates.category_id, id);
  }

  const item = db
    .prepare(`
      SELECT 
        items.id,
        items.name,
        items.quantity,
        items.category_id,
        items.created_at,
        categories.name as category_name
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      WHERE items.id = ?
    `)
    .get(id);

  return c.json(item, 200);
});

// DELETE /:id - Remove item
router.delete('/:id', (c) => {
  const id = c.req.param('id');

  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);

  return c.body(null, 204);
});

export default router;

export const _phoenix = { 
  iu_id: 'abc', 
  name: 'Items', 
  risk_tier: 'high', 
  canon_ids: [1] 
};
