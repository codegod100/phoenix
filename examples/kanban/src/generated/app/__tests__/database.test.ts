// Test for Database IU
import { expect, test, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initDatabase, seedDefaultColumns } from '../database.js';

let db: Database;

beforeAll(() => {
  db = new Database(':memory:');
  db.run('PRAGMA foreign_keys = ON');
  initDatabase(db);
  seedDefaultColumns(db);
});

test('columns table exists with correct schema', () => {
  const columns = db.prepare("SELECT * FROM columns").all();
  expect(columns).toHaveLength(3);
  expect(columns.map((c: any) => c.name)).toEqual(['Todo', 'In Progress', 'Done']);
});

test('cards table exists with foreign key to columns', () => {
  const result = db.prepare(
    "SELECT sql FROM sqlite_master WHERE name = 'cards' AND type = 'table'"
  ).get() as { sql: string };
  expect(result.sql).toContain('FOREIGN KEY');
  expect(result.sql).toContain('column_id');
});

test('unique index on (column_id, order_index)', () => {
  const result = db.prepare(
    "SELECT sql FROM sqlite_master WHERE name = 'idx_cards_column_order'"
  ).get() as { sql: string };
  expect(result.sql).toContain('UNIQUE INDEX');
});

test('can insert card with valid data', () => {
  const result = db.prepare(
    'INSERT INTO cards (title, column_id, order_index) VALUES (?, ?, ?)'
  ).run('Test Card', 1, 0);
  expect(result.lastInsertRowid).toBeGreaterThan(0);
});

test('foreign key enforces column exists', () => {
  expect(() => {
    db.prepare(
      'INSERT INTO cards (title, column_id, order_index) VALUES (?, ?, ?)'
    ).run('Bad Card', 999, 0);
  }).toThrow();
});

// Phoenix metadata
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
