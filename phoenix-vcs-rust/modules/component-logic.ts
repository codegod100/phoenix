// Component Logic - Framework-agnostic utilities
// Pure functions shared between ElenaJS and Lit implementations

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export interface TodoStats {
  total: number;
  completed: number;
  percentComplete: number;
}

// Todo operations
export const TodoLogic = {
  // Validate new todo text
  validateText(text: string): boolean {
    return text.trim().length > 0;
  },

  // Toggle todo completion (optimistic)
  toggle(todos: Todo[], id: number): Todo[] {
    return todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  },

  // Delete todo (optimistic)
  delete(todos: Todo[], id: number): Todo[] {
    return todos.filter(t => t.id !== id);
  },

  // Add new todo
  add(todos: Todo[], todo: Todo): Todo[] {
    return [...todos, todo];
  },

  // Calculate stats
  getStats(todos: Todo[]): TodoStats {
    const completed = todos.filter(t => t.completed).length;
    return {
      total: todos.length,
      completed,
      percentComplete: todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0
    };
  },

  // Transform API response
  fromApi(data: any): Todo {
    return {
      id: data.id,
      text: data.text,
      completed: !!data.completed
    };
  }
};

// User operations
export const UserLogic = {
  // Get initials from name
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  // Validate email
  isValidEmail(email: string): boolean {
    return email.includes('@') && email.includes('.');
  }
};

// API endpoints
export const Api = {
  todos: '/api/todos',
  todo: (id: number) => `/api/todos/${id}`,
  users: '/api/users',
  health: '/api/health',
};
