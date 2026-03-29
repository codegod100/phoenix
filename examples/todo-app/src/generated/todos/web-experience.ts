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
            background-color: #fafafa;
            color: #333;
            line-height: 1.5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            margin-bottom: 30px;
        }
        
        h1 {
            font-size: 2rem;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }
        
        .add-task-form {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            align-items: flex-start;
        }
        
        .form-group {
            flex: 1;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #555;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        textarea {
            resize: vertical;
            min-height: 60px;
        }
        
        .description-toggle {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            font-size: 12px;
            text-decoration: underline;
            margin-bottom: 10px;
        }
        
        .description-group {
            display: none;
        }
        
        .description-group.expanded {
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
        
        .filters {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        
        .filter-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        
        .filter-select {
            padding: 6px 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
        }
        
        .task-list {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .task-item {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            position: relative;
            cursor: pointer;
        }
        
        .task-item:last-child {
            border-bottom: none;
        }
        
        .task-item:hover {
            background: #f8f9fa;
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
            cursor: text;
        }
        
        .task-title.editing {
            background: white;
            border: 1px solid #007bff;
            border-radius: 3px;
            padding: 2px 6px;
        }
        
        .priority-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
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
        
        .task-meta {
            display: flex;
            gap: 15px;
            font-size: 13px;
            color: #666;
            align-items: center;
        }
        
        .project-name {
            color: #007bff;
        }
        
        .due-date {
            color: #666;
        }
        
        .due-date.overdue {
            color: #dc3545;
            font-weight: 500;
        }
        
        .overdue-badge {
            background: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
        }
        
        .delete-btn {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            font-size: 12px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .task-item:hover .delete-btn {
            opacity: 1;
        }
        
        .delete-btn:hover {
            background: #c82333;
        }
        
        .task-description {
            margin-top: 8px;
            color: #666;
            font-size: 14px;
            cursor: text;
        }
        
        .task-description.editing {
            background: white;
            border: 1px solid #007bff;
            border-radius: 3px;
            padding: 6px;
            resize: vertical;
            min-height: 60px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        .sidebar {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .sidebar h3 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .project-list {
            list-style: none;
        }
        
        .project-item {
            display: flex;
            align-items: center;
            gap: 10px;
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
            color: #1976d2;
        }
        
        .project-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .project-name-sidebar {
            flex: 1;
        }
        
        .task-count {
            background: #e9ecef;
            color: #495057;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
        }
        
        .main-content {
            display: grid;
            grid-template-columns: 250px 1fr;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .form-row {
                flex-direction: column;
            }
            
            .filter-row {
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
        </div>
        
        <div class="add-task-form">
            <form id="addTaskForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="taskTitle">Title</label>
                        <input type="text" id="taskTitle" name="title" required>
                    </div>
                    <div class="form-group" style="flex: 0 0 150px;">
                        <label for="taskPriority">Priority</label>
                        <select id="taskPriority" name="priority">
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
                
                <button type="button" class="description-toggle" onclick="toggleDescription()">+ Add description</button>
                
                <div class="description-group" id="descriptionGroup">
                    <div class="form-group">
                        <label for="taskDescription">Description</label>
                        <textarea id="taskDescription" name="description" placeholder="Optional description..."></textarea>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="taskProject">Project</label>
                        <select id="taskProject" name="project_id">
                            <option value="">Inbox (No project)</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex: 0 0 150px;">
                        <label for="taskDueDate">Due Date</label>
                        <input type="date" id="taskDueDate" name="due_date">
                    </div>
                    <div class="form-group" style="flex: 0 0 auto;">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn">Add Task</button>
                    </div>
                </div>
            </form>
        </div>
        
        <div class="main-content">
            <div class="sidebar">
                <h3>Projects</h3>
                <ul class="project-list" id="projectList">
                    <li class="project-item active" data-project-id="">
                        <div class="project-color" style="background: #6c757d;"></div>
                        <span class="project-name-sidebar">Inbox</span>
                        <span class="task-count" id="inboxCount">0</span>
                    </li>
                </ul>
            </div>
            
            <div class="main-area">
                <div class="filters">
                    <div class="filter-row">
                        <div class="filter-buttons">
                            <button class="filter-btn active" data-status="all">All</button>
                            <button class="filter-btn" data-status="active">Active</button>
                            <button class="filter-btn" data-status="completed">Completed</button>
                        </div>
                        <select class="filter-select" id="priorityFilter">
                            <option value="">All priorities</option>
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
                
                <div class="task-list" id="taskList">
                    <div class="empty-state">
                        <p>No tasks yet. Add your first task above!</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentProjectId = '';
        let currentStatus = 'all';
        let currentPriority = '';
        let projects = [];
        let tasks = [];

        function toggleDescription() {
            const group = document.getElementById('descriptionGroup');
            const toggle = document.querySelector('.description-toggle');
            if (group.classList.contains('expanded')) {
                group.classList.remove('expanded');
                toggle.textContent = '+ Add description';
            } else {
                group.classList.add('expanded');
                toggle.textContent = '- Remove description';
            }
        }

        async function loadProjects() {
            try {
                const response = await fetch('/projects');
                projects = await response.json();
                updateProjectDropdown();
                updateProjectSidebar();
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }

        function updateProjectDropdown() {
            const select = document.getElementById('taskProject');
            select.innerHTML = '<option value="">Inbox (No project)</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                select.appendChild(option);
            });
        }

        function updateProjectSidebar() {
            const list = document.getElementById('projectList');
            const inboxItem = list.querySelector('[data-project-id=""]');
            
            // Remove existing project items
            list.querySelectorAll('[data-project-id]:not([data-project-id=""])').forEach(item => item.remove());
            
            projects.forEach(project => {
                const li = document.createElement('li');
                li.className = 'project-item';
                li.dataset.projectId = project.id;
                li.onclick = () => selectProject(project.id);
                
                const taskCount = tasks.filter(t => t.project_id === project.id && !t.completed).length;
                
                li.innerHTML = \`
                    <div class="project-color" style="background: \${project.color};"></div>
                    <span class="project-name-sidebar">\${project.name}</span>
                    <span class="task-count">\${taskCount}</span>
                \`;
                
                list.appendChild(li);
            });
            
            // Update inbox count
            const inboxCount = tasks.filter(t => !t.project_id && !t.completed).length;
            document.getElementById('inboxCount').textContent = inboxCount;
        }

        function selectProject(projectId) {
            currentProjectId = projectId;
            
            // Update active state
            document.querySelectorAll('.project-item').forEach(item => {
                item.classList.toggle('active', item.dataset.projectId === projectId);
            });
            
            loadTasks();
        }

        async function loadTasks() {
            try {
                const params = new URLSearchParams();
                if (currentProjectId) params.set('project_id', currentProjectId);
                if (currentStatus === 'active') params.set('completed', '0');
                if (currentStatus === 'completed') params.set('completed', '1');
                if (currentPriority) params.set('priority', currentPriority);
                
                const response = await fetch('/tasks?' + params.toString());
                tasks = await response.json();
                renderTasks();
                updateProjectSidebar();
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }

        function renderTasks() {
            const container = document.getElementById('taskList');
            
            if (tasks.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>No tasks found.</p></div>';
                return;
            }
            
            const now = new Date().toISOString().split('T')[0];
            
            container.innerHTML = tasks.map(task => {
                const isOverdue = task.due_date && task.due_date < now && !task.completed;
                const project = projects.find(p => p.id === task.project_id);
                
                return \`
                    <div class="task-item \${task.completed ? 'completed' : ''} \${isOverdue ? 'overdue' : ''}" data-task-id="\${task.id}">
                        <div class="task-header">
                            <input type="checkbox" class="task-checkbox" \${task.completed ? 'checked' : ''} 
                                   onchange="toggleTask(\${task.id}, this.checked)">
                            <div class="task-title" onclick="editTitle(\${task.id}, this)">\${task.title}</div>
                            <div class="priority-badge priority-\${task.priority}">\${task.priority}</div>
                            <button class="delete-btn" onclick="deleteTask(\${task.id})">Delete</button>
                        </div>
                        <div class="task-meta">
                            \${project ? \`<span class="project-name">\${project.name}</span>\` : ''}
                            \${task.due_date ? \`<span class="due-date \${isOverdue ? 'overdue' : ''}">\${formatDate(task.due_date)}</span>\` : ''}
                            \${isOverdue ? '<span class="overdue-badge">OVERDUE</span>' : ''}
                        </div>
                        \${task.description ? \`<div class="task-description" onclick="editDescription(\${task.id}, this)">\${task.description}</div>\` : ''}
                    </div>
                \`;
            }).join('');
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString();
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
                console.error('Failed to update task:', error);
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

        function editTitle(taskId, element) {
            if (element.classList.contains('editing')) return;
            
            const originalText = element.textContent;
            element.classList.add('editing');
            element.contentEditable = true;
            element.focus();
            
            const saveEdit = async () => {
                const newTitle = element.textContent.trim();
                element.classList.remove('editing');
                element.contentEditable = false;
                
                if (newTitle && newTitle !== originalText) {
                    try {
                        await fetch(\`/tasks/\${taskId}\`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: newTitle })
                        });
                        loadTasks();
                    } catch (error) {
                        console.error('Failed to update task:', error);
                        element.textContent = originalText;
                    }
                } else {
                    element.textContent = originalText;
                }
            };
            
            element.addEventListener('blur', saveEdit, { once: true });
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    element.blur();
                } else if (e.key === 'Escape') {
                    element.textContent = originalText;
                    element.blur();
                }
            });
        }

        function editDescription(taskId, element) {
            if (element.classList.contains('editing')) return;
            
            const originalText = element.textContent;
            element.classList.add('editing');
            element.contentEditable = true;
            element.focus();
            
            const saveEdit = async () => {
                const newDescription = element.textContent.trim();
                element.classList.remove('editing');
                element.contentEditable = false;
                
                if (newDescription !== originalText) {
                    try {
                        await fetch(\`/tasks/\${taskId}\`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ description: newDescription })
                        });
                        loadTasks();
                    } catch (error) {
                        console.error('Failed to update task:', error);
                        element.textContent = originalText;
                    }
                } else {
                    element.textContent = originalText;
                }
            };
            
            element.addEventListener('blur', saveEdit, { once: true });
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    element.textContent = originalText;
                    element.blur();
                }
            });
        }

        // Event listeners
        document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
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
                await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
                
                e.target.reset();
                document.getElementById('descriptionGroup').classList.remove('expanded');
                document.querySelector('.description-toggle').textContent = '+ Add description';
                loadTasks();
            } catch (error) {
                console.error('Failed to create task:', error);
            }
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatus = btn.dataset.status;
                loadTasks();
            });
        });

        // Priority filter
        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            currentPriority = e.target.value;
            loadTasks();
        });

        // Initialize
        loadProjects().then(() => loadTasks());
    </script>
</body>
</html>`);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '4cf8044124318345f799117c458dd89849b86274c5b49683e030c938686d4fed',
  name: 'Web Experience',
  risk_tier: 'high',
  canon_ids: [5 as const],
} as const;