// CONTRACT: Database IU - Store columns and cards with proper schema and relations
// INVARIANT: Foreign key: cards.column_id → columns.id (ON DELETE CASCADE)
// INVARIANT: Unique constraint: (column_id, order_index) for card ordering

import { Database } from 'bun:sqlite';

// Database initialization with schema
export function initDatabase(db: Database) {
  // Enable foreign key constraints
  db.run('PRAGMA foreign_keys = ON');
  
  // Columns table
  db.run(`
    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cards table with foreign key to columns
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      column_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    )
  `);

  // Unique constraint for card ordering within column
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_column_order 
    ON cards(column_id, order_index)
  `);
}

// Register migration for Phoenix tracking
export function registerMigrations(db: Database) {
  const migrations = [
    {
      id: '001_init_columns',
      sql: `
        CREATE TABLE IF NOT EXISTS columns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          order_index INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      id: '002_init_cards',
      sql: `
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          column_id INTEGER NOT NULL,
          order_index INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
        )
      `
    },
    {
      id: '003_card_ordering_index',
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_column_order 
        ON cards(column_id, order_index)
      `
    }
  ];

  for (const m of migrations) {
    db.prepare('INSERT OR IGNORE INTO _migrations (id, applied_at, sql) VALUES (?, datetime("now"), ?)')
      .run(m.id, m.sql);
  }
}

// Seed default columns: Todo, In Progress, Done
export function seedDefaultColumns(db: Database) {
  const defaultColumns = ['Todo', 'In Progress', 'Done'];
  const stmt = db.prepare('INSERT OR IGNORE INTO columns (id, name, order_index) VALUES (?, ?, ?)');
  
  for (let i = 0; i < defaultColumns.length; i++) {
    stmt.run(i + 1, defaultColumns[i], i);
  }
}

export const _phoenix = {
  iu_id: 'f9b51a2c1e76fcfb352162fb0471ab7d9c3f00dc57b8b3dbd555c9e5ed74f67b',
  name: 'Database',
  risk_tier: 'high',
  canon_ids: []
} as const;
