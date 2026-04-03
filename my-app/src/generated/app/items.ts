import { Hono } from 'hono';
import { db } from '../../db.js';
import { z } from 'zod';

const router = new Hono();


const CreateSchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
  category_id: z.number().int().nullable().optional()
});

const UpdateSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').optional(),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  category_id: z.number().int().nullable().optional()
});

router.get('/', (c) => {
  const { search, category_id, sort, order } = c.req.query();
  
  let sql = `SELECT i.id, i.name, i.quantity, i.category_id, i.created_at, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id`;
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  
  if (search) {
    conditions.push('i.name LIKE ?');
    params.push(`%${search}%`);
  }
  
  if (category_id) {
    conditions.push('i.category_id = ?');
    params.push(parseInt(category_id));
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  const validSort = ['name', 'quantity', 'created_at'].includes(sort) ? sort : 'name';
  const validOrder = order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY i.${validSort} ${validOrder}`;
  
  const items = db.prepare(sql).all(...params);
  return c.json(items);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const result = CreateSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
  
  const { name, quantity, category_id } = result.data;
  
  if (category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }
  }
  
  const insertResult = db.prepare('INSERT INTO items (name, quantity, category_id) VALUES (?, ?, ?)').run(name, quantity, category_id ?? null);
  
  const item = db.prepare(`SELECT i.id, i.name, i.quantity, i.category_id, i.created_at, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`).get(insertResult.lastInsertRowid);
  
  return c.json(item, 201);
});

router.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const item = db.prepare(`SELECT i.id, i.name, i.quantity, i.category_id, i.created_at, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`).get(id);
  
  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }
  
  return c.json(item);
});

router.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const result = UpdateSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }
  
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }
  
  const { name, quantity, category_id } = result.data;
  
  if (category_id != null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return c.json({ error: 'Category not found' }, 400);
    }
  }
  
  const updates: string[] = [];
  const params: (string | number | null)[] = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (quantity !== undefined) {
    updates.push('quantity = ?');
    params.push(quantity);
  }
  
  if (category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(category_id);
  }
  
  if (updates.length === 0) {
    const item = db.prepare(`SELECT i.id, i.name, i.quantity, i.category_id, i.created_at, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`).get(id);
    return c.json(item);
  }
  
  params.push(id);
  db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const item = db.prepare(`SELECT i.id, i.name, i.quantity, i.category_id, i.created_at, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`).get(id);
  
  return c.json(item);
});

router.delete('/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Item not found' }, 404);
  }
  
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  
  return c.body(null, 204);
});

export default router;

export const _phoenix = {
  iu_id: 'eec5ac5bc606ad36de28ac8c69305dc84143fff6e480ecca9cbd3cebead7c3f8',
  name: 'Items',
  risk_tier: 'high',
  canon_ids: [4]
} as const;