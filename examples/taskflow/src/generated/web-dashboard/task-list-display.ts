export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'review' | 'done';
  assignee: string;
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilter {
  status?: Task['status'][];
  priority?: Task['priority'][];
  assignee?: string[];
}

export interface TaskListDisplayOptions {
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onTaskClick?: (task: Task) => void;
}

/** Valid priority values */
const VALID_PRIORITIES: Task['priority'][] = ['critical', 'high', 'medium', 'low'];

/** Valid status values */
const VALID_STATUSES: Task['status'][] = ['open', 'in_progress', 'review', 'done'];

/** Validates that a value is a non-empty string */
function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string, got ${typeof value}`);
  }
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  return value.trim();
}

/** Validates that a value is a valid Date */
function validateDate(value: unknown, fieldName: string): Date {
  if (!(value instanceof Date)) {
    throw new Error(`${fieldName} must be a Date instance, got ${typeof value}`);
  }
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${fieldName} is an invalid date`);
  }
  return value;
}

/** Validates a single Task object */
function validateTask(task: unknown): asserts task is Task {
  if (!task || typeof task !== 'object') {
    throw new Error('Task must be an object');
  }

  const t = task as Partial<Task>;

  validateString(t.id, 'Task.id');
  validateString(t.title, 'Task.title');
  
  // Validate priority
  if (!VALID_PRIORITIES.includes(t.priority as Task['priority'])) {
    throw new Error(`Task.priority must be one of: ${VALID_PRIORITIES.join(', ')}, got: ${t.priority}`);
  }

  // Validate status
  if (!VALID_STATUSES.includes(t.status as Task['status'])) {
    throw new Error(`Task.status must be one of: ${VALID_STATUSES.join(', ')}, got: ${t.status}`);
  }

  // Validate assignee (can be empty string but must be defined)
  if (typeof t.assignee !== 'string') {
    throw new Error(`Task.assignee must be a string, got: ${typeof t.assignee}`);
  }

  // Validate dates
  validateDate(t.deadline, 'Task.deadline');
  validateDate(t.createdAt, 'Task.createdAt');
  validateDate(t.updatedAt, 'Task.updatedAt');

  // Validate description (optional but if present must be string)
  if (t.description !== undefined && typeof t.description !== 'string') {
    throw new Error(`Task.description must be a string, got: ${typeof t.description}`);
  }
}

/** Validates a TaskFilter object */
function validateTaskFilter(filter: unknown): asserts filter is TaskFilter {
  if (!filter || typeof filter !== 'object') {
    throw new Error('Filter must be an object');
  }

  const f = filter as Partial<TaskFilter>;

  // Validate status filter
  if (f.status !== undefined) {
    if (!Array.isArray(f.status)) {
      throw new Error('Filter.status must be an array');
    }
    const invalidStatuses = f.status.filter(s => !VALID_STATUSES.includes(s as Task['status']));
    if (invalidStatuses.length > 0) {
      throw new Error(`Invalid status values in filter: ${invalidStatuses.join(', ')}`);
    }
  }

  // Validate priority filter
  if (f.priority !== undefined) {
    if (!Array.isArray(f.priority)) {
      throw new Error('Filter.priority must be an array');
    }
    const invalidPriorities = f.priority.filter(p => !VALID_PRIORITIES.includes(p as Task['priority']));
    if (invalidPriorities.length > 0) {
      throw new Error(`Invalid priority values in filter: ${invalidPriorities.join(', ')}`);
    }
  }

  // Validate assignee filter
  if (f.assignee !== undefined) {
    if (!Array.isArray(f.assignee)) {
      throw new Error('Filter.assignee must be an array');
    }
    const invalidAssignees = f.assignee.filter(a => typeof a !== 'string');
    if (invalidAssignees.length > 0) {
      throw new Error('All filter.assignee values must be strings');
    }
  }
}

/** Validates TaskListDisplayOptions */
function validateOptions(options: unknown): asserts options is TaskListDisplayOptions {
  if (options === undefined || options === null) {
    return; // Options are optional
  }

  if (typeof options !== 'object') {
    throw new Error('Options must be an object');
  }

  const o = options as Partial<TaskListDisplayOptions>;

  if (o.onStatusChange !== undefined && typeof o.onStatusChange !== 'function') {
    throw new Error('Options.onStatusChange must be a function');
  }

  if (o.onTaskClick !== undefined && typeof o.onTaskClick !== 'function') {
    throw new Error('Options.onTaskClick must be a function');
  }
}

export class TaskListDisplay {
  private tasks: Task[] = [];
  private filter: TaskFilter = {};
  private options: TaskListDisplayOptions;

  constructor(options: TaskListDisplayOptions = {}) {
    validateOptions(options);
    this.options = options;
  }

  setTasks(tasks: unknown[]): void {
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks must be an array');
    }
    tasks.forEach((task, index) => {
      try {
        validateTask(task);
      } catch (error) {
        throw new Error(`Invalid task at index ${index}: ${(error as Error).message}`);
      }
    });
    this.tasks = tasks as Task[];
  }

  setFilter(filter: unknown): void {
    validateTaskFilter(filter);
    this.filter = filter;
  }

  private getFilteredTasks(): Task[] {
    return this.tasks.filter(task => {
      if (this.filter.status && this.filter.status.length > 0) {
        if (!this.filter.status.includes(task.status)) {
          return false;
        }
      }
      if (this.filter.priority && this.filter.priority.length > 0) {
        if (!this.filter.priority.includes(task.priority)) {
          return false;
        }
      }
      if (this.filter.assignee && this.filter.assignee.length > 0) {
        if (!this.filter.assignee.includes(task.assignee)) {
          return false;
        }
      }
      return true;
    });
  }

  private isOverdue(task: Task): boolean {
    const now = new Date();
    return now > task.deadline && task.status !== 'done';
  }

  private getPriorityBadgeColor(priority: Task['priority']): string {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a'
    };
    return colors[priority];
  }

  private getStatusBadgeColor(status: Task['status']): string {
    const colors = {
      open: '#6b7280',
      in_progress: '#2563eb',
      review: '#7c3aed',
      done: '#16a34a'
    };
    return colors[status];
  }

  private getStatusTransitions(currentStatus: Task['status']): Task['status'][] {
    const transitions: Record<Task['status'], Task['status'][]> = {
      open: ['in_progress'],
      in_progress: ['review', 'open'],
      review: ['done', 'in_progress'],
      done: ['open']
    };
    return transitions[currentStatus];
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private generateTaskCard(task: Task): string {
    const isTaskOverdue = this.isOverdue(task);
    const priorityColor = this.getPriorityBadgeColor(task.priority);
    const statusColor = this.getStatusBadgeColor(task.status);
    const transitions = this.getStatusTransitions(task.status);

    const overdueIndicator = isTaskOverdue 
      ? '<div class="overdue-indicator">OVERDUE</div>' 
      : '';

    const transitionButtons = transitions.map(status => 
      `<button class="status-transition-btn" data-task-id="${task.id}" data-new-status="${status}">
        ${status.replace('_', ' ').toUpperCase()}
      </button>`
    ).join('');

    return `
      <div class="task-card ${isTaskOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
        ${overdueIndicator}
        <div class="task-header">
          <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
          <div class="task-badges">
            <span class="priority-badge" style="background-color: ${priorityColor}">
              ${task.priority.toUpperCase()}
            </span>
            <span class="status-badge" style="background-color: ${statusColor}">
              ${task.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        <div class="task-description">
          ${this.escapeHtml(task.description || '')}
        </div>
        <div class="task-meta">
          <div class="task-assignee">
            <strong>Assignee:</strong> ${this.escapeHtml(task.assignee || 'Unassigned')}
          </div>
          <div class="task-deadline">
            <strong>Deadline:</strong> ${this.formatDate(task.deadline)}
          </div>
        </div>
        <div class="task-actions">
          ${transitionButtons}
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    if (text === null || text === undefined) {
      return '';
    }
    return text.replace(/[&<>"']/g, (match: string) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
  }

  render(): string {
    const filteredTasks = this.getFilteredTasks();
    
    if (filteredTasks.length === 0) {
      return `
        <div class="task-list-empty">
          <p>No tasks match the current filters.</p>
        </div>
      `;
    }

    const taskCards = filteredTasks.map(task => this.generateTaskCard(task)).join('');

    return `
      <div class="task-list-display">
        <style>
          .task-list-display {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
            padding: 1rem;
          }
          
          .task-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: box-shadow 0.2s;
          }
          
          .task-card:hover {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .task-card.overdue {
            border-color: #dc2626;
            border-width: 2px;
          }
          
          .overdue-indicator {
            background: #dc2626;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            display: inline-block;
          }
          
          .task-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.75rem;
          }
          
          .task-title {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            flex: 1;
            margin-right: 0.5rem;
          }
          
          .task-badges {
            display: flex;
            gap: 0.5rem;
            flex-shrink: 0;
          }
          
          .priority-badge,
          .status-badge {
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .task-description {
            color: #6b7280;
            margin-bottom: 1rem;
            line-height: 1.5;
          }
          
          .task-meta {
            margin-bottom: 1rem;
            font-size: 0.875rem;
          }
          
          .task-assignee,
          .task-deadline {
            margin-bottom: 0.25rem;
          }
          
          .task-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          
          .status-transition-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .status-transition-btn:hover {
            background: #2563eb;
          }
          
          .task-list-empty {
            grid-column: 1 / -1;
            text-align: center;
            padding: 2rem;
            color: #6b7280;
          }
          
          @media (max-width: 768px) {
            .task-list-display {
              grid-template-columns: 1fr;
              padding: 0.5rem;
            }
            
            .task-header {
              flex-direction: column;
              align-items: flex-start;
            }
            
            .task-badges {
              margin-top: 0.5rem;
            }
          }
        </style>
        ${taskCards}
      </div>
    `;
  }

  attachEventListeners(container: HTMLElement): void {
    if (!(container instanceof HTMLElement)) {
      throw new Error('Container must be an HTMLElement');
    }

    container.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('status-transition-btn')) {
        const taskId = target.getAttribute('data-task-id');
        const newStatus = target.getAttribute('data-new-status') as Task['status'];
        
        if (!taskId || !newStatus) {
          console.warn('Missing taskId or newStatus on status transition button');
          return;
        }
        
        if (this.options.onStatusChange) {
          this.options.onStatusChange(taskId, newStatus);
        }
      } else if (target.closest('.task-card')) {
        const taskCard = target.closest('.task-card') as HTMLElement;
        const taskId = taskCard.getAttribute('data-task-id');
        
        if (!taskId) {
          console.warn('Missing taskId on task card');
          return;
        }
        
        const task = this.tasks.find(t => t.id === taskId);
        
        if (!task) {
          console.warn(`Task with id ${taskId} not found`);
          return;
        }
        
        if (this.options.onTaskClick) {
          this.options.onTaskClick(task);
        }
      }
    });
  }
}

export function createTaskListDisplay(options?: TaskListDisplayOptions): TaskListDisplay {
  return new TaskListDisplay(options);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'a6550cdc3ef254c13571c1134a3f1ad230c942e0325c50f89ae97502a302fd01',
  name: 'Task List Display',
  risk_tier: 'medium',
} as const;
