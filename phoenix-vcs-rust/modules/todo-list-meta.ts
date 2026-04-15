// Component Metadata for todo-list
// This file is framework-agnostic - just describes the component
// Generator picks: todo-list-lit.ts or todo-list-elenajs.ts based on app config

export const TodoListMeta = {
  tag: 'todo-list',
  
  props: {
    todos: { type: 'Todo[]', default: [], isState: true },
    newTodoText: { type: 'string', default: '', isState: true },
    loading: { type: 'boolean', default: false, isState: true },
  },
  
  methods: {
    loadTodos: {
      async: true,
      api: { endpoint: '/api/todos', method: 'GET' },
      sets: 'todos',
    },
    addTodo: {
      async: true,
      validate: 'newTodoText',
      api: { endpoint: '/api/todos', method: 'POST', body: 'newTodoText' },
      sets: 'todos',
      clears: 'newTodoText',
    },
    toggleTodo: {
      async: true,
      optimistic: true,
      api: { endpoint: '/api/todos/:id', method: 'PATCH', body: { completed: '!completed' } },
    },
    deleteTodo: {
      async: true,
      optimistic: true,
      api: { endpoint: '/api/todos/:id', method: 'DELETE' },
    },
  },
  
  lifecycle: {
    connected: ['loadTodos'],
  },
  
  ui: {
    title: '📝 Todo List',
    inputPlaceholder: 'Add a new todo...',
    addButton: 'Add',
    loadingText: 'Adding...',
    emptyMessage: 'No todos yet. Add one above! ✨',
    showStats: true,
  },
  
  // Theme color keys needed
  themeColors: ['primary', 'success', 'danger', 'text', 'base', 'surface0', 'surface1'],
  
  // Logic imports
  logic: {
    module: './component-logic',
    imports: ['TodoLogic', 'Api'],
  },
};

export default TodoListMeta;
