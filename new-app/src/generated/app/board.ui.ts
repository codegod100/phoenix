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
  iu_id: 'cf37732283a9bb519ce626705db5b8a75ae6324fc3260a19d2cd1c0fe5f96cb7',
  name: 'Board',
  risk_tier: 'high',
  canon_ids: []
} as const;
