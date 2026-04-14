# spec.md Grammar Specification

The spec.md format is a **constrained natural language** designed for algorithmic parsing into spec.ncl. It bridges human-readable requirements with formal specifications.

## Overview

```
spec.md (Constrained Natural Language)
    ↓ Grammar-based parsing
StructuredSpec { routes, models, config }
    ↓ NCL Generation  
spec.ncl (Formal Nickel Specification)
```

---

## Grammar Rules

### 1. Document Structure

```ebnf
spec ::= header section* footer?

header ::= "# " project_name "\n\n" description?

section ::= "## " section_title "\n\n" section_content

section_title ::= "Overview" | "API" | "Routes" | "Endpoints" 
                | "Models" | "Data Models" | "Schema"
                | "Server" | "Config" | "Configuration"
                | "Auth" | "Middleware" | any_text

section_content ::= paragraph | bullet_list | code_block | mixed_content
```

### 2. Project Declaration (H1)

```ebnf
project_name ::= word ("-" | "_" | word | number)*
description ::= paragraph_text
```

**Examples:**
```markdown
# user-service
# express-demo-api  
# my-app-v2
```

**Extraction:**
- `project_name` = normalized lowercase with hyphens
- `project_description` = first paragraph after H1 (or Overview section)

---

### 3. Route Definitions

#### Pattern A: Backtick Format (Preferred)
```ebnf
route_line ::= "- " | "* " "`" method " " path "`" (" - " | ": " | " ") description

method ::= "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS"

path ::= "/" path_segment ("/" path_segment)*
path_segment ::= word | ":" identifier  (* :id = path parameter *)

description ::= any_text
```

**Examples:**
```markdown
- `GET /api/users` - List all users
- `POST /api/users`: Create a new user
- `DELETE /api/users/:id` - Delete user by ID
- `GET /api/items/:itemId` - Get specific item
```

#### Pattern B: Simple Format
```ebnf
route_line ::= "- " | "* " method " " path ": " description
```

**Examples:**
```markdown
- GET /api/users: List all users
- POST /api/items: Create new item
```

**Extraction:**
| Source | Extracted |
|--------|-----------|
| `GET /api/users` | method: "GET", path: "/api/users" |
| `POST /api/users/:id` | method: "POST", path: "/api/users/:id" |

**Handler Name Generation:**
```
GET /api/users      → listUsers
POST /api/users     → createUsers  
DELETE /api/users/:id → deleteUsersById
GET /api/items      → listItems
```

---

### 4. Data Models

#### Pattern A: Bold Model Name with Fields
```ebnf
model_line ::= "- " | "* " "**" model_name "**" ": " field_list

model_name ::= PascalCase_identifier

field_list ::= field (", " | " and ") field)*

field ::= field_name " (" field_spec ")"
field_name ::= camelCase_identifier

field_spec ::= field_type (", " constraint)*
field_type ::= "String" | "Number" | "Integer" | "Boolean" | "Date" 
             | "ObjectId" | "Array" | "Object" | any_identifier

constraint ::= "required" | "unique" | "optional"
             | "default=" default_value
             | "ref=" model_name
```

**Examples:**
```markdown
- **User**: name (String, required), email (String, required, unique), createdAt (Date, default=Date.now)
- **Item**: name (String, required), price (Number, required), owner (ObjectId, ref=User)
- **Order**: items (Array), total (Number, required), userId (ObjectId, ref=User)
```

#### Pattern B: Simple Format
```ebnf
model_line ::= "- " | "* " model_name ": " field_list
```

**Example:**
```markdown
- User: name (String, required), email (String)
```

**Extraction:**
| Source | Extracted |
|--------|-----------|
| `name (String, required)` | { name: "name", type: "String", required: true } |
| `email (String, required, unique)` | { name: "email", type: "String", required: true, unique: true } |
| `owner (ObjectId, ref=User)` | { name: "owner", type: "ObjectId", ref: "User" } |

---

### 5. Server Configuration

```ebnf
config_line ::= "- " | "* " config_key ": " config_value

config_key ::= "Port" | "port" | "PORT" | "Host" | "host" | "HOST"
             | "Version" | "version" | "Template" | "template"

config_value ::= number | string | boolean
```

**Examples:**
```markdown
- Port: 3000
- port: 8080
- Host: 0.0.0.0
- version: 1.2.0
```

**Extraction:**
| Source | Extracted |
|--------|-----------|
| `Port: 3000` | server_config.port = 3000 |
| `Host: localhost` | server_config.host = "localhost" |

---

### 6. Template Inference

If no explicit template is specified, it's inferred from keywords:

| Keywords in Description | Template |
|--------------------------|----------|
| "express", "nodejs", "node" | nodejs-express |
| "flask", "python" | python-flask |
| "hono", "typescript", "ts" | ts-hono |
| "lit", "web components" | lit |
| "rust", "axum", "actix" | rust |
| "swift", "vapor" | swift-vapor |

---

### 7. Route Inference (Fallback)

If no explicit routes section exists, routes are inferred from description keywords:

| Keyword | Inferred Routes |
|---------|----------------|
| "user" | GET /api/users, POST /api/users, DELETE /api/users/:id |
| "item" / "product" | GET /api/items, POST /api/items |
| "auth" / "login" | POST /api/auth/login, POST /api/auth/register |

**Always includes:**
- `GET /health` - Health check endpoint

---

### 8. Complete Example

```markdown
# inventory-api

A REST API for inventory management with user authentication.

## Overview

This Express.js API provides CRUD operations for inventory items
with JWT-based user authentication.

## API

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Items
- `GET /api/items` - List all items
- `POST /api/items` - Create new item
- `GET /api/items/:id` - Get item by ID
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

## Data Models

- **User**: username (String, required, unique), password (String, required), email (String, required, unique), createdAt (Date, default=Date.now)
- **Item**: name (String, required), description (String), quantity (Number, required), price (Number), owner (ObjectId, ref=User), createdAt (Date, default=Date.now)

## Server

- Port: 3000
- Host: 0.0.0.0
```

**Extracted:**
```rust
StructuredSpec {
    project_name: "inventory-api",
    project_description: "A REST API for inventory management...",
    template: "nodejs-express",
    build_type: "nodejs",
    routes: [
        { method: "POST", path: "/api/auth/register", handler: "register" },
        { method: "POST", path: "/api/auth/login", handler: "login" },
        { method: "GET", path: "/api/items", handler: "listItems" },
        { method: "POST", path: "/api/items", handler: "createItem" },
        { method: "GET", path: "/api/items/:id", handler: "getItemById" },
        { method: "PUT", path: "/api/items/:id", handler: "updateItemById" },
        { method: "DELETE", path: "/api/items/:id", handler: "deleteItemById" },
        { method: "GET", path: "/health", handler: "healthCheck" },
    ],
    models: [
        User { fields: [username, password, email, createdAt] },
        Item { fields: [name, description, quantity, price, owner, createdAt] },
    ],
    server_config: ServerConfig { port: 3000, host: "0.0.0.0" },
}
```

---

## Parser Implementation

### Algorithm

```rust
fn parse(spec_md: &str) -> StructuredSpec {
    let mut spec = StructuredSpec::default();
    let mut current_section: Option<&str> = None;
    
    for line in lines {
        // H1: Project name
        if line.starts_with("# ") {
            spec.project_name = normalize(line.trim_start_matches("# "));
        }
        
        // H2: Section header
        else if line.starts_with("## ") {
            current_section = Some(line.trim_start_matches("## ").to_lowercase());
        }
        
        // Route line
        else if is_route_line(line) {
            spec.routes.push(parse_route_line(line));
        }
        
        // Model line  
        else if is_model_line(line) {
            spec.models.push(parse_model_line(line));
        }
        
        // Config line
        else if is_config_line(line) {
            parse_config_line(line, &mut spec);
        }
    }
    
    // Fallbacks
    if spec.routes.is_empty() {
        spec.routes = infer_routes(&spec.project_description);
    }
    
    spec
}
```

### Regex Patterns

```rust
// Route extraction
ROUTE_PATTERN: Regex = r"`(?P<method>GET|POST|PUT|DELETE|PATCH)\s+(?P<path>/[\w/:]+)`\s*[-:]?\s*(?P<desc>.*)";

// Model extraction  
MODEL_PATTERN: Regex = r"\*\*(?P<name>\w+)\*\*:\s*(?P<fields>.+)";

// Field extraction
FIELD_PATTERN: Regex = r"(\w+)\s*\(([^)]+)\)";

// Config extraction
CONFIG_PATTERN: Regex = r"(?i)(port|host|version):\s*(\S+)";
```

---

## Error Handling

| Issue | Behavior |
|-------|----------|
| No H1 found | Error: "Could not extract project name" |
| No routes detected | Warning + inference from description |
| No models detected | Warning + default models for template |
| Invalid field spec | Skip field, log warning |
| Unknown HTTP method | Skip route, log warning |
| Malformed route line | Skip line, continue parsing |

---

## Comparison with Free-form NL

| Aspect | Free-form NL | spec.md (Constrained) |
|--------|-------------|----------------------|
| **Parseability** | Requires LLM | Deterministic grammar |
| **Ambiguity** | High | Low |
| **Error recovery** | Difficult | Structured |
| **Expressiveness** | Unlimited | Bounded |
| **Learning curve** | None | Minimal |
| **Tooling** | None | Validation, autocomplete |

---

## Future Extensions

### Proposed Additions

```markdown
## Middleware
- cors: enabled
- helmet: enabled  
- rate_limit: 100/hour

## Auth
- type: jwt
- secret: env.JWT_SECRET
- expiry: 24h

## Database
- type: mongodb
- uri: env.MONGODB_URI

## Validation
- User.email: email_format, required
- Item.price: positive_number
```

### Nested Resources

```markdown
## Nested Resources
- `GET /api/users/:userId/orders` - List user's orders
- `POST /api/users/:userId/orders` - Create order for user
```

---

## Summary

The spec.md grammar is a **deliberately constrained** subset of Markdown designed for:

1. **Human readability** - Clear, structured documentation
2. **Machine parsability** - Deterministic extraction without LLM
3. **Expressive power** - Sufficient for REST API specifications
4. **Extensibility** - Room for new patterns while maintaining grammar

The transformation is **algebraic**: same input always produces same output, enabling reproducible builds and version-controlled specifications.
