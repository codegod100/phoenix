import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

// ============================================================================
// __MIGRATIONS__
// ============================================================================

registerMigration('categories', `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ============================================================================
// __SCHEMAS__
// ============================================================================

// Category Schemas
const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
});

// Item Schemas
const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
  category_id: z.number().int().nullable().optional(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  category_id: z.number().int().nullable().optional(),
});

// ============================================================================
// __ROUTES__ - Categories
// ============================================================================

router.get('/categories', (c) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return c.json(categories);
});

router.get('/categories/:id', (c) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(c.req.param('id'));
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

router.post('/categories', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = CreateCategorySchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const { name, description } = result.data;
  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  return c.json(category, 201);
});

router.patch('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Category not found' }, 404);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = UpdateCategorySchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const u = result.data;
  const updates: string[] = [];
  const params: unknown[] = [];

  if (u.name !== undefined) {
    updates.push('name = ?');
    params.push(u.name);
  }
  if (u.description !== undefined) {
    updates.push('description = ?');
    params.push(u.description);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return c.json(category);
});

router.delete('/categories/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Category not found' }, 404);

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return c.body(null, 204);
});

// ============================================================================
// __ROUTES__ - Items
// ============================================================================

router.get('/', (c) => {
  const search = c.req.query('search');
  const categoryId = c.req.query('category_id');
  const sort = c.req.query('sort');
  const order = c.req.query('order') === 'desc' ? 'DESC' : 'ASC';

  let sql = `
    SELECT 
      items.*,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Search by name (partial match)
  if (search !== undefined && search.trim() !== '') {
    conditions.push('items.name LIKE ?');
    params.push(`%${search}%`);
  }

  // Filter by category
  if (categoryId !== undefined && categoryId !== '') {
    conditions.push('items.category_id = ?');
    params.push(Number(categoryId));
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sort by name or quantity
  let orderBy = 'items.created_at';
  if (sort === 'name') {
    orderBy = 'items.name';
  } else if (sort === 'quantity') {
    orderBy = 'items.quantity';
  }

  sql += ` ORDER BY ${orderBy} ${order}`;

  const items = db.prepare(sql).all(...params);
  return c.json(items);
});

router.get('/:id', (c) => {
  const item = db.prepare(`
    SELECT 
      items.*,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(c.req.param('id'));

  if (!item) return c.json({ error: 'Item not found' }, 404);
  return c.json(item);
});

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

  // Validate category if provided
  if (category_id != null) {
    const categoryExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!categoryExists) {
      return c.json({ error: 'Category not found' }, 400);
    }
  }

  const info = db.prepare(`
    INSERT INTO items (name, quantity, category_id, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(name, quantity, category_id ?? null);

  const item = db.prepare(`
    SELECT 
      items.*,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(info.lastInsertRowid);

  return c.json(item, 201);
});

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Item not found' }, 404);

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

  const u = result.data;
  const updates: string[] = [];
  const params: unknown[] = [];

  if (u.name !== undefined) {
    updates.push('name = ?');
    params.push(u.name);
  }
  if (u.quantity !== undefined) {
    updates.push('quantity = ?');
    params.push(u.quantity);
  }
  if (u.category_id !== undefined) {
    // Validate category if being set to a non-null value
    if (u.category_id != null) {
      const categoryExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(u.category_id);
      if (!categoryExists) {
        return c.json({ error: 'Category not found' }, 400);
      }
    }
    updates.push('category_id = ?');
    params.push(u.category_id);
  }

  if (updates.length === 0) {
    const item = db.prepare(`
      SELECT items.*, categories.name as category_name
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      WHERE items.id = ?
    `).get(id);
    return c.json(item);
  }

  // Always update the updated_at timestamp
  updates.push('updated_at = datetime(\'now\')');
  params.push(id);

  db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const item = db.prepare(`
    SELECT 
      items.*,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(id);

  return c.json(item);
});

router.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Item not found' }, 404);

  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return c.body(null, 204);
});

// ============================================================================
// __EXPORTS__
// ============================================================================

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'eec5ac5bc606ad36de28ac8c69305dc84143fff6e480ecca9cbd3cebead7c3f8',
  name: 'Items',
  risk_tier: 'high',
  canon_ids: [4 as const],
} as const;
