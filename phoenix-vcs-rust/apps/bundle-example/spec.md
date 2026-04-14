# New Template Bundle: Swift-Vapor

Create a Phoenix VCS bundle for generating Swift Vapor web API servers.

## Overview

**Bundle Name**: swift-vapor  
**Target**: Swift on Server with Vapor framework  
**Purpose**: Generate REST API servers using Swift and Vapor

## Files to Generate

The bundle must generate exactly 5 files:

1. **bundle.ncl** - Bundle metadata with id="swift-vapor", name="Swift Vapor", keywords=["swift", "vapor", "server"]

2. **template_contract.ncl** - Nickel contract validating:
   - Swift version >= 5.9
   - Vapor dependencies present
   - Route definitions valid
   - Middleware configuration

3. **theory_contract_panproto.ncl** - Formal GAT defining:
   - ThSwiftVapor: ThSpec → ThSwiftVapor → String
   - Sorts: Route, Controller, Middleware, Model
   - Operations: mk_route, mk_controller, mk_middleware
   - Equations: route composition, middleware stacking
   - Examples: CRUD API, auth middleware, database models

4. **prompt_theory.md** - Instructions for LLM to generate:
   - Swift Vapor route handlers
   - Controller classes with async/await
   - Fluent ORM models
   - Middleware implementations
   - Error handling with AbortError

5. **prompt_contract.md** - Instructions for LLM to validate:
   - Swift Package Manager dependencies
   - Vapor 4.x compatibility
   - Route path patterns
   - Model property types
   - Middleware order

## Dependencies

Extra dependencies to include:
- vapor (core framework)
- fluent (ORM)
- fluent-postgres-driver (database)
- leaf (templating, optional)

## Build Configuration

```toml
[extra_deps]
swift = ["vapor", "fluent", "fluent-postgres-driver"]
```

## Formal Theory

The theory morphism μ_swift_vapor: ThSpec → ThSwiftVapor maps:

- Spec API routes → Vapor RouteBuilder registrations
- Spec models → Fluent Model classes
- Spec middleware → Vapor Middleware implementations  
- Spec controllers → Vapor RouteCollection classes

## Example Output

Given a spec with Users and Items APIs, generate:
- Package.swift with Vapor dependencies
- configure.swift with middleware setup
- routes.swift with CRUD endpoints
- Models/User.swift with Fluent Model
- Models/Item.swift with Fluent Model
- Controllers/UserController.swift
- Controllers/ItemController.swift

## Build Type

build_type = "swift"

## Template

template = "bundle-author"
