# Hono API Server

## Overview

A fast, lightweight REST API server built with Hono and TypeScript. Designed for edge deployment with Bun runtime.

## Server Configuration

- Port: 3000
- Host: 0.0.0.0
- Runtime: Bun

## Middleware Stack

- **logger**: Request/response logging enabled
- **cors**: Cross-origin requests allowed from any origin
- **rate-limit**: 100 requests per 60 seconds per IP

## API Endpoints

### Health Check
- **GET** `/health` - Server health status
  - Response: `{ "status": "ok", "timestamp": "2024-01-15T10:30:00Z" }`

### Users API

#### List Users
- **GET** `/api/users` - List all users
  - Query params: `limit`, `offset`
  - Response: `{ "users": [...], "total": 100 }`

#### Get User
- **GET** `/api/users/:id` - Get user by ID
  - Params: `id` (string)
  - Response: `{ "id": "123", "name": "John", "email": "john@example.com" }`

#### Create User
- **POST** `/api/users` - Create new user
  - Body: `{ "name": "string", "email": "string" }`
  - Response: `{ "id": "123", "created": true }`
  - Status: 201

#### Update User
- **PUT** `/api/users/:id` - Full update
  - Params: `id` (string)
  - Body: `{ "name": "string", "email": "string" }`
  - Response: `{ "id": "123", "updated": true }`

#### Delete User
- **DELETE** `/api/users/:id` - Delete user
  - Params: `id` (string)
  - Response: `{}` (204 No Content)

### Items API

#### List Items
- **GET** `/api/items` - List all items
  - Query params: `category`, `sort`, `limit`
  - Response: `{ "items": [...], "meta": { "total": 50 } }`

#### Get Item
- **GET** `/api/items/:id` - Get item by ID
  - Params: `id` (string)
  - Response: `{ "id": "item-1", "name": "Widget", "price": 29.99 }`

#### Create Item
- **POST** `/api/items` - Create new item
  - Body: `{ "name": "string", "price": number, "category": "string" }`
  - Response: `{ "id": "item-1", "created": true }`
  - Status: 201

## Data Models

### User
```typescript
{
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
```

### Item
```typescript
{
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `CORS_ORIGINS` - Comma-separated allowed origins
- `RATE_LIMIT_WINDOW` - Rate limit window in seconds
- `RATE_LIMIT_MAX` - Max requests per window

## Key Features

- Type-safe with full TypeScript support
- Automatic request/response validation
- Built-in error handling
- Structured logging
- CORS support for web clients
- Rate limiting protection
- Edge-ready for Cloudflare Workers or Bun

## Development

```bash
# Install dependencies
bun install

# Run development server with hot reload
bun run dev

# Type check
bun run typecheck

# Build for production
bun run build

# Start production server
bun start
```

## Production Deployment

### Docker
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3000
CMD ["bun", "start"]
```

### Nix
```bash
nix run
```

## Template

template = "ts-hono"
