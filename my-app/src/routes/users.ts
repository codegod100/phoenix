import { Hono } from 'hono';
import { db, registerMigration } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// Migration
registerMigration('users', `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Zod Schemas
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: z.enum(['admin', 'user', 'guest']).optional().default('user'),
  is_active: z.boolean().optional().default(true),
});

const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  role: z.enum(['admin', 'user', 'guest']).optional(),
  is_active: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('10'),
  search: z.string().optional(),
  role: z.enum(['admin', 'user', 'guest']).optional(),
  is_active: z.string().transform((v) => v === 'true').optional(),
  sort_by: z.enum(['name', 'email', 'created_at', 'role']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Helper to transform SQLite integers to booleans
const transformUser = (user: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!user) return null;
  return {
    ...user,
    is_active: Boolean(user.is_active),
  };
};

// Routes

// List users with pagination, search, and filters
router.get('/', (c) => {
  const queryResult = ListQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ error: queryResult.error.issues[0].message }, 400);
  }

  const { page, limit, search, role, is_active, sort_by, sort_order } = queryResult.data;
  const offset = (page - 1) * limit;

  let whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    whereClauses.push('(name LIKE ? OR email LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern);
  }

  if (role) {
    whereClauses.push('role = ?');
    params.push(role);
  }

  if (is_active !== undefined) {
    whereClauses.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderClause = `ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
  const countResult = db.prepare(countQuery).get(...params) as { total: number };
  const total = countResult.total;

  // Get users
  const usersQuery = `SELECT * FROM users ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
  const users = db.prepare(usersQuery).all(...params, limit, offset) as Record<string, unknown>[];

  return c.json({
    data: users.map(transformUser),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
});

// Get single user
router.get('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id) || id <= 0) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | null;
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json(transformUser(user));
});

// Create user
router.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = CreateUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const { email, name, role, is_active } = result.data;

  // Check for duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return c.json({ error: 'Email already exists' }, 409);
  }

  try {
    const info = db.prepare(
      'INSERT INTO users (email, name, role, is_active) VALUES (?, ?, ?, ?)'
    ).run(email, name, role, is_active ? 1 : 0);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
    return c.json(transformUser(user), 201);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to create user', details: errorMessage }, 500);
  }
});

// Update user
router.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id) || id <= 0) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const result = UpdateUserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const updates = result.data;
  const updateFields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.email !== undefined) {
    // Check for duplicate email (excluding current user)
    const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(updates.email, id);
    if (duplicate) {
      return c.json({ error: 'Email already exists' }, 409);
    }
    updateFields.push('email = ?');
    values.push(updates.email);
  }

  if (updates.name !== undefined) {
    updateFields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.role !== undefined) {
    updateFields.push('role = ?');
    values.push(updates.role);
  }

  if (updates.is_active !== undefined) {
    updateFields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }

  if (updateFields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  // Always update updated_at
  updateFields.push('updated_at = datetime(\'now\')');

  try {
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.prepare(sql).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown>;
    return c.json(transformUser(user));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to update user', details: errorMessage }, 500);
  }
});

// Delete user
router.delete('/:id', (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id) || id <= 0) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'User not found' }, 404);
  }

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return c.body(null, 204);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to delete user', details: errorMessage }, 500);
  }
});

export default router;
