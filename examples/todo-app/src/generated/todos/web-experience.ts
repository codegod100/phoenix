import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// Register migrations for all tables this module touches
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

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  due_date: z.string().nullable().optional(),
  project_id: z.number().nullable().optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  due_date: z.string().nullable().optional(),
  completed: z.number().min(0).max(1).optional(),
  project_id: z.number().nullable().optional()
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  color: z.string().default('#3b82f6')
});

const router = new Hono();

// Web interface route
router.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #0f172a;
            margin-bottom: 10px;
        }
        
        .stats {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .stat-card {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            text-align: center;
            min-width: 120px;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        
        .stat-label {
            font-size: 14px;
            color: #64748b;
        }
        
        .add-task-form {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .form-group {
            flex: 1;
            min-width: 200px;
        }
        
        .form-group.full-width {
            flex: 100%;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #374151;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        
        textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .description-toggle {
            background: none;
            border: none;
            color: #3b82f6;
            cursor: pointer;
            font-size: 14px;
            text-decoration: underline;
            margin-bottom: 10px;
        }
        
        .description-section {
            display: none;
        }
        
        .description-section.expanded {
            display: block;
        }
        
        .btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        
        .btn:hover {
            background: #2563eb;
        }
        
        .filters {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .filter-group {
            display: flex;
            gap: 5px;
        }
        
        .filter-btn {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .filter-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        
        .task-list {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .task-item {
            padding: 15px 20px;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
            transition: background-color 0.2s;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-item:hover {
            background-color: #f9fafb;
        }
        
        .task-item.completed {
            opacity: 0.6;
        }
        
        .task-item.completed .task-title {
            text-decoration: line-through;
        }
        
        .task-item.overdue {
            border-left: 4px solid #ef4444;
        }
        
        .task-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .task-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .task-title {
            font-weight: 500;
            flex: 1;
        }
        
        .priority-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .priority-urgent {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .priority-high {
            background: #fed7aa;
            color: #ea580c;
        }
        
        .priority-normal {
            background: #dbeafe;
            color: #2563eb;
        }
        
        .priority-low {
            background: #f3f4f6;
            color: #6b7280;
        }
        
        .task-meta {
            display: flex;
            gap: 15px;
            font-size: 14px;
            color: #64748b;
            flex-wrap: wrap;
        }
        
        .project-name {
            color: #3b82f6;
        }
        
        .due-date {
            color: #059669;
        }
        
        .overdue-badge {
            color: #dc2626;
            font-weight: 500;
        }
        
        .task-description {
            margin-top: 8px;
            color: #64748b;
            font-size: 14px;
        }
        
        .delete-btn {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .task-item:hover .delete-btn {
            opacity: 1;
        }
        
        .delete-btn:hover {
            background: #dc2626;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 15px;
            }
            
            .form-row {
                flex-direction: column;
            }
            
            .form-group {
                min-width: auto;
            }
            
            .filters {
                flex-direction: column;
                align-items: stretch;
            }
            
            .stats {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Task Manager</h1>
            <div class="stats" id="stats">
                <!-- Stats will be populated by JavaScript -->
            </div>
        </div>
        
        <div class="add-task-form">
            <form id="addTaskForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="title">Task Title</label>
                        <input type="text" id="title" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="priority">Priority</label>
                        <select id="priority" name="priority">
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="project">Project</label>
                        <select id="project" name="project_id">
                            <option value="">Inbox</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dueDate">Due Date</label>
                        <input type="date" id="dueDate" name="due_date">
                    </div>
                </div>
                
                <button type="button" class="description-toggle" onclick="toggleDescription()">
                    + Add Description
                </button>
                
                <div class="description-section" id="descriptionSection">
                    <div class="form-group full-width">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" placeholder="Optional task description..."></textarea>
                    </div>
                </div>
                
                <button type="submit" class="btn">Add Task</button>
            </form>
        </div>
        
        <div class="filters">
            <div class="filter-group">
                <button class="filter-btn active" data-status="all">All</button>
                <button class="filter-btn" data-status="active">Active</button>
                <button class="filter-btn" data-status="completed">Completed</button>
            </div>
            
            <div class="form-group" style="min-width: 150px;">
                <select id="priorityFilter">
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                </select>
            </div>
            
            <div class="form-group" style="min-width: 150px;">
                <select id="projectFilter">
                    <option value="">All Projects</option>
                </select>
            </div>
        </div>
        
        <div class="task-list" id="taskList">
            <!-- Tasks will be populated by JavaScript -->
        </div>
    </div>

    <script>
        let currentFilters = {
            status: 'all',
            priority: '',
            project: ''
        };

        // Initialize the app
        document.addEventListener('DOMContentLoaded', function() {
            loadProjects();
            loadTasks();
            loadStats();
            setupEventListeners();
        });

        function setupEventListeners() {
            // Add task form
            document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);
            
            // Status filters
            document.querySelectorAll('[data-status]').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentFilters.status = this.dataset.status;
                    loadTasks();
                });
            });
            
            // Priority filter
            document.getElementById('priorityFilter').addEventListener('change', function() {
                currentFilters.priority = this.value;
                loadTasks();
            });
            
            // Project filter
            document.getElementById('projectFilter').addEventListener('change', function() {
                currentFilters.project = this.value;
                loadTasks();
            });
        }

        function toggleDescription() {
            const section = document.getElementById('descriptionSection');
            const toggle = document.querySelector('.description-toggle');
            
            if (section.classList.contains('expanded')) {
                section.classList.remove('expanded');
                toggle.textContent = '+ Add Description';
            } else {
                section.classList.add('expanded');
                toggle.textContent = '- Hide Description';
            }
        }

        async function loadProjects() {
            try {
                const response = await fetch('/api/projects');
                const projects = await response.json();
                
                const projectSelect = document.getElementById('project');
                const projectFilter = document.getElementById('projectFilter');
                
                // Clear existing options (except first)
                projectSelect.innerHTML = '<option value="">Inbox</option>';
                projectFilter.innerHTML = '<option value="">All Projects</option>';
                
                projects.forEach(project => {
                    const option1 = document.createElement('option');
                    option1.value = project.id;
                    option1.textContent = project.name;
                    projectSelect.appendChild(option1);
                    
                    const option2 = document.createElement('option');
                    option2.value = project.id;
                    option2.textContent = project.name;
                    projectFilter.appendChild(option2);
                });
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        }

        async function loadTasks() {
            try {
                const params = new URLSearchParams();
                
                if (currentFilters.status === 'active') {
                    params.append('completed', '0');
                } else if (currentFilters.status === 'completed') {
                    params.append('completed', '1');
                }
                
                if (currentFilters.priority) {
                    params.append('priority', currentFilters.priority);
                }
                
                if (currentFilters.project) {
                    params.append('project_id', currentFilters.project);
                }
                
                const response = await fetch('/api/tasks?' + params.toString());
                const tasks = await response.json();
                
                renderTasks(tasks);
                loadStats(); // Refresh stats after loading tasks
            } catch (error) {
                console.error('Error loading tasks:', error);
            }
        }

        function renderTasks(tasks) {
            const taskList = document.getElementById('taskList');
            
            if (tasks.length === 0) {
                taskList.innerHTML = '<div class="empty-state">No tasks found. Add your first task above!</div>';
                return;
            }
            
            const now = new Date().toISOString().split('T')[0];
            
            taskList.innerHTML = tasks.map(task => {
                const isOverdue = task.due_date && task.due_date < now && !task.completed;
                const priorityClass = 'priority-' + task.priority;
                
                return \`
                    <div class="task-item \${task.completed ? 'completed' : ''} \${isOverdue ? 'overdue' : ''}" data-id="\${task.id}">
                        <div class="task-header">
                            <input type="checkbox" class="task-checkbox" \${task.completed ? 'checked' : ''} 
                                   onchange="toggleTask(\${task.id}, this.checked)">
                            <div class="task-title">\${escapeHtml(task.title)}</div>
                            <span class="priority-badge \${priorityClass}">\${task.priority}</span>
                        </div>
                        
                        <div class="task-meta">
                            \${task.project_name ? \`<span class="project-name">\${escapeHtml(task.project_name)}</span>\` : '<span class="project-name">Inbox</span>'}
                            \${task.due_date ? (isOverdue ? \`<span class="overdue-badge">Overdue (\${formatDate(task.due_date)})</span>\` : \`<span class="due-date">Due \${formatDate(task.due_date)}</span>\`) : ''}
                        </div>
                        
                        \${task.description ? \`<div class="task-description">\${escapeHtml(task.description)}</div>\` : ''}
                        
                        <button class="delete-btn" onclick="deleteTask(\${task.id})">Delete</button>
                    </div>
                \`;
            }).join('');
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/tasks/stats');
                const stats = await response.json();
                
                const statsContainer = document.getElementById('stats');
                statsContainer.innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-number">\${stats.total_tasks}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.active_tasks}</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.completed_tasks}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.overdue_tasks}</div>
                        <div class="stat-label">Overdue</div>
                    </div>
                \`;
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        async function handleAddTask(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description') || '',
                priority: formData.get('priority'),
                due_date: formData.get('due_date') || null,
                project_id: formData.get('project_id') ? parseInt(formData.get('project_id')) : null
            };
            
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
                
                if (response.ok) {
                    e.target.reset();
                    document.getElementById('descriptionSection').classList.remove('expanded');
                    document.querySelector('.description-toggle').textContent = '+ Add Description';
                    loadTasks();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('Error adding task:', error);
                alert('Error adding task');
            }
        }

        async function toggleTask(id, completed) {
            try {
                const response = await fetch(\`/api/tasks/\${id}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed: completed ? 1 : 0 })
                });
                
                if (response.ok) {
                    loadTasks();
                } else {
                    console.error('Error toggling task');
                }
            } catch (error) {
                console.error('Error toggling task:', error);
            }
        }

        async function deleteTask(id) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            
            try {
                const response = await fetch(\`/api/tasks/\${id}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    loadTasks();
                } else {
                    console.error('Error deleting task');
                }
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        }
    </script>
</body>
</html>`);
});

// API Routes

// Projects
router.get('/api/projects', (c) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
  return c.json(projects);
});

router.post('/api/projects', async (c) => {
  const body = await c.req.json();
  const result = createProjectSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid project data' }, 400);
  }
  
  try {
    const stmt = db.prepare('INSERT INTO projects (name, color) VALUES (?, ?)');
    const info = stmt.run(result.data.name, result.data.color);
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
    return c.json(project, 201);
  } catch (error) {
    return c.json({ error: 'Project name already exists' }, 400);
  }
});

// Tasks
router.get('/api/tasks', (c) => {
  const { completed, priority, project_id } = c.req.query();
  
  let sql = `
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE 1=1
  `;
  const params: unknown[] = [];
  
  if (completed !== undefined) {
    sql += ' AND t.completed = ?';
    params.push(parseInt(completed));
  }
  
  if (priority) {
    sql += ' AND t.priority = ?';
    params.push(priority);
  }
  
  if (project_id) {
    sql += ' AND t.project_id = ?';
    params.push(parseInt(project_id));
  }
  
  sql += ' ORDER BY t.completed ASC, t.priority = "urgent" DESC, t.priority = "high" DESC, t.due_date ASC, t.created_at DESC';
  
  const tasks = db.prepare(sql).all(...params);
  return c.json(tasks);
});

router.get('/api/tasks/stats', (c) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as active_tasks,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN completed = 0 AND due_date IS NOT NULL AND due_date < date('now') THEN 1 ELSE 0 END) as overdue_tasks
    FROM tasks
  `).get();
  
  return c.json(stats);
});

router.get('/api/tasks/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const task = db.prepare(`
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE t.id = ?
  `).get(id);
  
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }
  
  return c.json(task);
});

router.post('/api/tasks', async (c) => {
  const body = await c.req.json();
  const result = createTaskSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid task data' }, 400);
  }
  
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, project_id) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    result.data.title,
    result.data.description,
    result.data.priority,
    result.data.due_date || null,
    result.data.project_id || null
  );
  
  const task = db.prepare(`
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE t.id = ?
  `).get(info.lastInsertRowid);
  
  return c.json(task, 201);
});

router.patch('/api/tasks/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const result = updateTaskSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid task data' }, 400);
  }
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  Object.entries(result.data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  });
  
  if (updates.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }
  
  params.push(id);
  const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);
  
  const task = db.prepare(`
    SELECT t.*, p.name as project_name 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE t.id = ?
  `).get(id);
  
  return c.json(task);
});

router.delete('/api/tasks/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404);
  }
  
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return c.body(null, 204);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '335590ecf9457e5b14124f79e4d9399888f58b7aff87edd6a264b6aa6fdc2d48',
  name: 'Web Experience',
  risk_tier: 'high',
  canon_ids: [5 as const],
} as const;