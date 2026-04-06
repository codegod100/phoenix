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

test('renderBoard includes card count badge', () => {
  const board = {
    columns: [
      { id: 1, name: 'Todo', order_index: 0, created_at: '', cards: [{ id: 1, title: 'Card 1', description: null, column_id: 1, order_index: 0, created_at: '' }] },
      { id: 2, name: 'Done', order_index: 1, created_at: '', cards: [] }
    ]
  };
  
  const html = renderBoard(board);
  expect(html).toContain('column-count');
  expect(html).toContain('id="count-1"');
  expect(html).toContain('>1<'); // Todo column has 1 card
  expect(html).toContain('>0<'); // Done column has 0 cards
});

// Phoenix metadata
export const _phoenix = {
  iu_id: 'a8940dc3893b9753f980954c61a1c1433506ca84fc47282de2b19dd2a12b64ed',
  name: 'Board',
  risk_tier: 'medium',
  canon_ids: [
    '0565af4a14e155b5986a9cf9a0fd3e55a9ee1899258ace428877b0896a0b221f',
    '421729737acedf9a26b83a5fc79be28b0a34a07cf4250b42e74386ec0f13909b',
    '49c134d04b8db0b98bd8ca40a9a3551fb44473626046694a7e08abaae429b9a7',
    '98068257ac537b19de80fc392425dc114d8e50ab20c238933d965a84a57ab327',
    'e8c1dae4211fe0b57ab1a80a2c6d953f0f2925e76e202b32690971b54ba0e3b2',
    'f865a365f3b043e76ad7c65b1d90dbadebfe518978966e14c1c14b88be1cc2f8'
  ]
} as const;
