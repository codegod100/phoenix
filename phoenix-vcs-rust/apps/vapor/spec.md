# Vapor API Server

A Swift Vapor web API server with Users and Items management.

## Overview

**Name**: Vapor API Server  
**Language**: Swift  
**Framework**: Vapor  
**Template**: swift-vapor

## API Routes

### Users
- **GET** `/users` - List all users
- **GET** `/users/:id` - Get user by ID  
- **POST** `/users` - Create new user
- **PUT** `/users/:id` - Update user
- **DELETE** `/users/:id` - Delete user

### Items
- **GET** `/items` - List all items
- **GET** `/items/:id` - Get item by ID
- **POST** `/items` - Create new item
- **PUT** `/items/:id` - Update item
- **DELETE** `/items/:id` - Delete item

## Data Models

### User
- `id`: UUID (primary key)
- `name`: String (required)
- `email`: String (required, unique)
- `createdAt`: Date

### Item
- `id`: UUID (primary key)
- `name`: String (required)
- `price`: Double (required)
- `quantity`: Int (default: 0)
- `createdAt`: Date

## Build Configuration

build_type = "swift"

template = "swift-vapor"
