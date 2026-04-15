# Elena Dashboard

A modern dashboard application built with ElenaJS web components and Hono backend.

## Overview

Full-stack TypeScript application featuring:
- **Frontend**: ElenaJS reactive web components
- **Backend**: Hono HTTP server with Bun runtime
- **Database**: SQLite for persistent todo storage with SQL schema
- **API**: REST endpoints with database persistence
- **Styling**: CSS-in-component with beautiful gradients

## Theme Configuration

- Theme: `arc-dark`
- Options: `catppuccin-mocha`, `arc-dark`

## Framework Configuration

- Frontend Framework: `elenajs`
- Options: `lit`, `elenajs`

**Lit:** Web components with decorators and reactive properties  
**ElenaJS:** Functional reactive components with hooks

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

### WelcomeCard (ElenaJS)
Hero section with gradient background and badge.
- Props: `title`, `message`
- Features: Gradient styling, centered layout

### TodoList (ElenaJS)
Interactive todo management with API integration.
- Props: `todos`, `newTodo`
- Features: Add, toggle, delete todos; API persistence
- Config:
  - `buttonColor` = `mauve`
  - `checkboxColor` = `teal`

### UserCard (ElenaJS)
User profile display with avatar initials.
- Props: `name`, `email`
- Features: Gradient avatar, hover effects
- Config:
  - `avatarColor` = `mauve`

### ElenaApp (ElenaJS Root)
Root application container with theme support.
- Props: `title`, `userCardName`, `userCardEmail`
- Features: Dark theme, combines all sub-components, responsive layout
- Config:
  - `title` = `Elena Dashboard`
- Children:
  - `<todo-list></todo-list>` - Todo management
  - `<user-card name="Elsa Snow" email="elsa@example.com"></user-card>` - User profile
  - `<welcome-card title="Welcome" message="Elena Dashboard - Lit Edition"></welcome-card>` - Hero section

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
