# Todo API

A simple REST API for managing todo items.

## Data Model

- A todo has: id (integer, auto-increment primary key), title (text, required), completed (boolean, default false), and created_at (timestamp, set automatically on creation)

## List Todos

- GET /todos must return all todos as a JSON array ordered by created_at descending
- The response must include all fields: id, title, completed, created_at

## Get Todo

- GET /todos/:id must return a single todo as a JSON object
- If the todo does not exist, the endpoint must return 404 with an error message

## Create Todo

- POST /todos must create a new todo from a JSON request body
- The request body must include a title field
- Title must not be empty
- Title must be at most 200 characters
- The endpoint must return the created todo with status 201

## Update Todo

- PATCH /todos/:id must update a todo from a JSON request body
- The request body may include title and/or completed fields
- If title is provided, it must not be empty and must be at most 200 characters
- If completed is provided, it must be a boolean
- If the todo does not exist, the endpoint must return 404
- The endpoint must return the updated todo

## Delete Todo

- DELETE /todos/:id must delete a todo
- If the todo does not exist, the endpoint must return 404
- On success, the endpoint must return 204 with no body

## Error Handling

- All error responses must be JSON objects with an "error" field containing a human-readable message
- Invalid JSON request bodies must return 400
- Validation failures must return 400 with a description of what failed
