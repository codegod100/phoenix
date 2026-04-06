// Generated: Task Domain Model (IU-ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88)
// Description: Core task entity with lifecycle, assignment, deadline management, and archive support

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'open' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignee?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  duration?: number; // in hours
  auditTrail: AuditEntry[];
}

export interface ArchivedTask extends Task {
  archived: true;
  archivedAt: Date;
}

export interface AuditEntry {
  timestamp: Date;
  action: 'created' | 'updated' | 'assigned' | 'status_changed' | 'archived' | 'restored';
  previousValue?: string;
  newValue?: string;
}

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  open: ['in_progress'],
  in_progress: ['review', 'open'],
  review: ['done', 'in_progress'],
  done: ['open'],
};

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function createTask(
  title: string,
  description: string,
  priority: Priority,
  deadline?: Date
): Task {
  if (!title.trim()) {
    throw new Error('Title is required');
  }

  const now = new Date();
  return {
    id: generateUUID(),
    title: title.trim(),
    description: description.trim(),
    priority,
    status: 'open',
    deadline,
    createdAt: now,
    updatedAt: now,
    auditTrail: [{ timestamp: now, action: 'created' }],
  };
}

export function canTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transitionStatus(task: Task, newStatus: Status): Task {
  if (!canTransition(task.status, newStatus)) {
    throw new Error(
      `Invalid transition from ${task.status} to ${newStatus}. Valid transitions: ${VALID_TRANSITIONS[task.status].join(', ') || 'none'}`
    );
  }

  const now = new Date();
  const updated: Task = {
    ...task,
    status: newStatus,
    updatedAt: now,
    auditTrail: [
      ...task.auditTrail,
      {
        timestamp: now,
        action: 'status_changed',
        previousValue: task.status,
        newValue: newStatus,
      },
    ],
  };

  if (newStatus === 'done') {
    updated.completedAt = now;
    updated.duration =
      (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
  }

  return updated;
}

export function assignTask(task: Task, userId: string): Task {
  if (!userId.trim()) {
    throw new Error('User ID is required');
  }

  const now = new Date();
  return {
    ...task,
    assignee: userId,
    updatedAt: now,
    auditTrail: [
      ...task.auditTrail,
      {
        timestamp: now,
        action: 'assigned',
        previousValue: task.assignee,
        newValue: userId,
      },
    ],
  };
}

export function updateTask(
  task: Task,
  updates: Partial<Omit<Task, 'id' | 'createdAt' | 'auditTrail'>>
): Task {
  const now = new Date();
  const updated: Task = {
    ...task,
    ...updates,
    updatedAt: now,
    auditTrail: [
      ...task.auditTrail,
      { timestamp: now, action: 'updated' },
    ],
  };

  if (updates.assignee !== undefined && updates.assignee !== task.assignee) {
    updated.auditTrail.push({
      timestamp: now,
      action: 'assigned',
      previousValue: task.assignee,
      newValue: updates.assignee,
    });
  }

  return updated;
}

export function archiveTask(task: Task): ArchivedTask {
  const now = new Date();
  return {
    ...task,
    archived: true,
    archivedAt: now,
    updatedAt: now,
    auditTrail: [
      ...task.auditTrail,
      { timestamp: now, action: 'archived' },
    ],
  };
}

export function restoreTask(archivedTask: ArchivedTask): Task {
  const now = new Date();
  const { archived, archivedAt, ...restored } = archivedTask;
  return {
    ...restored,
    updatedAt: now,
    auditTrail: [
      ...restored.auditTrail,
      { timestamp: now, action: 'restored' },
    ],
  };
}

export function isArchived(task: Task | ArchivedTask): task is ArchivedTask {
  return (task as ArchivedTask).archived === true;
}

export function listArchived(tasks: (Task | ArchivedTask)[]): ArchivedTask[] {
  return tasks.filter(isArchived);
}

export function listActive(tasks: (Task | ArchivedTask)[]): Task[] {
  return tasks.filter((t) => !isArchived(t));
}

export function searchTasks(
  tasks: (Task | ArchivedTask)[],
  query: string,
  includeArchived = false
): (Task | ArchivedTask)[] {
  if (!query.trim()) return includeArchived ? tasks : listActive(tasks);

  const normalized = query.toLowerCase().trim();
  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(normalized)
  );
  return includeArchived ? filtered : listActive(filtered);
}

export function filterTasks(
  tasks: (Task | ArchivedTask)[],
  filters: {
    status?: Status;
    priority?: Priority;
    assignee?: string | null;
    archived?: boolean;
  }
): (Task | ArchivedTask)[] {
  return tasks.filter((t) => {
    if (filters.status && t.status !== filters.status) return false;
    if (filters.priority && t.priority !== filters.priority) return false;
    if (filters.assignee !== undefined) {
      if (filters.assignee === null && t.assignee !== undefined) return false;
      if (filters.assignee !== null && t.assignee !== filters.assignee)
        return false;
    }
    if (filters.archived !== undefined) {
      if (filters.archived !== isArchived(t)) return false;
    }
    return true;
  });
}

export function sortTasks(tasks: (Task | ArchivedTask)[]): (Task | ArchivedTask)[] {
  const priorityOrder: Record<Priority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function isOverdue(task: Task | ArchivedTask): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return new Date() > task.deadline;
}

export function listOverdue(tasks: (Task | ArchivedTask)[]): (Task | ArchivedTask)[] {
  return tasks.filter(isOverdue);
}

export function validateDeadline(deadline: Date): { valid: boolean; warning?: string } {
  if (deadline < new Date()) {
    return { valid: true, warning: 'Deadline is in the past' };
  }
  return { valid: true };
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Task Domain Model',
  risk_tier: 'medium',
} as const;
