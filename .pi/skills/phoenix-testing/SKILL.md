---
name: phoenix-testing
description: Testing guidelines for Phoenix projects. Ensures tests use isolated test databases instead of affecting production data.
---

# Phoenix Testing Guidelines

## Critical Rule: Never Nuke Production Database

Tests MUST use isolated test databases, never the production `data/app.db`.

## Test Database Pattern

### For Database Tests

```typescript
// __tests__/database.test.ts
import { Database as SQLiteDB } from 'bun:sqlite';
import * as db from '../database';

const TEST_DB_PATH = 'data/test.db';

describe('Database', () => {
  let sqliteDb: SQLiteDB;
  
  beforeAll(() => {
    // Clean up any existing test db
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    db.initDatabase(sqliteDb);
  });
  
  afterAll(() => {
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });
  
  // Tests here use isolated database
});
```

### For API Tests

```typescript
// __tests__/api.test.ts
import { Database as SQLiteDB } from 'bun:sqlite';
import * as api from '../api';
import * as db from '../database';

const TEST_DB_PATH = 'data/test-api.db';

describe('API', () => {
  let sqliteDb: SQLiteDB;
  
  beforeAll(() => {
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    db.initDatabase(sqliteDb);
    db.seedDefaultColumns(sqliteDb);
  });
  
  afterAll(() => {
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });
  
  // Tests here
});
```

## Anti-Patterns (NEVER)

```typescript
// ❌ NEVER do this
beforeEach(() => {
  Database.clear();  // This nukes production data!
  Database.initDefaults();
});

// ❌ NEVER use production DB path in tests
const db = new SQLiteDB('data/app.db');

// ❌ NEVER clear tables without isolation
db.prepare('DELETE FROM cards').run();
db.prepare('DELETE FROM columns').run();
```

## Correct Patterns (ALWAYS)

```typescript
// ✅ ALWAYS use test-specific DB path
const TEST_DB_PATH = 'data/test-[feature].db';

// ✅ ALWAYS initialize fresh for each test suite
beforeAll(() => {
  try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  sqliteDb = new SQLiteDB(TEST_DB_PATH);
  db.initDatabase(sqliteDb);
});

// ✅ ALWAYS clean up after tests
afterAll(() => {
  sqliteDb?.close();
  try { Bun.file(TEST_DB_PATH).delete(); } catch {}
});
```

## Server Testing with Ephemeral Ports

### Critical Rule: Never Kill Running Server

Tests that start a server MUST use an ephemeral port (port 0), never a fixed port like 3000.

### Why Port 0?

- **Port 0** tells the OS to assign an available ephemeral port
- Tests can run while development server is running on :3000
- Multiple test files can start servers simultaneously
- No port conflicts between tests and dev environment

### Pattern for Server Tests

```typescript
// ❌ NEVER use fixed port
describe('Server', () => {
  let server: any;
  
  beforeAll(() => {
    server = Bun.serve({
      port: 3000,  // ❌ CONFLICT with running dev server!
      fetch(req) { /* ... */ }
    });
  });
  
  afterAll(() => {
    server.stop();  // ❌ Kills dev server if it was running
  });
});

// ✅ ALWAYS use ephemeral port
describe('Server', () => {
  let server: any;
  let baseUrl: string;
  
  beforeAll(() => {
    server = Bun.serve({
      port: 0,  // ✅ OS assigns available port
      fetch(req) { /* ... */ }
    });
    baseUrl = `http://localhost:${server.port}`;
  });
  
  afterAll(() => {
    server.stop();  // ✅ Only stops test server
  });
  
  it('should respond on ephemeral port', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });
});
```

### Example: Full Server Test with Test Database

```typescript
// __tests__/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database as SQLiteDB } from 'bun:sqlite';
import * as db from '../database';

const TEST_DB_PATH = 'data/test-server.db';

describe('Server Integration', () => {
  let sqliteDb: SQLiteDB;
  let server: any;
  let baseUrl: string;
  
  beforeAll(() => {
    // Clean up and create test database
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    db.initDatabase(sqliteDb);
    db.seedDefaultColumns(sqliteDb);
    
    // Start server on ephemeral port
    server = Bun.serve({
      port: 0,  // Ephemeral port
      fetch(req) {
        const url = new URL(req.url);
        
        // Route handlers using test database
        if (url.pathname === '/health') {
          return Response.json({ status: 'ok' });
        }
        
        if (url.pathname === '/api/columns' && req.method === 'GET') {
          const cols = db.getAllColumns();
          return Response.json(cols);
        }
        
        return new Response('Not Found', { status: 404 });
      }
    });
    
    baseUrl = `http://localhost:${server.port}`;
  });
  
  afterAll(() => {
    server.stop();
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });
  
  it('health check on ephemeral port', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
  
  it('API returns columns from test database', async () => {
    const res = await fetch(`${baseUrl}/api/columns`);
    const cols = await res.json();
    expect(cols.length).toBe(3); // From seedDefaultColumns
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '...',
  name: 'Server',
  risk_tier: 'medium'
} as const;
```

### Server Testing Checklist

- [ ] Server uses `port: 0` for ephemeral port assignment
- [ ] Base URL constructed from `server.port` dynamically
- [ ] Test database isolated from production
- [ ] `afterAll` stops server AND closes database
- [ ] Tests can run while dev server is running on :3000

## CI/CD Considerations

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    # Ensure test dbs are cleaned
    rm -f data/test*.db
    bun test
  
- name: Cleanup
  if: always()
  run: rm -f data/test*.db
```

## Testing Checklist

Before committing tests:
- [ ] Test uses `data/test-*.db` path, never `data/app.db`
- [ ] Test cleans up its database in `afterAll()`
- [ ] Test doesn't assume default data exists (creates its own)
- [ ] Multiple test files use different DB paths to avoid conflicts

## Why This Matters

1. **Data Integrity**: Production data must never be lost due to tests
2. **Test Isolation**: Each test suite runs in complete isolation
3. **Parallel Testing**: Different test files can run simultaneously
4. **Reproducibility**: Fresh database for each test run

## Migration Guide

If existing tests use production database:

1. Change DB path to test path
2. Move setup from `beforeEach` to `beforeAll` where possible
3. Add `afterAll` cleanup
4. Ensure each test file has unique DB path
5. Update imports to use functional API (not Database object)

## Example Full Test File

```typescript
// __tests__/feature.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database as SQLiteDB } from 'bun:sqlite';
import * as db from '../database';
import * as api from '../api';

const TEST_DB_PATH = 'data/test-feature.db';

describe('Feature', () => {
  let sqliteDb: SQLiteDB;
  
  beforeAll(() => {
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    db.initDatabase(sqliteDb);
    db.seedDefaultColumns(sqliteDb);
  });
  
  afterAll(() => {
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });
  
  it('should work with isolated database', () => {
    const cols = db.getAllColumns();
    expect(cols.length).toBe(3);
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '...',
  name: 'Feature',
  risk_tier: 'low'
} as const;
```
