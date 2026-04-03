import { Hono } from 'hono';
import { db, registerMigration } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// ============================================================================
// MIGRATIONS
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional().default(''),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
});

const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').default(0),
  category_id: z.number().int().nullable().optional(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  category_id: z.number().int().nullable().optional(),
});

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// List all categories
router.get('/categories', (c) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return c.json(categories);
});

// Get single category
router.get('/categories/:id', (c) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(c.req.param('id'));
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

// Create category
router.post('/categories', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = CreateCategorySchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const { name, description } = result.data;
  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  return c.json(category, 201);
});

// Update category
router.patch('/categories/:id', async (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    return c.json({ error: 'Category not found' }, 404);
  }
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = UpdateCategorySchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const u = result.data;
  if (u.name !== undefined) db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(u.name, id);
  if (u.description !== undefined) db.prepare('UPDATE categories SET description = ? WHERE id = ?').run(u.description, id);
  return c.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

// Delete category
router.delete('/categories/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    return c.json({ error: 'Category not found' }, 404);
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return c.body(null, 204);
});

// ============================================================================
// ITEM ROUTES
// ============================================================================

// List items with search, filter, and sort
router.get('/', (c) => {
  const search = c.req.query('search');
  const categoryId = c.req.query('category_id');
  const sortBy = c.req.query('sort_by') || 'name';
  const sortOrder = c.req.query('sort_order') || 'asc';

  // Validate sort parameters
  const validSortColumns = ['name', 'quantity', 'created_at'];
  const validSortOrders = ['asc', 'desc'];
  const orderColumn = validSortColumns.includes(sortBy) ? sortBy : 'name';
  const orderDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

  let sql = `
    SELECT items.*, categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search !== undefined && search.trim() !== '') {
    conditions.push('items.name LIKE ?');
    params.push(`%${search}%`);
  }

  if (categoryId !== undefined && categoryId !== '') {
    conditions.push('items.category_id = ?');
    params.push(Number(categoryId));
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ` ORDER BY items.${orderColumn} ${orderDirection}`;

  return c.json(db.prepare(sql).all(...params));
});

// Get single item
router.get('/:id', (c) => {
  const item = db.prepare(`
    SELECT items.*, categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(c.req.param('id'));
  if (!item) return c.json({ error: 'Item not found' }, 404);
  return c.json(item);
});

// Create item
router.post('/', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = CreateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const { name, quantity, category_id } = result.data;

  // Validate category if provided
  if (category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) return c.json({ error: 'Category not found' }, 400);
  }

  const info = db.prepare('INSERT INTO items (name, quantity, category_id) VALUES (?, ?, ?)')
    .run(name, quantity, category_id ?? null);

  const item = db.prepare(`
    SELECT items.*, categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(info.lastInsertRowid);

  return c.json(item, 201);
});

// Update item
router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) {
    return c.json({ error: 'Item not found' }, 404);
  }

  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = UpdateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const u = result.data;

  // Validate category if provided
  if (u.category_id !== undefined && u.category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(u.category_id);
    if (!category) return c.json({ error: 'Category not found' }, 400);
  }

  if (u.name !== undefined) db.prepare('UPDATE items SET name = ? WHERE id = ?').run(u.name, id);
  if (u.quantity !== undefined) db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(u.quantity, id);
  if (u.category_id !== undefined) db.prepare('UPDATE items SET category_id = ? WHERE id = ?').run(u.category_id, id);

  return c.json(db.prepare(`
    SELECT items.*, categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `).get(id));
});

// Delete item
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) {
    return c.json({ error: 'Item not found' }, 404);
  }
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return c.body(null, 204);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'eec5ac5bc606ad36de28ac8c69305dc84143fff6e480ecca9cbd3cebead7c3f8',
  name: 'Items',
  risk_tier: 'high',
  canon_ids: [4 as const],
} as const;
