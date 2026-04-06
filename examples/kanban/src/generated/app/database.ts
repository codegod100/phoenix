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
  iu_id: '7755b823586edf2b4eb27f4e28cbacc704809df8821f3f9950ba00536baf3702',
  name: 'Database',
  risk_tier: 'medium',
  canon_ids: [
    '2bc80b42956d76df8cd3010236a272501316a874225a89df3e9df30bb681e225',
    '5a398662b56d7e1d33a32297a11da8595051a36f3e834bcb3a7deca5c4fb380c',
    '774c9c614c4509db05064898929bebff56a92ee9882c111392bb6c9500e1904b',
    'a0d5d632dba5bdf516af26691ccb019a6f5d439d1c91694c075053cf5017227c',
    'f0abeb96cfce90f28ac1cc85d55fb6e3ea64aa031f99d3f03d3cc44fd198c5db',
    'f1938740d570b6b328ad641e41e5e301bd7e845f3f82949d67bd1b6ab32f2119'
  ]
} as const;
