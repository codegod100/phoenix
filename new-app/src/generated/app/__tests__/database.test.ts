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
