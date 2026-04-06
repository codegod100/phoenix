// Generated from IU: Database (3a7c98df84dab8dcc333d70c9d351e2aaa2cbda2093f4571f871179d1dfa7ed5)
// Source: spec/app.md - Database section
// Uses SQLite via bun:sqlite

import type { Database as SQLiteDatabase } from 'bun:sqlite';

// Global SQLite instance (set by initDatabase)
let db: SQLiteDatabase | null = null;

export interface Column {
  id: string;
  name: string;
  order_index: number;
  created_at: Date;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  order_index: number;
  created_at: Date;
}

// Initialize database connection and schema
export function initDatabase(sqliteDb?: SQLiteDatabase): void {
  if (sqliteDb) {
    db = sqliteDb;
  }
  if (!db) {
    throw new Error('Database not initialized. Pass SQLite Database instance to initDatabase()');
  }
  createTables();
}

function createTables(): void {
  if (!db) return;
  
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');
  
  // Create columns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  
  // Create cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      column_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    )
  `);
}

// Column operations
export function createColumn(name: string, order_index: number): Column {
  if (!db) throw new Error('Database not initialized');
  
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  
  db.prepare('INSERT INTO columns (id, name, order_index, created_at) VALUES (?, ?, ?, ?)')
    .run(id, name, order_index, created_at);
  
  return { id, name, order_index, created_at: new Date(created_at) };
}

export function getColumn(id: string): Column | undefined {
  if (!db) return undefined;
  
  const row = db.prepare('SELECT * FROM columns WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  
  return {
    id: row.id,
    name: row.name,
    order_index: row.order_index,
    created_at: new Date(row.created_at)
  };
}

export function getAllColumns(): Column[] {
  if (!db) return [];
  
  const rows = db.prepare('SELECT * FROM columns ORDER BY order_index').all() as any[];
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    order_index: row.order_index,
    created_at: new Date(row.created_at)
  }));
}

export function updateColumn(id: string, updates: { name?: string }): Column | undefined {
  if (!db) return undefined;
  
  const column = getColumn(id);
  if (!column) return undefined;
  
  if (updates.name !== undefined) {
    db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(updates.name, id);
    column.name = updates.name;
  }
  
  return column;
}

export function deleteColumn(id: string): boolean {
  if (!db) return false;
  
  // Foreign key cascade will delete associated cards
  const result = db.prepare('DELETE FROM columns WHERE id = ?').run(id);
  return result.changes > 0;
}

// Card operations
export function createCard(
  title: string, 
  description: string | null, 
  column_id: string, 
  order_index: number
): Card {
  if (!db) throw new Error('Database not initialized');
  
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  
  db.prepare('INSERT INTO cards (id, title, description, column_id, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, title, description, column_id, order_index, created_at);
  
  return { id, title, description, column_id, order_index, created_at: new Date(created_at) };
}

export function getCard(id: string): Card | undefined {
  if (!db) return undefined;
  
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    column_id: row.column_id,
    order_index: row.order_index,
    created_at: new Date(row.created_at)
  };
}

export function getCardsByColumn(column_id: string): Card[] {
  if (!db) return [];
  
  const rows = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY order_index').all(column_id) as any[];
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    column_id: row.column_id,
    order_index: row.order_index,
    created_at: new Date(row.created_at)
  }));
}

export function updateCard(
  id: string, 
  updates: { title?: string; description?: string | null; column_id?: string; order_index?: number }
): Card | undefined {
  if (!db) return undefined;
  
  const card = getCard(id);
  if (!card) return undefined;
  
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
    card.title = updates.title;
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
    card.description = updates.description;
  }
  if (updates.column_id !== undefined) {
    fields.push('column_id = ?');
    values.push(updates.column_id);
    card.column_id = updates.column_id;
  }
  if (updates.order_index !== undefined) {
    fields.push('order_index = ?');
    values.push(updates.order_index);
    card.order_index = updates.order_index;
  }
  
  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  
  return card;
}

export function deleteCard(id: string): boolean {
  if (!db) return false;
  
  const result = db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  return result.changes > 0;
}

// Board state
export interface BoardState {
  columns: Array<Column & { cards: Card[] }>;
}

export function getBoard(): BoardState {
  const columns = getAllColumns();
  return {
    columns: columns.map(col => ({
      ...col,
      cards: getCardsByColumn(col.id)
    }))
  };
}

// Migrations (no-op for now - schema is created automatically)
export function registerMigrations(_db: SQLiteDatabase, _migrations: unknown[]): void {
  // Schema migrations handled automatically by createTables()
}

// Seed default columns
export function seedDefaultColumns(sqliteDb?: SQLiteDatabase): void {
  if (sqliteDb) db = sqliteDb;
  if (!db) return;
  
  const count = db.prepare('SELECT COUNT(*) as count FROM columns').get() as { count: number };
  if (count.count === 0) {
    createColumn('Todo', 0);
    createColumn('In Progress', 1);
    createColumn('Done', 2);
  }
}

// Legacy in-memory Database object (for backward compatibility)
export const Database = {
  createColumn,
  getColumn,
  getAllColumns,
  updateColumn,
  deleteColumn,
  createCard,
  getCard,
  getCardsByColumn,
  updateCard,
  deleteCard,
  getBoard,
  initDefaults: () => seedDefaultColumns(),
  clear(): void {
    if (!db) return;
    db.prepare('DELETE FROM cards').run();
    db.prepare('DELETE FROM columns').run();
  }
};

// Export clearDatabase for tests
export function clearDatabase(): void {
  Database.clear();
}

// Phoenix traceability
export const _phoenix = {
  iu_id: '51bccb43096c1a9986195105833ef45765a391d60b814506b94ae5da10557846',
  name: 'Database',
  risk_tier: 'medium',
} as const;
