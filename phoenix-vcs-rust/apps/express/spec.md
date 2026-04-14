# user-service

A REST API for user and item management

## Overview

This Express.js API provides endpoints for managing users and items with full CRUD operations.

## API

- `GET /api/users` - List all users
- `POST /api/users` - Create a new user  
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `GET /api/items` - List all items
- `POST /api/items` - Create a new item
- `GET /api/unicorns` - 🦄 List all magical unicorns with rainbow powers
- `PATCH /api/users/:id/status` - Update user mood (happy/sad/confused)

## Models

- **User**: name (String, required), email (String, required, unique), createdAt (Date, default=Date.now)
- **Item**: name (String, required), price (Number, required), owner (ObjectId, ref=User)

## Server

Port: 3000
