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
