# Elena Dashboard

A modern dashboard application built with ElenaJS web components and Hono backend.

## Overview

Full-stack TypeScript application featuring:
- **Frontend**: ElenaJS reactive web components
- **Backend**: Hono HTTP server with Bun runtime
- **Database**: SQLite for persistent todo storage with SQL schema
- **API**: REST endpoints with database persistence
- **Styling**: CSS-in-component with beautiful gradients

## Server Configuration

- Host: `100.115.154.32` (bind address for all servers)
- Port: 3000 (API), 5173 (Vite dev server)
- Runtime: Bun
- Proxy: `/api` → `http://100.115.154.32:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Server status
  - Response: `{ "status": "ok", "service": "elena-dashboard", "timestamp": "..." }`

### Users API
- **GET** `/api/users` - List all users
  - Response: `{ "users": [{ "id", "name", "email" }] }`

### Todos API
- **GET** `/api/todos` - List all todos
  - Response: `{ "todos": [{ "id", "text", "completed" }] }`

- **POST** `/api/todos` - Create new todo
  - Body: `{ "text": "string" }`
  - Response: `{ "id", "text", "completed", "created" }`

## Database Schema

SQLite database with `todos` table:
```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Components

### WelcomeCard
Hero section with gradient background and badge.
- Props: `title`, `message`
- Features: Gradient styling, centered layout

### TodoList
Interactive todo management with API integration.
- Props: `todos`, `newTodo`
- Features: Add, toggle, delete todos; API persistence
- Styling:
  - Add button color: `orange` (#ff8c00)
  - Delete button color: `red` (#ff6b6b)
  - Checkbox accent color: `green` (#48bb78)

### UserCard
User profile display with avatar initials.
- Props: `name`, `email`
- Features: Gradient avatar, hover effects

### ElenaApp
Root application container.
- Props: none
- Features: Combines all sub-components, responsive layout
- Children:
  - `<todo-list></todo-list>` - Todo management
  - `<user-card name="Alice Smith" email="alice@example.com"></user-card>` - User profile
  - `<welcome-card title="Welcome" message="Elena Dashboard with SQLite persistence"></welcome-card>` - Hero section

## Development

```bash
# Install dependencies
bun install

# Run dev server (client + server)
bun run dev

# Build for production
bun run build

# Start production server
bun start
```
