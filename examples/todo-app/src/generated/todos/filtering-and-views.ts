import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// Register migrations for tables this module touches
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
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    due_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    project_id INTEGER REFERENCES projects(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const router = new Hono();

// Get filtered tasks with combined filters
router.get('/tasks', (c) => {
  let sql = `
    SELECT 
      tasks.*,
      projects.name as project_name,
      projects.color as project_color,
      CASE 
        WHEN tasks.due_date IS NOT NULL AND tasks.due_date < date('now') AND tasks.completed = 0 
        THEN 1 
        ELSE 0 
      END as is_overdue
    FROM tasks 
    LEFT JOIN projects ON tasks.project_id = projects.id
  `;
  
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Filter by completion status
  const status = c.req.query('status');
  if (status === 'active') {
    conditions.push('tasks.completed = 0');
  } else if (status === 'completed') {
    conditions.push('tasks.completed = 1');
  }

  // Filter by project
  const projectId = c.req.query('project_id');
  if (projectId !== undefined) {
    if (projectId === 'inbox') {
      conditions.push('tasks.project_id IS NULL');
    } else {
      conditions.push('tasks.project_id = ?');
      params.push(Number(projectId));
    }
  }

  // Filter by priority
  const priority = c.req.query('priority');
  if (priority && ['urgent', 'high', 'normal', 'low'].includes(priority)) {
    conditions.push('tasks.priority = ?');
    params.push(priority);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sort by urgency and overdue status first
  sql += ` ORDER BY 
    is_overdue DESC,
    CASE tasks.priority 
      WHEN 'urgent' THEN 0 
      WHEN 'high' THEN 1 
      WHEN 'normal' THEN 2 
      WHEN 'low' THEN 3 
    END,
    tasks.created_at DESC
  `;

  const tasks = db.prepare(sql).all(...params);
  
  // Build current filter state
  const filterState = {
    status: status || 'all',
    project_id: projectId || null,
    priority: priority || null,
    active_filters: [] as string[]
  };

  if (status && status !== 'all') {
    filterState.active_filters.push(`Status: ${status}`);
  }
  if (projectId) {
    if (projectId === 'inbox') {
      filterState.active_filters.push('Project: Inbox');
    } else {
      const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as { name: string } | undefined;
      if (project) {
        filterState.active_filters.push(`Project: ${project.name}`);
      }
    }
  }
  if (priority) {
    filterState.active_filters.push(`Priority: ${priority}`);
  }

  return c.json({
    tasks,
    filter_state: filterState
  });
});

// Get filter options for dropdowns
router.get('/filter-options', (c) => {
  const projects = db.prepare('SELECT id, name, color FROM projects ORDER BY name').all();
  const priorities = ['urgent', 'high', 'normal', 'low'];
  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  return c.json({
    projects: [
      { id: 'inbox', name: 'Inbox', color: '#6b7280' },
      ...projects
    ],
    priorities,
    statuses
  });
});

// Get tasks count by filter combinations (for stats)
router.get('/filter-stats', (c) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number },
    active: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed = 0').get() as { count: number },
    completed: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE completed = 1').get() as { count: number },
    overdue: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE due_date < date("now") AND completed = 0').get() as { count: number },
    by_priority: db.prepare(`
      SELECT 
        priority,
        COUNT(*) as count,
        COUNT(CASE WHEN completed = 0 THEN 1 END) as active_count
      FROM tasks 
      GROUP BY priority
    `).all(),
    by_project: db.prepare(`
      SELECT 
        COALESCE(projects.name, 'Inbox') as project_name,
        COALESCE(projects.id, 'inbox') as project_id,
        COUNT(*) as count,
        COUNT(CASE WHEN tasks.completed = 0 THEN 1 END) as active_count
      FROM tasks 
      LEFT JOIN projects ON tasks.project_id = projects.id
      GROUP BY tasks.project_id, projects.name
    `).all()
  };

  return c.json(stats);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'c986c6a7885993ce90d626af61ecc90d5de2801eac95c0ff99b368e0e90e8bcc',
  name: 'Filtering and Views',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;