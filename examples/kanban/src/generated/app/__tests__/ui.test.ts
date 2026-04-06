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

// Phoenix metadata
export const _phoenix = {
  iu_id: 'c32edc5541e8bf6db687a858b8b9724920c18111dfbe7256e2d08538fe766dee',
  name: 'UI',
  risk_tier: 'high',
  canon_ids: [
    '06089cd20cacfc4dc2459a01d65d983b9efbd5a371cd2db5b6a432ae6883642b',
    '16513d97a70327ede63e4b6491992464c230b97260416213da3045d2ebe431e5',
    '269c25c6772a9bf27bab5d4bcb85a1cb08f8495b506afcf445476b62adc7de6c',
    '37c35ee931de2b08702db530cc0559ae77900b3ea0d8f7f98fca867f14d45570',
    '46aef274fc3111d5593cb652876af258ad4755ce68a9886cd450b5cbd027d212',
    '544b923688394bb4e05a62446d35b55f4854064d6a3af1767c45d2212656c4eb',
    '5c225f45a44b7b4b2578ff6ff4fa38dbf18f5fc026c5ec0c1129d2a5533336ad',
    '605d22d8f763ec921831823e5b060718c9733c2d89995f2ede85b8e9e8814002',
    '6338ca42caa9f44b9e37b24d3ac73127fc2a599761f35556b7fde3bcff30d8d0',
    '7ed3f9d4ea65a604fbce938a7d674eaf0c196a37ceb69157853453c9f053244e',
    '87f379d2addb8a3af89eb4b98551a4242563ad9830156638915ee621dc1a8d39',
    '8cae5522ea35b7075b0bf650919b3f20f2c8a945c63211850ad2a92e2ac7a032',
    'b1dd4d4453f17ae9635c5132bd42690b9ed4a148a4113057c2b836e71a3da2b5',
    'b51155d47001d085975d63974c64d2fd559a8b2f1086ea4d36b3eca98e047b16',
    'ca27734339a9a71ed2229056095e3e6d099a33736af0d13a4c4e5e68c20b0814',
    'd4bc7bef2f8651b008e5ddbb73b70af625a01bcd10f66057d1d1ab592aaf5f3d',
    'd86ef39d52c8760c2cc0b98120af3e3e8cb7a26401c5e9ee4326debdff389c32',
    'e6fe6380cc3a4251884a185e2bb7537f3a8e55bd732c22075714b9fce0ef4eff',
    'f7e2bac81d9f048c628ffb45086b88a7512e0ed248b2b0673141d2895d1a2703'
  ]
} as const;
