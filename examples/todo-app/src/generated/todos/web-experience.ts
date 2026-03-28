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
            color: #212529;
            line-height: 1.5;
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
            color: #495057;
            margin-bottom: 10px;
        }
        
        .add-task-form {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
            color: #495057;
        }
        
        input, textarea, select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
        
        textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .description-toggle {
            background: none;
            border: none;
            color: #007bff;
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
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .btn-small {
            padding: 4px 8px;
            font-size: 12px;
        }
        
        .sidebar {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .sidebar h3 {
            margin-bottom: 15px;
            color: #495057;
        }
        
        .project-list {
            list-style: none;
        }
        
        .project-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            cursor: pointer;
            border-radius: 4px;
            padding-left: 8px;
            padding-right: 8px;
        }
        
        .project-item:hover {
            background: #f8f9fa;
        }
        
        .project-item.active {
            background: #e3f2fd;
        }
        
        .project-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }
        
        .project-name {
            flex: 1;
        }
        
        .task-count {
            background: #6c757d;
            color: white;
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 12px;
        }
        
        .filters {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-row {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .filter-buttons {
            display: flex;
            gap: 5px;
        }
        
        .filter-btn {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .filter-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        
        .task-list {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .task-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            position: relative;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-item:hover .delete-btn {
            opacity: 1;
        }
        
        .task-item.completed {
            opacity: 0.6;
        }
        
        .task-item.completed .task-title {
            text-decoration: line-through;
        }
        
        .task-item.overdue {
            border-left: 4px solid #dc3545;
        }
        
        .task-checkbox {
            margin-right: 15px;
            width: 18px;
            height: 18px;
        }
        
        .task-content {
            flex: 1;
        }
        
        .task-title {
            font-weight: 500;
            margin-bottom: 5px;
            cursor: pointer;
        }
        
        .task-meta {
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 12px;
            color: #6c757d;
        }
        
        .priority-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .priority-urgent {
            background: #dc3545;
            color: white;
        }
        
        .priority-high {
            background: #fd7e14;
            color: white;
        }
        
        .priority-normal {
            background: #007bff;
            color: white;
        }
        
        .priority-low {
            background: #6c757d;
            color: white;
        }
        
        .overdue-badge {
            background: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .delete-btn {
            position: absolute;
            right: 15px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .edit-form {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
        }
        
        .edit-form .form-row {
            margin-bottom: 10px;
        }
        
        .edit-actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        .stats-summary {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats-row {
            display: flex;
            gap: 20px;
            font-size: 14px;
        }
        
        .stat-item {
            color: #6c757d;
        }
        
        .stat-value {
            font-weight: 600;
            color: #495057;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Task Manager</h1>
        </div>
        
        <div class="add-task-form">
            <form id="add-task-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="task-title">Title</label>
                        <input type="text" id="task-title" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="task-priority">Priority</label>
                        <select id="task-priority" name="priority">
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="task-project">Project</label>
                        <select id="task-project" name="project_id">
                            <option value="">Inbox</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="task-due-date">Due Date</label>
                        <input type="date" id="task-due-date" name="due_date">
                    </div>
                </div>
                <button type="button" class="description-toggle" onclick="toggleDescription()">+ Add Description</button>
                <div class="description-section" id="description-section">
                    <div class="form-group full-width">
                        <label for="task-description">Description</label>
                        <textarea id="task-description" name="description"></textarea>
                    </div>
                </div>
                <button type="submit" class="btn">Add Task</button>
            </form>
        </div>
        
        <div class="sidebar">
            <h3>Projects</h3>
            <ul class="project-list" id="project-list">
                <li class="project-item active" data-project-id="" onclick="selectProject('')">
                    <div class="project-dot" style="background: #6c757d;"></div>
                    <span class="project-name">Inbox</span>
                    <span class="task-count" id="inbox-count">0</span>
                </li>
            </ul>
        </div>
        
        <div class="filters">
            <div class="filter-row">
                <div class="filter-buttons">
                    <button class="filter-btn active" data-status="all" onclick="setStatusFilter('all')">All</button>
                    <button class="filter-btn" data-status="active" onclick="setStatusFilter('active')">Active</button>
                    <button class="filter-btn" data-status="completed" onclick="setStatusFilter('completed')">Completed</button>
                </div>
                <div class="form-group" style="min-width: 150px;">
                    <select id="priority-filter" onchange="setPriorityFilter(this.value)">
                        <option value="">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="stats-summary" id="stats-summary">
            <div class="stats-row">
                <div class="stat-item">Total: <span class="stat-value" id="total-tasks">0</span></div>
                <div class="stat-item">Active: <span class="stat-value" id="active-tasks">0</span></div>
                <div class="stat-item">Completed: <span class="stat-value" id="completed-tasks">0</span></div>
                <div class="stat-item">Overdue: <span class="stat-value" id="overdue-tasks">0</span></div>
            </div>
        </div>
        
        <div class="task-list" id="task-list">
            <div class="empty-state">
                <p>No tasks found. Add your first task above!</p>
            </div>
        </div>
    </div>
    
    <script>
        let currentProject = '';
        let currentStatus = 'all';
        let currentPriority = '';
        let editingTaskId = null;
        
        // Initialize the app
        document.addEventListener('DOMContentLoaded', function() {
            loadProjects();
            loadTasks();
            
            document.getElementById('add-task-form').addEventListener('submit', handleAddTask);
        });
        
        function toggleDescription() {
            const section = document.getElementById('description-section');
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
                const response = await fetch('/projects');
                const projects = await response.json();
                
                const projectSelect = document.getElementById('task-project');
                const projectList = document.getElementById('project-list');
                
                // Clear existing options (except Inbox)
                projectSelect.innerHTML = '<option value="">Inbox</option>';
                
                // Keep inbox item, remove others
                const inboxItem = projectList.querySelector('[data-project-id=""]');
                projectList.innerHTML = '';
                projectList.appendChild(inboxItem);
                
                projects.forEach(project => {
                    // Add to dropdown
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name;
                    projectSelect.appendChild(option);
                    
                    // Add to sidebar
                    const li = document.createElement('li');
                    li.className = 'project-item';
                    li.setAttribute('data-project-id', project.id);
                    li.onclick = () => selectProject(project.id);
                    li.innerHTML = \`
                        <div class="project-dot" style="background: \${project.color};"></div>
                        <span class="project-name">\${project.name}</span>
                        <span class="task-count" id="project-\${project.id}-count">0</span>
                    \`;
                    projectList.appendChild(li);
                });
                
                updateProjectCounts();
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }
        
        async function loadTasks() {
            try {
                const params = new URLSearchParams();
                if (currentProject) params.append('project_id', currentProject);
                if (currentStatus === 'active') params.append('completed', '0');
                if (currentStatus === 'completed') params.append('completed', '1');
                if (currentPriority) params.append('priority', currentPriority);
                
                const response = await fetch('/tasks?' + params.toString());
                const tasks = await response.json();
                
                renderTasks(tasks);
                updateStats(tasks);
                updateProjectCounts();
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }
        
        function renderTasks(tasks) {
            const taskList = document.getElementById('task-list');
            
            if (tasks.length === 0) {
                taskList.innerHTML = '<div class="empty-state"><p>No tasks found.</p></div>';
                return;
            }
            
            const today = new Date().toISOString().split('T')[0];
            
            taskList.innerHTML = tasks.map(task => {
                const isOverdue = task.due_date && task.due_date < today && !task.completed;
                const priorityClass = \`priority-\${task.priority}\`;
                
                return \`
                    <div class="task-item \${task.completed ? 'completed' : ''} \${isOverdue ? 'overdue' : ''}" data-task-id="\${task.id}">
                        <input type="checkbox" class="task-checkbox" \${task.completed ? 'checked' : ''} 
                               onchange="toggleTaskCompletion(\${task.id}, this.checked)">
                        <div class="task-content">
                            <div class="task-title" onclick="startEditTask(\${task.id})">\${task.title}</div>
                            <div class="task-meta">
                                <span class="priority-badge \${priorityClass}">\${task.priority.toUpperCase()}</span>
                                \${task.project_name ? \`<span>📁 \${task.project_name}</span>\` : '<span>📥 Inbox</span>'}
                                \${task.due_date ? \`<span>📅 \${formatDate(task.due_date)}</span>\` : ''}
                                \${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
                            </div>
                            \${task.description ? \`<div style="margin-top: 5px; font-size: 14px; color: #6c757d;">\${task.description}</div>\` : ''}
                        </div>
                        <button class="btn btn-danger btn-small delete-btn" onclick="deleteTask(\${task.id})">Delete</button>
                    </div>
                \`;
            }).join('');
        }
        
        function updateStats(tasks) {
            const total = tasks.length;
            const active = tasks.filter(t => !t.completed).length;
            const completed = tasks.filter(t => t.completed).length;
            const today = new Date().toISOString().split('T')[0];
            const overdue = tasks.filter(t => t.due_date && t.due_date < today && !t.completed).length;
            
            document.getElementById('total-tasks').textContent = total;
            document.getElementById('active-tasks').textContent = active;
            document.getElementById('completed-tasks').textContent = completed;
            document.getElementById('overdue-tasks').textContent = overdue;
        }
        
        async function updateProjectCounts() {
            try {
                const response = await fetch('/tasks');
                const allTasks = await response.json();
                
                // Count inbox tasks (no project)
                const inboxCount = allTasks.filter(t => !t.project_id && !t.completed).length;
                document.getElementById('inbox-count').textContent = inboxCount;
                
                // Count tasks per project
                const projectCounts = {};
                allTasks.forEach(task => {
                    if (task.project_id && !task.completed) {
                        projectCounts[task.project_id] = (projectCounts[task.project_id] || 0) + 1;
                    }
                });
                
                Object.entries(projectCounts).forEach(([projectId, count]) => {
                    const countEl = document.getElementById(\`project-\${projectId}-count\`);
                    if (countEl) countEl.textContent = count;
                });
                
                // Reset counts for projects with no active tasks
                document.querySelectorAll('[id^="project-"][id$="-count"]').forEach(el => {
                    const projectId = el.id.match(/project-(\\d+)-count/)?.[1];
                    if (projectId && !projectCounts[projectId]) {
                        el.textContent = '0';
                    }
                });
            } catch (error) {
                console.error('Failed to update project counts:', error);
            }
        }
        
        function selectProject(projectId) {
            currentProject = projectId;
            
            // Update active state
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(\`[data-project-id="\${projectId}"]\`).classList.add('active');
            
            loadTasks();
        }
        
        function setStatusFilter(status) {
            currentStatus = status;
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(\`[data-status="\${status}"]\`).classList.add('active');
            
            loadTasks();
        }
        
        function setPriorityFilter(priority) {
            currentPriority = priority;
            loadTasks();
        }
        
        async function handleAddTask(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description') || '',
                priority: formData.get('priority'),
                project_id: formData.get('project_id') ? parseInt(formData.get('project_id')) : null,
                due_date: formData.get('due_date') || null
            };
            
            try {
                const response = await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
                
                if (response.ok) {
                    e.target.reset();
                    document.getElementById('description-section').classList.remove('expanded');
                    document.querySelector('.description-toggle').textContent = '+ Add Description';
                    loadTasks();
                } else {
                    const error = await response.json();
                    alert('Failed to create task: ' + error.error);
                }
            } catch (error) {
                console.error('Failed to create task:', error);
                alert('Failed to create task');
            }
        }
        
        async function toggleTaskCompletion(taskId, completed) {
            try {
                const response = await fetch(\`/tasks/\${taskId}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completed: completed ? 1 : 0 })
                });
                
                if (response.ok) {
                    loadTasks();
                } else {
                    alert('Failed to update task');
                }
            } catch (error) {
                console.error('Failed to update task:', error);
                alert('Failed to update task');
            }
        }
        
        async function deleteTask(taskId) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            
            try {
                const response = await fetch(\`/tasks/\${taskId}\`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    loadTasks();
                } else {
                    alert('Failed to delete task');
                }
            } catch (error) {
                console.error('Failed to delete task:', error);
                alert('Failed to delete task');
            }
        }
        
        function startEditTask(taskId) {
            if (editingTaskId === taskId) return;
            
            // Cancel any existing edit
            if (editingTaskId) cancelEdit();
            
            editingTaskId = taskId;
            const taskItem = document.querySelector(\`[data-task-id="\${taskId}"]\`);
            const taskContent = taskItem.querySelector('.task-content');
            
            // Get current task data
            fetch(\`/tasks/\${taskId}\`)
                .then(response => response.json())
                .then(task => {
                    taskContent.innerHTML = \`
                        <div class="edit-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <input type="text" id="edit-title" value="\${task.title}" placeholder="Task title">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <select id="edit-priority">
                                        <option value="low" \${task.priority === 'low' ? 'selected' : ''}>Low</option>
                                        <option value="normal" \${task.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                        <option value="high" \${task.priority === 'high' ? 'selected' : ''}>High</option>
                                        <option value="urgent" \${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <input type="date" id="edit-due-date" value="\${task.due_date || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group full-width">
                                    <textarea id="edit-description" placeholder="Description">\${task.description || ''}</textarea>
                                </div>
                            </div>
                            <div class="edit-actions">
                                <button class="btn btn-small" onclick="saveEdit(\${taskId})">Save</button>
                                <button class="btn btn-small" onclick="cancelEdit()" style="background: #6c757d;">Cancel</button>
                            </div>
                        </div>
                    \`;
                });
        }
        
        async function saveEdit(taskId) {
            const title = document.getElementById('edit-title').value;
            const priority = document.getElementById('edit-priority').value;
            const dueDate = document.getElementById('edit-due-date').value;
            const description = document.getElementById('edit-description').value;
            
            if (!title.trim()) {
                alert('Title is required');
                return;
            }
            
            try {
                const response = await fetch(\`/tasks/\${taskId}\`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title.trim(),
                        priority,
                        due_date: dueDate || null,
                        description: description.trim()
                    })
                });
                
                if (response.ok) {
                    editingTaskId = null;
                    loadTasks();
                } else {
                    const error = await response.json();
                    alert('Failed to update task: ' + error.error);
                }
            } catch (error) {
                console.error('Failed to update task:', error);
                alert('Failed to update task');
            }
        }
        
        function cancelEdit() {
            editingTaskId = null;
            loadTasks();
        }
        
        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString();
        }
    </script>
</body>
</html>`);
});

export default router;

export const _phoenix = {
  iu_id: '335590ecf9457e5b14124f79e4d9399888f58b7aff87edd6a264b6aa6fdc2d48',
  name: 'Web Experience',
  risk_tier: 'high',
  canon_ids: [5 as const],
} as const;