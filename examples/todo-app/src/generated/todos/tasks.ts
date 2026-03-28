import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// Register table migrations
registerMigration('projects', `
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('tasks', `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    project_id INTEGER REFERENCES projects(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters'),
  description: z.string().max(5000, 'Description must not exceed 5000 characters').optional().default(''),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
  due_date: z.string().refine((date) => {
    if (!date) return true;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 3000;
  }, 'Invalid due date').optional(),
  project_id: z.number().int().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must not exceed 500 characters').optional(),
  description: z.string().max(5000, 'Description must not exceed 5000 characters').optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  due_date: z.string().nullable().refine((date) => {
    if (!date) return true;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 3000;
  }, 'Invalid due date').optional(),
  completed: z.number().int().min(0).max(1).optional(),
  project_id: z.number().int().nullable().optional(),
});

const router = new Hono();

// Stats endpoint - moved before /:id to avoid route conflicts
router.get('/stats', (c) => {
  const projectId = c.req.query('project_id');
  let whereClause = '';
  const params: (string | number)[] = [];

  if (projectId !== undefined) {
    if (projectId === 'inbox') {
      whereClause = 'WHERE project_id IS NULL';
    } else {
      whereClause = 'WHERE project_id = ?';
      params.push(Number(projectId));
    }
  }

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(completed) as completed_tasks,
      COUNT(CASE WHEN due_date < date('now') AND completed = 0 THEN 1 END) as overdue_tasks
    FROM tasks ${whereClause}
  `).get(...params) as { total_tasks: number; completed_tasks: number; overdue_tasks: number };

  const completion_percentage = stats.total_tasks > 0 
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) 
    : 0;

  return c.json({
    total_tasks: stats.total_tasks,
    completed_tasks: stats.completed_tasks,
    overdue_tasks: stats.overdue_tasks,
    completion_percentage
  });
});

// List tasks with filtering and sorting
router.get('/', (c) => {
  let sql = `
    SELECT tasks.*, projects.name as project_name, projects.color as project_color
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id
  `;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const status = c.req.query('status');
  if (status === 'active') {
    conditions.push('tasks.completed = 0');
  } else if (status === 'completed') {
    conditions.push('tasks.completed = 1');
  }

  const projectId = c.req.query('project_id');
  if (projectId !== undefined) {
    if (projectId === 'inbox') {
      conditions.push('tasks.project_id IS NULL');
    } else {
      conditions.push('tasks.project_id = ?');
      params.push(Number(projectId));
    }
  }

  const priority = c.req.query('priority');
  if (priority) {
    conditions.push('tasks.priority = ?');
    params.push(priority);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sort by urgency and overdue status first, then by creation date
  sql += ` ORDER BY 
    CASE tasks.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
    CASE WHEN tasks.due_date < date('now') AND tasks.completed = 0 THEN 0 ELSE 1 END,
    tasks.created_at DESC
  `;

  const tasks = db.prepare(sql).all(...params);
  return c.json(tasks);
});

// Get single task
router.get('/:id', (c) => {
  const task = db.prepare(`
    SELECT tasks.*, projects.name as project_name, projects.color as project_color
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id 
    WHERE tasks.id = ?
  `).get(c.req.param('id'));
  
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

// Create task
router.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = CreateTaskSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const { title, description, priority, due_date, project_id } = result.data;

  // Validate project exists if provided
  if (project_id !== undefined) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 400);
    }
  }

  const info = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, project_id) 
    VALUES (?, ?, ?, ?, ?)
  `).run(title, description, priority, due_date ?? null, project_id ?? null);

  const task = db.prepare(`
    SELECT tasks.*, projects.name as project_name, projects.color as project_color
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id 
    WHERE tasks.id = ?
  `).get(info.lastInsertRowid);

  return c.json(task, 201);
});

// Update task
router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = UpdateTaskSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const updates = result.data;

  // Validate project exists if provided
  if (updates.project_id !== undefined && updates.project_id !== null) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(updates.project_id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 400);
    }
  }

  // Apply updates
  if (updates.title !== undefined) {
    db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(updates.title, id);
  }
  if (updates.description !== undefined) {
    db.prepare('UPDATE tasks SET description = ? WHERE id = ?').run(updates.description, id);
  }
  if (updates.priority !== undefined) {
    db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(updates.priority, id);
  }
  if (updates.due_date !== undefined) {
    db.prepare('UPDATE tasks SET due_date = ? WHERE id = ?').run(updates.due_date, id);
  }
  if (updates.completed !== undefined) {
    db.prepare('UPDATE tasks SET completed = ? WHERE id = ?').run(updates.completed, id);
  }
  if (updates.project_id !== undefined) {
    db.prepare('UPDATE tasks SET project_id = ? WHERE id = ?').run(updates.project_id, id);
  }

  const updated = db.prepare(`
    SELECT tasks.*, projects.name as project_name, projects.color as project_color
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id 
    WHERE tasks.id = ?
  `).get(id);

  return c.json(updated);
});

// Delete task
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return c.body(null, 204);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '72e5373eca8ea41d110527651ae938509fb7c778e5a71c99c46d83839e91915c',
  name: 'Tasks',
  risk_tier: 'high',
  canon_ids: [14 as const],
} as const;