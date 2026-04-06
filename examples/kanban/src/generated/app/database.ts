// IU-1: Database Layer
// Auto-generated from Phoenix plan

import { Database } from 'bun:sqlite';

export const _phoenix = {
  iu_id: 'database-layer-001',
  name: 'Database Layer',
  risk_tier: 'high',
} as const;

const DB_PATH = 'data/app.db';
const DEFAULT_COLUMNS = ['Todo', 'In Progress', 'Done'];

export function initDatabase(db: Database): void {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create columns table
  db.run(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create cards table with foreign key
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      column_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
      UNIQUE(column_id, order_index)
    )
  `);
}

export function seedDefaultColumns(db: Database): void {
  const count = db.query('SELECT COUNT(*) as count FROM columns').get() as { count: number };
  
  if (count.count === 0) {
    const now = new Date().toISOString();
    const insert = db.query(`
      INSERT INTO columns (id, name, order_index, created_at)
      VALUES ($id, $name, $order, $created)
    `);

    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      insert.run({
        $id: crypto.randomUUID(),
        $name: DEFAULT_COLUMNS[i],
        $order: i,
        $created: now
      });
    }
  }
}

export function getDbPath(): string {
  return DB_PATH;
}
