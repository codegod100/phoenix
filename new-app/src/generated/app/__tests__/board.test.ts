// Test for Board IU
import { expect, test } from 'bun:test';
import { renderBoard } from '../board.ui.js';

test('renderBoard returns HTML with columns', () => {
  const board = {
    columns: [
      { id: 1, name: 'Todo', order_index: 0, created_at: '', cards: [] },
      { id: 2, name: 'Done', order_index: 1, created_at: '', cards: [] }
    ]
  };
  
  const html = renderBoard(board);
  expect(html).toContain('Todo');
  expect(html).toContain('Done');
  expect(html).toContain('add-column');
});

test('renderBoard includes cards in columns', () => {
  const board = {
    columns: [
      {
        id: 1,
        name: 'Todo',
        order_index: 0,
        created_at: '',
        cards: [
          { id: 1, title: 'Test Card', description: null, column_id: 1, order_index: 0, created_at: '' }
        ]
      }
    ]
  };
  
  const html = renderBoard(board);
  expect(html).toContain('Test Card');
});

export { };
