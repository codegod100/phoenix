import { Hono } from 'hono';
import { db } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// ============================================================================
// SCHEMAS
// ============================================================================

const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
});

// ============================================================================
// CATEGORY ROUTES
// ============================================================================

// List all categories
router.get('/', (c) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return c.json(categories);
});

// Get single category
router.get('/:id', (c) => {
  const id = c.req.param('id');
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

// Create category
router.post('/', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = CreateCategorySchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const { name, description } = result.data;
  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description ?? '');
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  return c.json(category, 201);
});

// Update category
router.patch('/:id', async (c) => {
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

// Delete category - items will be unassigned due to ON DELETE SET NULL
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(id)) {
    return c.json({ error: 'Category not found' }, 404);
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return c.body(null, 204);
});

export default router;

export const _phoenix = {
  iu_id: 'a8b0eee61d73036c293347a0bdc01b99a2d5166d7b5f427b92f11e458745bd4e',
  name: 'Categories',
  risk_tier: 'medium',
  canon_ids: [6],
} as const;
