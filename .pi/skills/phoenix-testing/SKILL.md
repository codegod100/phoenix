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
