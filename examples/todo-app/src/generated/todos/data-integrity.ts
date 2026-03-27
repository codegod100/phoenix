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
    title TEXT NOT NULL CHECK(length(title) > 0 AND length(title) <= 500),
    description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 5000),
    priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    project_id INTEGER REFERENCES projects(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Add trigger for updated_at
registerMigration('tasks_updated_at_trigger', `
  CREATE TRIGGER IF NOT EXISTS tasks_updated_at
  AFTER UPDATE ON tasks
  BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
  END
`);

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(500, 'Title cannot exceed 500 characters'),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional().default(''),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  due_date: z.string().refine((date) => {
    if (!date) return true;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 3000;
  }, 'Invalid due date').optional(),
  project_id: z.number().int().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(500, 'Title cannot exceed 500 characters').optional(),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  due_date: z.string().refine((date) => {
    if (!date) return true;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 3000;
  }, 'Invalid due date').nullable().optional(),
  completed: z.number().int().min(0).max(1).optional(),
  project_id: z.number().int().nullable().optional(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name cannot be empty').max(200, 'Project name cannot exceed 200 characters'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color').default('#3b82f6'),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Project name cannot be empty').max(200, 'Project name cannot exceed 200 characters').optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color').optional(),
});

const router = new Hono();

// Task routes
router.get('/tasks', (c) => {
  let sql = `
    SELECT 
      tasks.*,
      projects.name as project_name,
      projects.color as project_color,
      CASE 
        WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 THEN 1 
        ELSE 0 
      END as overdue
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

  const priority = c.req.query('priority');
  if (priority && ['urgent', 'high', 'normal', 'low'].includes(priority)) {
    conditions.push('tasks.priority = ?');
    params.push(priority);
  }

  const projectId = c.req.query('project_id');
  if (projectId !== undefined) {
    if (projectId === 'null' || projectId === '') {
      conditions.push('tasks.project_id IS NULL');
    } else {
      conditions.push('tasks.project_id = ?');
      params.push(Number(projectId));
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ` 
    ORDER BY 
      tasks.completed ASC,
      CASE 
        WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 THEN 0
        ELSE 1 
      END ASC,
      CASE tasks.priority 
        WHEN 'urgent' THEN 0 
        WHEN 'high' THEN 1 
        WHEN 'normal' THEN 2 
        WHEN 'low' THEN 3 
      END ASC,
      tasks.created_at DESC
  `;

  const tasks = db.prepare(sql).all(...params);
  return c.json(tasks);
});

router.get('/tasks/:id', (c) => {
  const task = db.prepare(`
    SELECT 
      tasks.*,
      projects.name as project_name,
      projects.color as project_color,
      CASE 
        WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 THEN 1 
        ELSE 0 
      END as overdue
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id 
    WHERE tasks.id = ?
  `).get(c.req.param('id'));
  
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
});

router.post('/tasks', async (c) => {
  let body;
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

  // Validate project exists if specified
  if (project_id !== undefined) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 400);
    }
  }

  try {
    const info = db.prepare(`
      INSERT INTO tasks (title, description, priority, due_date, project_id) 
      VALUES (?, ?, ?, ?, ?)
    `).run(title, description, priority, due_date || null, project_id || null);

    const task = db.prepare(`
      SELECT 
        tasks.*,
        projects.name as project_name,
        projects.color as project_color,
        CASE 
          WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 THEN 1 
          ELSE 0 
        END as overdue
      FROM tasks 
      LEFT JOIN projects ON tasks.project_id = projects.id 
      WHERE tasks.id = ?
    `).get(info.lastInsertRowid);

    return c.json(task, 201);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('CHECK constraint failed')) {
      return c.json({ error: 'Data validation failed' }, 400);
    }
    throw error;
  }
});

router.patch('/tasks/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  let body;
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

  // Validate project exists if being updated
  if (updates.project_id !== undefined && updates.project_id !== null) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(updates.project_id);
    if (!project) {
      return c.json({ error: 'Project not found' }, 400);
    }
  }

  try {
    // Update fields individually to handle last-write-wins
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
      SELECT 
        tasks.*,
        projects.name as project_name,
        projects.color as project_color,
        CASE 
          WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 THEN 1 
          ELSE 0 
        END as overdue
      FROM tasks 
      LEFT JOIN projects ON tasks.project_id = projects.id 
      WHERE tasks.id = ?
    `).get(id);

    return c.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('CHECK constraint failed')) {
      return c.json({ error: 'Data validation failed' }, 400);
    }
    throw error;
  }
});

router.delete('/tasks/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return c.body(null, 204);
});

// Project routes
router.get('/projects', (c) => {
  const projects = db.prepare(`
    SELECT 
      projects.*,
      COUNT(tasks.id) as task_count,
      COUNT(CASE WHEN tasks.completed = 0 THEN 1 END) as active_task_count
    FROM projects 
    LEFT JOIN tasks ON projects.id = tasks.project_id 
    GROUP BY projects.id 
    ORDER BY projects.name
  `).all();
  return c.json(projects);
});

router.get('/projects/:id', (c) => {
  const project = db.prepare(`
    SELECT 
      projects.*,
      COUNT(tasks.id) as task_count,
      COUNT(CASE WHEN tasks.completed = 0 THEN 1 END) as active_task_count
    FROM projects 
    LEFT JOIN tasks ON projects.id = tasks.project_id 
    WHERE projects.id = ? 
    GROUP BY projects.id
  `).get(c.req.param('id'));
  
  if (!project) return c.json({ error: 'Project not found' }, 404);
  return c.json(project);
});

router.post('/projects', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = CreateProjectSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const { name, color } = result.data;

  try {
    const info = db.prepare('INSERT INTO projects (name, color) VALUES (?, ?)').run(name, color);
    const project = db.prepare(`
      SELECT 
        projects.*,
        0 as task_count,
        0 as active_task_count
      FROM projects 
      WHERE id = ?
    `).get(info.lastInsertRowid);
    return c.json(project, 201);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Project name already exists' }, 400);
    }
    throw error;
  }
});

router.patch('/projects/:id', async (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Project not found' }, 404);

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const result = UpdateProjectSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  const updates = result.data;

  try {
    if (updates.name !== undefined) {
      db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(updates.name, id);
    }
    if (updates.color !== undefined) {
      db.prepare('UPDATE projects SET color = ? WHERE id = ?').run(updates.color, id);
    }

    const updated = db.prepare(`
      SELECT 
        projects.*,
        COUNT(tasks.id) as task_count,
        COUNT(CASE WHEN tasks.completed = 0 THEN 1 END) as active_task_count
      FROM projects 
      LEFT JOIN tasks ON projects.id = tasks.project_id 
      WHERE projects.id = ? 
      GROUP BY projects.id
    `).get(id);

    return c.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Project name already exists' }, 400);
    }
    throw error;
  }
});

router.delete('/projects/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Project not found' }, 404);

  // Check for dependent tasks - prevent cascade deletion
  const dependentTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(id) as { count: number };
  if (dependentTasks.count > 0) {
    return c.json({ 
      error: `Cannot delete project with ${dependentTasks.count} associated tasks. Please reassign or delete tasks first.` 
    }, 400);
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return c.body(null, 204);
});

// Data integrity validation endpoint
router.get('/validate', (c) => {
  const issues: string[] = [];

  // Check for orphaned tasks (referencing non-existent projects)
  const orphanedTasks = db.prepare(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE project_id IS NOT NULL 
    AND project_id NOT IN (SELECT id FROM projects)
  `).get() as { count: number };
  
  if (orphanedTasks.count > 0) {
    issues.push(`${orphanedTasks.count} tasks reference non-existent projects`);
  }

  // Check for invalid due dates
  const invalidDates = db.prepare(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE due_date IS NOT NULL 
    AND (due_date = '' OR date(due_date) IS NULL)
  `).get() as { count: number };
  
  if (invalidDates.count > 0) {
    issues.push(`${invalidDates.count} tasks have invalid due dates`);
  }

  // Check for constraint violations that might have slipped through
  const invalidTitles = db.prepare(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE title = '' OR length(title) > 500
  `).get() as { count: number };
  
  if (invalidTitles.count > 0) {
    issues.push(`${invalidTitles.count} tasks have invalid titles`);
  }

  const invalidDescriptions = db.prepare(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE length(description) > 5000
  `).get() as { count: number };
  
  if (invalidDescriptions.count > 0) {
    issues.push(`${invalidDescriptions.count} tasks have descriptions exceeding 5000 characters`);
  }

  const invalidPriorities = db.prepare(`
    SELECT COUNT(*) as count 
    FROM tasks 
    WHERE priority NOT IN ('urgent', 'high', 'normal', 'low')
  `).get() as { count: number };
  
  if (invalidPriorities.count > 0) {
    issues.push(`${invalidPriorities.count} tasks have invalid priority values`);
  }

  return c.json({
    valid: issues.length === 0,
    issues: issues,
    checked_at: new Date().toISOString()
  });
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '1f677d4ba5f46a3cd75931c51f4bdc76ac0da22a981004342a40d675ad84749b',
  name: 'Data Integrity',
  risk_tier: 'high',
  canon_ids: [9 as const],
} as const;