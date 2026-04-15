# Elena Dashboard

A modern dashboard application built with ElenaJS web components and Hono backend.

## Overview

Full-stack TypeScript application featuring:
- **Frontend**: ElenaJS reactive web components
- **Backend**: Hono HTTP server with Bun runtime
- **API**: REST endpoints for data fetching
- **Styling**: CSS-in-component with beautiful gradients

## Server Configuration

- Port: 3000 (API), 5173 (Vite dev server)
- Runtime: Bun
- Proxy: `/api` → `http://localhost:3000`

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

## Components

### WelcomeCard
Hero section with gradient background and badge.
- Props: `title`, `message`
- Features: Gradient styling, centered layout

### TodoList
Interactive todo management with API integration.
- Props: `todos`, `newTodo`
- Features: Add, toggle, delete todos; API persistence

### UserCard
User profile display with avatar initials.
- Props: `name`, `email`
- Features: Gradient avatar, hover effects

## ElenaApp
Main application container component.
- Combines all sub-components
- Responsive layout with max-width container

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
