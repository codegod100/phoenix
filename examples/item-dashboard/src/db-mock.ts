// Mock for bun:sqlite for Vitest compatibility
// This is a test-only mock that provides the same interface

export interface MockDatabase {
  prepare: (sql: string) => MockStatement;
  exec: (sql: string) => void;
}

export interface MockStatement {
  get: (...params: unknown[]) => unknown | null;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => { lastInsertRowid: number; changes: number };
}

// In-memory mock database
const tables = new Map<string, Map<number, Record<string, unknown>>>();
let rowId = 1;

export function createMockDatabase(): MockDatabase {
  return {
    prepare: (sql: string) => createMockStatement(sql),
    exec: (sql: string) => {
      // Handle CREATE TABLE
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      if (match) {
        const tableName = match[1];
        if (!tables.has(tableName)) {
          tables.set(tableName, new Map());
        }
      }
    },
  };
}

function createMockStatement(sql: string): MockStatement {
  return {
    get: (...params: unknown[]) => {
      // Simple mock - return first row or null
      const tableName = extractTableName(sql);
      const table = tables.get(tableName);
      if (!table || table.size === 0) return null;
      const firstRow = table.values().next().value;
      return firstRow || null;
    },
    all: (...params: unknown[]) => {
      const tableName = extractTableName(sql);
      const table = tables.get(tableName);
      if (!table) return [];
      return Array.from(table.values());
    },
    run: (...params: unknown[]) => {
      const tableName = extractTableName(sql);
      const table = tables.get(tableName);
      if (table) {
        const newRow: Record<string, unknown> = { id: rowId };
        table.set(rowId, newRow);
        return { lastInsertRowid: rowId++, changes: 1 };
      }
      return { lastInsertRowid: 0, changes: 0 };
    },
  };
}

function extractTableName(sql: string): string {
  const match = sql.match(/FROM (\w+)/i);
  return match ? match[1] : 'unknown';
}

// Default export matching bun:sqlite Database
export class Database {
  constructor() {
    return createMockDatabase() as unknown as Database;
  }
  prepare = createMockDatabase().prepare;
  exec = createMockDatabase().exec;
}

export default { Database };
