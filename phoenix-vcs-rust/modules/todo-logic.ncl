# Todo Logic - Framework-agnostic core functionality
# Pure functions for todo state management and API operations

{
  # Todo item type
  Todo = {
    id = Number,
    text = String,
    completed = Boolean,
  },

  # API endpoints
  api = {
    getTodos = "/api/todos",
    createTodo = "/api/todos",
    updateTodo = fun id => "/api/todos/" ++ id,
    deleteTodo = fun id => "/api/todos/" ++ id,
  },

  # Load todos from API
  loadTodos = fun => '{
    method = "GET",
    endpoint = api.getTodos,
    transformResponse = fun data => data.todos |> Array.map (fun t => {
      id = t.id,
      text = t.text,
      completed = if t.completed == 1 then true else false,
    }),
  },

  # Create new todo
  createTodo = fun text => '{
    method = "POST",
    endpoint = api.createTodo,
    body = { text = text },
    transformResponse = fun data => {
      id = data.id,
      text = data.text,
      completed = if data.completed == 1 then true else false,
    },
  },

  # Toggle todo completion
  toggleTodo = fun todo => '{
    method = "PATCH",
    endpoint = api.updateTodo (todo.id |> Number.to_string),
    body = { completed = !todo.completed },
    optimisticUpdate = fun todos => 
      todos |> Array.map (fun t => 
        if t.id == todo.id then { id = t.id, text = t.text, completed = !t.completed } else t
      ),
  },

  # Delete todo
  deleteTodo = fun id => '{
    method = "DELETE", 
    endpoint = api.deleteTodo (id |> Number.to_string),
    optimisticUpdate = fun todos => todos |> Array.filter (fun t => t.id != id),
  },

  # Stats
  getStats = fun todos => {
    total = todos |> Array.length,
    completed = todos |> Array.filter (fun t => t.completed) |> Array.length,
    percentComplete = fun => 
      if total > 0 then (completed * 100) / total else 0,
  },

  # Validation
  validateNewTodo = fun text => 
    String.length text > 0 && String.trim text != "",
}
