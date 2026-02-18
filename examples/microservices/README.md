# Phoenix VCS — Example Project

A sample microservices platform with three specs: API Gateway, User Service, and Notification Service.

## Quick Start

```bash
# From the phoenix repo root, build and link the CLI (one-time)
cd /path/to/phoenix
npm run build
npm link

# Enter the example project
cd example

# 1. Initialize Phoenix
phoenix init

# 2. Bootstrap (ingest → canonicalize → plan → generate → scaffold)
phoenix bootstrap

# 3. Install generated project dependencies
npm install

# 4. Typecheck the generated code
npm run typecheck

# 5. Run all generated tests (52 tests)
npm test

# 6. Start a service
npm run start:api-gateway        # http://localhost:3000
npm run start:user-service       # http://localhost:3002
npm run start:notification-service  # http://localhost:3001
```

## Hit the Live Endpoints

```bash
# Start the API Gateway
npm run start:api-gateway &

# Health check
curl localhost:3000/health | jq .

# Request metrics
curl localhost:3000/metrics | jq .

# List registered modules with risk tiers
curl localhost:3000/modules | jq .

# 404 for unknown routes
curl localhost:3000/nonexistent | jq .
```

## Explore with Phoenix

```bash
# Trust dashboard — the primary UX
phoenix status

# See what Phoenix extracted from specs
phoenix clauses                     # 26 clauses across 3 docs
phoenix canon                       # 87 canonical nodes (requirements, constraints, invariants)

# Inspect the IU plan
phoenix plan                        # 20 Implementation Units across 3 services

# Check generated files for unauthorized edits
phoenix drift

# Evaluate evidence against risk-tier policy
phoenix evaluate

# Provenance graph summary
phoenix graph
```

## Make a Spec Change

```bash
# Add a requirement
echo "- The gateway must support WebSocket upgrade requests" >> spec/api-gateway.md

# See the diff
phoenix diff spec/api-gateway.md

# Re-ingest → re-canonicalize → re-plan → regenerate
phoenix ingest
phoenix canonicalize
phoenix plan
phoenix regen

# Rebuild and test
npm run build
npm test

# Check status
phoenix status
```

## Simulate Drift

```bash
# Edit a generated file without going through Phoenix
echo "// unauthorized edit" >> src/generated/api-gateway/authentication.ts

# Drift detection catches it
phoenix drift                      # DRIFTED
phoenix status                     # Shows ERROR diagnostic

# Fix it by regenerating
phoenix regen
phoenix status                     # Clean again
```

## Project Structure After Bootstrap

```
example/
├── package.json                        # Generated — npm scripts for each service
├── tsconfig.json                       # Generated — strict TypeScript config
├── vitest.config.ts                    # Generated — test runner config
├── spec/                               # Human-written specs
│   ├── api-gateway.md
│   ├── user-service.md
│   └── notification-service.md
├── src/generated/
│   ├── index.ts                        # Service registry
│   ├── api-gateway/
│   │   ├── index.ts                    # Barrel exports
│   │   ├── server.ts                   # HTTP server (:3000)
│   │   ├── authentication.ts           # Module: validate(token)
│   │   ├── rate-limiting.ts            # Module: rateLimit(input)
│   │   ├── request-routing.ts          # Module: route(request)
│   │   ├── circuit-breaking.ts         # Module: handle(request)
│   │   ├── logging-observability.ts
│   │   ├── request-transformation.ts
│   │   ├── security-constraints.ts
│   │   └── __tests__/
│   │       └── api-gateway.test.ts     # 18 tests (modules + server)
│   ├── user-service/
│   │   ├── index.ts
│   │   ├── server.ts                   # HTTP server (:3002)
│   │   ├── account-management.ts       # Module: create(input)
│   │   ├── search.ts                   # Module: search(user): User[]
│   │   ├── events.ts                   # Module: publish(event)
│   │   ├── profile-management.ts
│   │   ├── authentication-integration.ts
│   │   ├── data-constraints.ts
│   │   └── __tests__/
│   │       └── user-service.test.ts    # 16 tests
│   └── notification-service/
│       ├── index.ts
│       ├── server.ts                   # HTTP server (:3001)
│       ├── email-delivery.ts
│       ├── push-notifications.ts
│       ├── delivery-guarantees.ts
│       ├── template-system.ts
│       ├── channel-support.ts
│       ├── in-app-messages.ts
│       ├── rate-limiting.ts
│       └── __tests__/
│           └── notification-service.test.ts  # 18 tests
└── .phoenix/                           # Phoenix state (not checked in)
    ├── state.json
    ├── graphs/
    │   ├── spec.json
    │   ├── canonical.json
    │   ├── ius.json
    │   └── warm-hashes.json
    ├── manifests/
    │   └── generated_manifest.json
    └── store/objects/
```

## What Each Test Verifies

**Module tests** (per module):
- Exports Phoenix traceability metadata (`_phoenix.name`, `_phoenix.risk_tier`)
- Has at least one exported function

**Server tests** (per service):
- `GET /health` returns 200 with service name, uptime, module list
- `GET /metrics` returns request counts
- `GET /modules` lists all modules with risk tiers and exports
- `GET /unknown` returns 404

## The Trace

Every line of generated code traces back to a spec:

```
spec/api-gateway.md:9  "The gateway must validate JWT tokens..."
  → Clause 976a9f4b
    → CanonicalNode a890e171 (REQUIREMENT)
      → IU "Authentication" (high risk)
        → src/generated/api-gateway/authentication.ts
          → validate(jwtToken: JwtToken): boolean
```

Change that spec line → only `authentication.ts` is invalidated. Not the whole project.
