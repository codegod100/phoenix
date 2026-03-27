import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Simple database setup
const dbPath = join(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Migration tracking
const migrationsPath = join(process.cwd(), 'migrations.json');
let appliedMigrations: string[] = [];

if (existsSync(migrationsPath)) {
  appliedMigrations = JSON.parse(readFileSync(migrationsPath, 'utf-8'));
}

function registerMigration(name: string, sql: string) {
  if (!appliedMigrations.includes(name)) {
    db.exec(sql);
    appliedMigrations.push(name);
    writeFileSync(migrationsPath, JSON.stringify(appliedMigrations, null, 2));
  }
}

// Register table migration
registerMigration('todos', `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const router = new Hono();

// Delete todo
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Todo not found' }, 404);
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return c.body(null, 204);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '125a8c73ae939f4ba0acfe73d08b7124f40105d27ce351aff1edc6278e5440e9',
  name: 'Delete Todo',
  risk_tier: 'low',
  canon_ids: [3 as const],
} as const;