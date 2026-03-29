import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

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
            background-color: #f8f9fa;
            color: #333;
            line-height: 1.5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin-bottom: 20px;
            color: #2563eb;
        }
        
        .add-task-form {
            display: grid;
            gap: 16px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .form-group.full-width {
            grid-column: 1 / -1;
        }
        
        label {
            font-weight: 500;
            color: #374151;
        }
        
        input, select, textarea {
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
            color: #6b7280;
            cursor: pointer;
            font-size: 12px;
            text-decoration: underline;
        }
        
        .description-group {
            display: none;
        }
        
        .description-group.visible {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        
        .btn-primary {
            background-color: #2563eb;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #1d4ed8;
        }
        
        .sidebar {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .sidebar h3 {
            margin-bottom: 16px;
            color: #374151;
        }
        
        .project-list {
            list-style: none;
        }
        
        .project-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .project-item:hover {
            background-color: #f3f4f6;
        }
        
        .project-item.active {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        
        .project-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .project-count {
            margin-left: auto;
            background-color: #e5e7eb;
            color: #6b7280;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 12px;
        }
        
        .main-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .filters {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
            flex-wrap: wrap;
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
            background-color: #2563eb;
            color: white;
            border-color: #2563eb;
        }
        
        .task-list {
            list-style: none;
        }
        
        .task-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 8px;
            position: relative;
            transition: all 0.2s;
        }
        
        .task-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .task-item.completed {
            opacity: 0.6;
        }
        
        .task-item.completed .task-title {
            text-decoration: line-through;
        }
        
        .task-item.overdue {
            border-left: 4px solid #dc2626;
        }
        
        .task-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        
        .task-content {
            flex: 1;
            min-width: 0;
        }
        
        .task-title {
            font-weight: 500;
            margin-bottom: 4px;
            cursor: pointer;
        }
        
        .task-meta {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .priority-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .priority-urgent {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .priority-high {
            background-color: #fed7aa;
            color: #ea580c;
        }
        
        .priority-normal {
            background-color: #dbeafe;
            color: #2563eb;
        }
        
        .priority-low {
            background-color: #f3f4f6;
            color: #6b7280;
        }
        
        .project-name {
            font-size: 12px;
            color: #6b7280;
        }
        
        .due-date {
            font-size: 12px;
            color: #6b7280;
        }
        
        .overdue-badge {
            background-color: #dc2626;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
        }
        
        .delete-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #dc2626;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .task-item:hover .delete-btn {
            opacity: 1;
        }
        
        .stats {
            background-color: #f8f9fa;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
        }
        
        .edit-form {
            display: none;
            grid-template-columns: 1fr auto;
            gap: 8px;
            align-items: center;
        }
        
        .edit-form.visible {
            display: grid;
        }
        
        .edit-form input {
            padding: 4px 8px;
            font-size: 14px;
        }
        
        .edit-buttons {
            display: flex;
            gap: 4px;
        }
        
        .edit-btn {
            padding: 4px 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .edit-save {
            background-color: #059669;
            color: white;
        }
        
        .edit-cancel {
            background-color: #6b7280;
            color: white;
        }
        
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .filters {
                flex-direction: column;
            }
            
            .task-meta {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Task Manager</h1>
            <form class="add-task-form" id="addTaskForm">
                <div class="form-group full-width">
                    <label for="title">Task Title</label>
                    <input type="text" id="title" name="title" required>
                </div>
                
                <button type="button" class="description-toggle" onclick="toggleDescription()">
                    + Add Description
                </button>
                
                <div class="form-group full-width description-group" id="descriptionGroup">
                    <label for="description">Description</label>
                    <textarea id="description" name="description"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="priority">Priority</label>
                        <select id="priority" name="priority">
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="project">Project</label>
                        <select id="project" name="project">
                            <option value="">Inbox</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="dueDate">Due Date</label>
                    <input type="date" id="dueDate" name="dueDate">
                </div>
                
                <button type="submit" class="btn btn-primary">Add Task</button>
            </form>
        </div>
        
        <div class="sidebar">
            <h3>Projects</h3>
            <ul class="project-list" id="projectList">
                <li class="project-item active" data-project-id="">
                    <div class="project-dot" style="background-color: #6b7280;"></div>
                    <span>Inbox</span>
                    <span class="project-count" id="inbox-count">0</span>
                </li>
            </ul>
        </div>
        
        <div class="main-content">
            <div class="stats" id="stats">
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value" id="totalTasks">0</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="activeTasks">0</div>
                        <div class="stat-label">Active</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="completedTasks">0</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="overdueTasks">0</div>
                        <div class="stat-label">Overdue</div>
                    </div>
                </div>
            </div>
            
            <div class="filters">
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="active">Active</button>
                <button class="filter-btn" data-filter="completed">Completed</button>
                
                <select class="filter-btn" id="priorityFilter">
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                </select>
            </div>
            
            <ul class="task-list" id="taskList">
            </ul>
        </div>
    </div>

    <script>
        let currentProjectId = '';
        let currentStatusFilter = 'all';
        let currentPriorityFilter = '';
        let projects = [];
        let tasks = [];

        async function loadProjects() {
            try {
                const response = await fetch('/projects');
                projects = await response.json();
                renderProjects();
                loadProjectOptions();
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }

        async function loadTasks() {
            try {
                let url = '/tasks';
                const params = new URLSearchParams();
                
                if (currentProjectId) {
                    params.append('project_id', currentProjectId);
                } else if (currentProjectId === '') {
                    params.append('project_id', 'null');
                }
                
                if (currentStatusFilter === 'active') {
                    params.append('completed', '0');
                } else if (currentStatusFilter === 'completed') {
                    params.append('completed', '1');
                }
                
                if (currentPriorityFilter) {
                    params.append('priority', currentPriorityFilter);
                }
                
                if (params.toString()) {
                    url += '?' + params.toString();
                }
                
                const response = await fetch(url);
                tasks = await response.json();
                renderTasks();
                updateStats();
                updateProjectCounts();
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }

        function renderProjects() {
            const projectList = document.getElementById('projectList');
            const inboxItem = projectList.querySelector('[data-project-id=""]');
            
            // Remove existing project items (keep inbox)
            const existingProjects = projectList.querySelectorAll('[data-project-id]:not([data-project-id=""])');
            existingProjects.forEach(item => item.remove());
            
            projects.forEach(project => {
                const li = document.createElement('li');
                li.className = 'project-item';
                li.dataset.projectId = project.id;
                li.innerHTML = \`
                    <div class="project-dot" style="background-color: \${project.color};"></div>
                    <span>\${project.name}</span>
                    <span class="project-count" id="project-\${project.id}-count">0</span>
                \`;
                li.addEventListener('click', () => selectProject(project.id));
                projectList.appendChild(li);
            });
        }

        function loadProjectOptions() {
            const projectSelect = document.getElementById('project');
            projectSelect.innerHTML = '<option value="">Inbox</option>';
            
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
        }

        function selectProject(projectId) {
            currentProjectId = projectId;
            
            // Update active state
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.toggle('active', item.dataset.projectId == projectId);
            });
            
            loadTasks();
        }

        function renderTasks() {
            const taskList = document.getElementById('taskList');
            taskList.innerHTML = '';
            
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = \`task-item \${task.completed ? 'completed' : ''} \${isOverdue(task) ? 'overdue' : ''}\`;
                
                const projectName = task.project_name ? \`<span class="project-name">\${task.project_name}</span>\` : '';
                const dueDate = task.due_date ? \`<span class="due-date">Due: \${formatDate(task.due_date)}</span>\` : '';
                const overdueBadge = isOverdue(task) ? '<span class="overdue-badge">Overdue</span>' : '';
                
                li.innerHTML = \`
                    <input type="checkbox" class="task-checkbox" \${task.completed ? 'checked' : ''} 
                           onchange="toggleTask(\${task.id}, this.checked)">
                    <div class="task-content">
                        <div class="task-title" onclick="editTask(\${task.id})">\${task.title}</div>
                        <div class="edit-form" id="edit-\${task.id}">
                            <input type="text" value="\${task.title}" onkeydown="handleEditKeydown(event, \${task.id})">
                            <div class="edit-buttons">
                                <button class="edit-btn edit-save" onclick="saveEdit(\${task.id})">Save</button>
                                <button class="edit-btn edit-cancel" onclick="cancelEdit(\${task.id})">Cancel</button>
                            </div>
                        </div>
                        <div class="task-meta">
                            <span class="priority-badge priority-\${task.priority}">\${task.priority}</span>
                            \${projectName}
                            \${dueDate}
                            \${overdueBadge}
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteTask(\${task.id})">Delete</button>
                \`;
                
                taskList.appendChild(li);
            });
        }

        function isOverdue(task) {
            if (!task.due_date || task.completed) return false;
            const today = new Date().toISOString().split('T')[0];
            return task.due_date < today;
        }

        function formatDate(dateStr) {
            return new Date(dateStr).toLocaleDateString();
        }

        async function toggleTask(taskId, completed) {
            try {
                await fetch(\`/tasks/\${taskId}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed: completed ? 1 : 0 })
                });
                loadTasks();
            } catch (error) {
                console.error('Failed to toggle task:', error);
            }
        }

        async function deleteTask(taskId) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            
            try {
                await fetch(\`/tasks/\${taskId}\`, { method: 'DELETE' });
                loadTasks();
            } catch (error) {
                console.error('Failed to delete task:', error);
            }
        }

        function editTask(taskId) {
            const titleEl = document.querySelector(\`[onclick="editTask(\${taskId})"]\`);
            const editForm = document.getElementById(\`edit-\${taskId}\`);
            
            titleEl.style.display = 'none';
            editForm.classList.add('visible');
            editForm.querySelector('input').focus();
        }

        function cancelEdit(taskId) {
            const titleEl = document.querySelector(\`[onclick="editTask(\${taskId})"]\`);
            const editForm = document.getElementById(\`edit-\${taskId}\`);
            
            titleEl.style.display = 'block';
            editForm.classList.remove('visible');
        }

        function handleEditKeydown(event, taskId) {
            if (event.key === 'Enter') {
                saveEdit(taskId);
            } else if (event.key === 'Escape') {
                cancelEdit(taskId);
            }
        }

        async function saveEdit(taskId) {
            const editForm = document.getElementById(\`edit-\${taskId}\`);
            const newTitle = editForm.querySelector('input').value.trim();
            
            if (!newTitle) return;
            
            try {
                await fetch(\`/tasks/\${taskId}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle })
                });
                loadTasks();
            } catch (error) {
                console.error('Failed to update task:', error);
            }
        }

        function updateStats() {
            const total = tasks.length;
            const active = tasks.filter(t => !t.completed).length;
            const completed = tasks.filter(t => t.completed).length;
            const overdue = tasks.filter(t => isOverdue(t)).length;
            
            document.getElementById('totalTasks').textContent = total;
            document.getElementById('activeTasks').textContent = active;
            document.getElementById('completedTasks').textContent = completed;
            document.getElementById('overdueTasks').textContent = overdue;
        }

        async function updateProjectCounts() {
            try {
                const response = await fetch('/tasks');
                const allTasks = await response.json();
                
                // Update inbox count
                const inboxCount = allTasks.filter(t => !t.project_id && !t.completed).length;
                document.getElementById('inbox-count').textContent = inboxCount;
                
                // Update project counts
                projects.forEach(project => {
                    const count = allTasks.filter(t => t.project_id === project.id && !t.completed).length;
                    const countEl = document.getElementById(\`project-\${project.id}-count\`);
                    if (countEl) countEl.textContent = count;
                });
            } catch (error) {
                console.error('Failed to update project counts:', error);
            }
        }

        function toggleDescription() {
            const group = document.getElementById('descriptionGroup');
            const toggle = document.querySelector('.description-toggle');
            
            if (group.classList.contains('visible')) {
                group.classList.remove('visible');
                toggle.textContent = '+ Add Description';
            } else {
                group.classList.add('visible');
                toggle.textContent = '- Remove Description';
            }
        }

        // Event listeners
        document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description') || '',
                priority: formData.get('priority'),
                project_id: formData.get('project') ? parseInt(formData.get('project')) : null,
                due_date: formData.get('dueDate') || null
            };
            
            try {
                await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
                
                e.target.reset();
                document.getElementById('descriptionGroup').classList.remove('visible');
                document.querySelector('.description-toggle').textContent = '+ Add Description';
                loadTasks();
            } catch (error) {
                console.error('Failed to create task:', error);
            }
        });

        // Filter event listeners
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentStatusFilter = btn.dataset.filter;
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadTasks();
            });
        });

        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            currentPriorityFilter = e.target.value;
            loadTasks();
        });

        // Inbox click handler
        document.querySelector('[data-project-id=""]').addEventListener('click', () => selectProject(''));

        // Initial load
        loadProjects();
        loadTasks();
    </script>
</body>
</html>`);
});

export default router;

export const _phoenix = {
  iu_id: '4cf8044124318345f799117c458dd89849b86274c5b49683e030c938686d4fed',
  name: 'Web Experience',
  risk_tier: 'high',
  canon_ids: [5 as const],
} as const;