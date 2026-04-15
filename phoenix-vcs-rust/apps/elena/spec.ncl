# Phoenix Generated Specification
id = 'dev.phoenix.app'
name = 'app'
server = {
  host = '100.115.154.32'
  api_port = 3000
  vite_port = 5173
}
build.type = 'typescript'
build.runtime = 'bun'
build.bundler = 'vite'
components = [
  { name = 'TodoList', props = ['todos', 'newTodo'], features = ['Add', 'toggle', 'delete todos', 'API persistence'] },
  { name = 'UserCard', props = ['name', 'email'], features = ['Gradient avatar', 'hover effects'] },
  { name = 'WelcomeCard', props = ['title', 'message'], features = ['Gradient styling', 'centered layout'] }
]
