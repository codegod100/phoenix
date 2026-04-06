// CONTRACT: Board IU - Main board display with columns and cards
// INVARIANT: Display board as horizontal row of columns
// INVARIANT: Each column shows cards stacked vertically
// INVARIANT: Each column header displays card count badge
// INVARIANT: Card count badge updates when cards are added/moved/deleted
// INVARIANT: Board fills viewport width, columns scroll horizontally if needed
// INVARIANT: Column height fixed with internal scroll for many cards

import type { Board, Column, Card } from './api.js';

export function renderBoard(board: Board): string {
  const columns = board.columns.map(col => renderColumn(col)).join('');
  
  return `
    <div class="board">
      ${columns}
      <div class="add-column">
        <button onclick="addColumn()">+ Add Column</button>
      </div>
    </div>
  `;
}

function renderColumn(column: Column): string {
  const cards = column.cards.map(card => `
    <div class="column-card" data-card-id="${card.id}" draggable="true">
      <div class="card-title" onclick="editCard(${card.id})">${escapeHtml(card.title)}</div>
      ${card.description ? `<div class="card-desc">${escapeHtml(card.description)}</div>` : ''}
      <button class="card-delete" onclick="deleteCard(${card.id})">×</button>
    </div>
  `).join('');

  return `
    <div class="column" data-column-id="${column.id}">
      <div class="column-header">
        <span class="column-name" onclick="editColumnName(${column.id})">${escapeHtml(column.name)}</span>
        <span class="column-count" id="count-${column.id}">${column.cards.length}</span>
      </div>
      <div class="column-cards" data-column-id="${column.id}">
        ${cards}
      </div>
      <div class="column-footer">
        <button onclick="addCard(${column.id})">+ Add Card</button>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// CSS for board - Dark theme: bg #1e1e2e, cards #313244, accents #89b4fa
export const boardStyles = `
.board {
  display: flex;
  gap: 16px;
  padding: 16px;
  min-height: 100vh;
  background: #1e1e2e;
  overflow-x: auto;
  align-items: flex-start;
}

.column {
  flex-shrink: 0;
  width: 300px;
  max-height: calc(100vh - 32px);
  background: #181825;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 12px;
  border-bottom: 1px solid #313244;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-name {
  font-weight: 600;
  color: #cdd6f4;
  cursor: text;
  flex: 1;
}

.column-name:hover {
  background: rgba(137, 180, 250, 0.1);
  border-radius: 3px;
}

.column-count {
  background: #313244;
  color: #a6adc8;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.85em;
  margin-left: 8px;
}

.column-cards {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.column-card {
  background: #313244;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  position: relative;
}

.column-card.dragging {
  opacity: 0.5;
}

.column-card .card-title {
  font-weight: 500;
  color: #cdd6f4;
  word-break: break-word;
}

.column-card .card-title:hover {
  background: rgba(137, 180, 250, 0.1);
  border-radius: 3px;
  cursor: text;
}

.column-card .card-desc {
  color: #a6adc8;
  font-size: 0.9em;
  margin-top: 6px;
  word-break: break-word;
}

.column-card .card-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: #f38ba8;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.column-card:hover .card-delete {
  opacity: 1;
}

.column-footer {
  padding: 12px;
  border-top: 1px solid #313244;
}

.column-footer button {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed #89b4fa;
  color: #89b4fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.column-footer button:hover {
  background: rgba(137, 180, 250, 0.1);
}

.add-column {
  flex-shrink: 0;
  padding: 12px;
}

.add-column button {
  width: 300px;
  padding: 12px;
  background: rgba(137, 180, 250, 0.1);
  border: 2px dashed #89b4fa;
  color: #89b4fa;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
}

.add-column button:hover {
  background: rgba(137, 180, 250, 0.2);
}

/* Scrollbar styling */
.column-cards::-webkit-scrollbar {
  width: 6px;
}

.column-cards::-webkit-scrollbar-track {
  background: transparent;
}

.column-cards::-webkit-scrollbar-thumb {
  background: #313244;
  border-radius: 3px;
}
`;

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
