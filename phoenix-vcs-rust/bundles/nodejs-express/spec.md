# New Template Bundle: Node.js Express

Create a Phoenix VCS bundle for generating Node.js Express web API servers.

## Overview

**Bundle Name**: nodejs-express  
**Target**: Node.js with Express framework  
**Purpose**: Generate REST API servers using Node.js and Express

## Files to Generate

The bundle must generate exactly 5 files:

1. **bundle.ncl** - Bundle metadata with id="nodejs-express", name="Node.js Express", keywords=["nodejs", "express", "server", "javascript"]

2. **template_contract.ncl** - Nickel contract validating:
   - Node.js version >= 18
   - Express dependencies present
   - Route definitions valid
   - Middleware configuration

3. **theory_contract_panproto.ncl** - Formal GAT defining:
   - ThNodejsExpress: ThSpec → ThNodejsExpress → String
   - Sorts: Route, Controller, Middleware, Model, Router, Application
   - Operations: mk_route, mk_controller, mk_middleware, mk_model, mk_router, mk_app
   - Equations: route composition, middleware stacking, model schema, app composition
   - Examples: CRUD API, auth middleware, database models

4. **prompt_theory.md** - Instructions for LLM to generate:
   - Express route handlers
   - Controller functions with async/await
   - Mongoose ORM models
   - Middleware implementations
   - Error handling with Express error middleware

5. **prompt_contract.md** - Instructions for LLM to validate:
   - NPM package dependencies
   - Express 4.x/5.x compatibility
   - Route path patterns
   - Model property types
   - Middleware order

## Dependencies

Extra dependencies to include:
- express (core framework)
- mongoose (MongoDB ORM)
- cors (CORS middleware)
- helmet (security middleware)
- dotenv (environment config)
- morgan (logging middleware)

## Build Configuration

```toml
[extra_deps]
nodejs = ["express", "mongoose", "cors", "helmet", "dotenv", "morgan"]
```

## Formal Theory

The theory morphism μ_nodejs_express: ThSpec → ThNodejsExpress maps:

- Spec API routes → Express Router registrations
- Spec models → Mongoose Model classes
- Spec middleware → Express Middleware implementations  
- Spec controllers → Express Route handlers

## Example Output

Given a spec with Users and Items APIs, generate:
- package.json with Express dependencies
- app.js with middleware setup
- routes/index.js with route aggregation
- models/User.js with Mongoose schema
- models/Item.js with Mongoose schema
- controllers/userController.js with CRUD handlers
- controllers/itemController.js with CRUD handlers
- middleware/errorHandler.js with error handling
- config/database.js with MongoDB connection

## Build Type

build_type = "bundle"

## Template

template = "bundle-author"
