// Test for UI IU
import { expect, test } from 'bun:test';
import { renderPage } from '../ui.ui.js';
import type { Board } from '../api.js';

const mockBoard: Board = {
  columns: [
    {
      id: 1,
      name: 'Todo',
      order_index: 0,
      created_at: '2026-01-01',
      cards: [
        { id: 1, title: 'Test Card', description: 'Test desc', column_id: 1, order_index: 0, created_at: '2026-01-01' }
      ]
    },
    { id: 2, name: 'Done', order_index: 1, created_at: '2026-01-01', cards: [] }
  ]
};

test('renderPage includes modal root container', () => {
  const html = renderPage(mockBoard);
  expect(html).toContain('id="modal-root"');
});

test('renderPage includes modal JavaScript functions', () => {
  const html = renderPage(mockBoard);
  expect(html).toContain('function showModal(');
  expect(html).toContain('function closeModal(');
  expect(html).toContain('function addCard(');
  expect(html).toContain('function editCard(');
  expect(html).toContain('function deleteCard(');
});

test('renderPage does NOT use browser native alert()', () => {
  const html = renderPage(mockBoard);
  expect(html).not.toContain('alert(');
});

test('renderPage does NOT use browser native prompt()', () => {
  const html = renderPage(mockBoard);
  expect(html).not.toContain('prompt(');
});

test('renderPage does NOT use browser native confirm()', () => {
  const html = renderPage(mockBoard);
  expect(html).not.toContain('confirm(');
});

test('renderPage includes Design System modal styles', () => {
  const html = renderPage(mockBoard);
  // The designSystemStyles are embedded in the template literal, check for actual CSS
  expect(html).toContain('modal-backdrop');
  expect(html).toContain('btn-primary');
  expect(html).toContain('input-field');
});

test('renderPage includes ESC key handler for modals', () => {
  const html = renderPage(mockBoard);
  expect(html).toContain('handleModalKeydown');
  expect(html).toContain('Escape');
});

test('renderPage includes error modal function', () => {
  const html = renderPage(mockBoard);
  expect(html).toContain('function showError(');
});

test('addCard modal has title input with visible label', () => {
  const html = renderPage(mockBoard);
  // Check that the modal content includes visible labels
  expect(html).toContain('Title *');
  expect(html).toContain('Description');
});

test('deleteCard uses destructive button variant', () => {
  const html = renderPage(mockBoard);
  expect(html).toContain('primaryVariant: \'destructive\'');
});

export { };
