// Test for API IU
import { expect, test, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initDatabase, seedDefaultColumns } from '../database.js';
import { getBoard, createCard, updateCard, moveCard, deleteCard, createColumn, renameColumn } from '../api.js';

let db: Database;

beforeAll(() => {
  db = new Database(':memory:');
  initDatabase(db);
  seedDefaultColumns(db);
});

test('getBoard returns full board state', () => {
  const board = getBoard(db);
  expect(board.columns).toHaveLength(3);
  expect(board.columns[0].name).toBe('Todo');
});

test('createCard creates card with valid data', () => {
  const card = createCard(db, 'Test Card', 'Description', 1);
  expect(card.title).toBe('Test Card');
  expect(card.column_id).toBe(1);
  expect(card.description).toBe('Description');
});

test('createCard validates title length', () => {
  expect(() => createCard(db, '', null, 1)).toThrow();
  expect(() => createCard(db, 'a'.repeat(201), null, 1)).toThrow();
});

test('createCard validates column exists', () => {
  expect(() => createCard(db, 'Test', null, 999)).toThrow('Column not found');
});

test('updateCard updates title and description', () => {
  const card = createCard(db, 'Old Title', 'Old Desc', 1);
  const updated = updateCard(db, card.id, 'New Title', 'New Desc');
  expect(updated.title).toBe('New Title');
  expect(updated.description).toBe('New Desc');
});

test('moveCard changes column and order', () => {
  const card = createCard(db, 'Move Me', null, 1);
  const moved = moveCard(db, card.id, 2, 0);
  expect(moved.column_id).toBe(2);
  expect(moved.order_index).toBe(0);
});

test('moveCard validates column exists', () => {
  const card = createCard(db, 'Test', null, 1);
  expect(() => moveCard(db, card.id, 999, 0)).toThrow('Column not found');
});

test('deleteCard removes card and reorders', () => {
  const card = createCard(db, 'Delete Me', null, 1);
  deleteCard(db, card.id);
  const board = getBoard(db);
  expect(board.columns[0].cards.find(c => c.id === card.id)).toBeUndefined();
});

test('createColumn creates new column', () => {
  const col = createColumn(db, 'New Column');
  expect(col.name).toBe('New Column');
  expect(col.order_index).toBe(3);
});

test('renameColumn updates column name', () => {
  const col = createColumn(db, 'Rename Me');
  const renamed = renameColumn(db, col.id, 'Renamed');
  expect(renamed.name).toBe('Renamed');
});

// Phoenix metadata
export const _phoenix = {
  iu_id: '1ff7069a9997147047673e3ad462c57cb31c5374c07c35244cce3a81d877e98e',
  name: 'API',
  risk_tier: 'medium',
  canon_ids: [
    '0b188f3a1146b9012c5b8f828bb1dae040dd9f636d4cf81293ba75504badaa70',
    '0b78412542ffc126a61c447152bedb798842219ac5a316713296c7d7b1fa553c',
    '3a13a7707f9aedd05a520c8b42ea75794278d7845cc8bbbfa5070f621d4ee2fe',
    '53acc6fc41a2fb54673f5635883f196596f4fa71e54eae60c893cd48641234fa',
    '792f5cf84c5c3e4db22a4342ccac3cab6b9b71a2f3a51aa63273d0cca3acf638',
    '8911cbfd7f5c767f586693a42c804b0fda5e8034b1756d9ac48934dc80d0aaca',
    '908aea6ec388c55cf183cb681e971ecc3ea69292670fe85c2638123818a5c186',
    'a7f1870c79de6724ab9390937490e9290ee7862a9d2a7a5e03e7d90337dd8eb0',
    'df146a7e13a736d80e55e5998f40074e054440e94eb0fc2e54ca391d4efab812',
    'e60fb850ae066007763db0eefe69826859f441ca6c6df26bed4ae862e56e19c8',
    'faab3a53e9c29c822049b62c9981cb646cedc766318146380e88b61dc20feeed'
  ]
} as const;
