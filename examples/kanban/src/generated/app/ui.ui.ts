// @ts-nocheck
// Generated from IU: UI (da1d8be46d7fb8ef67fd090f86bdba67e5264ebae258bea5b6380b706183bd6f)
// Source: spec/app.md - UI section
// Dependencies: Cards, Design System

import { DesignSystem, Theme, designSystemStyles } from './designsystem.ui';
import { API, CreateCardRequest, UpdateCardRequest, MoveCardRequest } from './api';
import { CardComponent, DragState } from './cards.ui';
import { BoardComponent } from './board.ui';
import { Database, Card, Column } from './database';

export interface ModalProps {
  title: string;
  content: HTMLElement;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export const UI = {
  // Modal dialog (no native alert/prompt)
  createModal(props: ModalProps): HTMLElement {
    // Backdrop with blur
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${DesignSystem.modal.backdrop};
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    // Modal container
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.style.cssText = `
      background: ${DesignSystem.modal.background};
      border-radius: ${DesignSystem.modal.borderRadius};
      padding: 0;
      min-width: 400px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
    `;
    
    // Header with title and close button
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid ${DesignSystem.colors.surface0};
    `;
    
    const title = document.createElement('h2');
    title.textContent = props.title;
    title.style.cssText = `
      margin: 0;
      color: ${DesignSystem.typography.primary};
      font-size: 18px;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${DesignSystem.typography.secondary};
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
    `;
    closeBtn.addEventListener('click', () => {
      props.onCancel();
      backdrop.remove();
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    
    // Content
    const content = document.createElement('div');
    content.style.cssText = 'padding: 24px;';
    content.appendChild(props.content);
    modal.appendChild(content);
    
    // Footer with buttons (right-aligned)
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid ${DesignSystem.colors.surface0};
    `;
    
    // Cancel button (secondary)
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = props.cancelText || 'Cancel';
    cancelBtn.style.cssText = `
      background: ${DesignSystem.button.secondary.background};
      color: ${DesignSystem.button.secondary.color};
      border: ${DesignSystem.button.secondary.border};
      border-radius: ${DesignSystem.button.secondary.borderRadius};
      padding: ${DesignSystem.button.secondary.padding};
      cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => {
      props.onCancel();
      backdrop.remove();
    });
    
    // Confirm button (primary or destructive)
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = props.confirmText || 'Confirm';
    const btnStyle = props.destructive ? DesignSystem.button.destructive : DesignSystem.button.primary;
    confirmBtn.style.cssText = `
      background: ${btnStyle.background};
      color: ${btnStyle.color};
      border: none;
      border-radius: ${btnStyle.borderRadius};
      padding: ${btnStyle.padding};
      cursor: pointer;
    `;
    confirmBtn.addEventListener('click', () => {
      props.onConfirm();
      backdrop.remove();
    });
    
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    modal.appendChild(footer);
    
    backdrop.appendChild(modal);
    
    // Backdrop click closes modal (cancel action)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        props.onCancel();
        backdrop.remove();
      }
    });
    
    // ESC key closes modal (cancel action)
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onCancel();
        backdrop.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    return backdrop;
  },

  // Card creation modal
  createCardModal(columnId: string, onCreate: (req: CreateCardRequest) => void): HTMLElement {
    const form = document.createElement('div');
    
    // Title input with visible label
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title *';
    titleLabel.style.cssText = `color: ${DesignSystem.typography.secondary}; font-size: 12px; display: block; margin-bottom: 4px;`;
    
    const titleInput = document.createElement('input');
    titleInput.placeholder = 'Enter card title';
    titleInput.maxLength = 200;
    titleInput.style.cssText = `
      width: 100%;
      background: ${DesignSystem.input.background};
      border: ${DesignSystem.input.border};
      color: ${DesignSystem.input.color};
      border-radius: ${DesignSystem.input.borderRadius};
      padding: ${DesignSystem.input.padding};
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    titleInput.addEventListener('focus', () => {
      titleInput.style.borderColor = DesignSystem.input.borderFocus;
    });
    titleInput.addEventListener('blur', () => {
      titleInput.style.borderColor = DesignSystem.colors.surface1;
    });
    
    // Description textarea with visible label
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descLabel.style.cssText = `color: ${DesignSystem.typography.secondary}; font-size: 12px; display: block; margin-bottom: 4px;`;
    
    const descInput = document.createElement('textarea');
    descInput.placeholder = 'Optional description';
    descInput.style.cssText = `
      width: 100%;
      min-height: 100px;
      resize: vertical;
      background: ${DesignSystem.input.background};
      border: ${DesignSystem.input.border};
      color: ${DesignSystem.input.color};
      border-radius: ${DesignSystem.input.borderRadius};
      padding: ${DesignSystem.input.padding};
      box-sizing: border-box;
    `;
    descInput.addEventListener('focus', () => {
      descInput.style.borderColor = DesignSystem.input.borderFocus;
    });
    
    form.appendChild(titleLabel);
    form.appendChild(titleInput);
    form.appendChild(descLabel);
    form.appendChild(descInput);
    
    return this.createModal({
      title: 'Create Card',
      content: form,
      onConfirm: () => {
        onCreate({
          title: titleInput.value,
          description: descInput.value || undefined
        });
      },
      onCancel: () => {},
      confirmText: 'Create'
    });
  },

  // Card edit modal
  editCardModal(card: Card, onUpdate: (req: UpdateCardRequest) => void): HTMLElement {
    const form = document.createElement('div');
    
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title *';
    titleLabel.style.cssText = `color: ${DesignSystem.typography.secondary}; font-size: 12px; display: block; margin-bottom: 4px;`;
    
    const titleInput = document.createElement('input');
    titleInput.value = card.title;
    titleInput.maxLength = 200;
    titleInput.style.cssText = `
      width: 100%;
      background: ${DesignSystem.input.background};
      border: ${DesignSystem.input.border};
      color: ${DesignSystem.input.color};
      border-radius: ${DesignSystem.input.borderRadius};
      padding: ${DesignSystem.input.padding};
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descLabel.style.cssText = `color: ${DesignSystem.typography.secondary}; font-size: 12px; display: block; margin-bottom: 4px;`;
    
    const descInput = document.createElement('textarea');
    descInput.value = card.description || '';
    descInput.style.cssText = `
      width: 100%;
      min-height: 100px;
      resize: vertical;
      background: ${DesignSystem.input.background};
      border: ${DesignSystem.input.border};
      color: ${DesignSystem.input.color};
      border-radius: ${DesignSystem.input.borderRadius};
      padding: ${DesignSystem.input.padding};
      box-sizing: border-box;
    `;
    
    form.appendChild(titleLabel);
    form.appendChild(titleInput);
    form.appendChild(descLabel);
    form.appendChild(descInput);
    
    return this.createModal({
      title: 'Edit Card',
      content: form,
      onConfirm: () => {
        onUpdate({
          title: titleInput.value,
          description: descInput.value || null
        });
      },
      onCancel: () => {},
      confirmText: 'Save'
    });
  },

  // Delete confirmation modal
  deleteCardModal(card: Card, onDelete: () => void): HTMLElement {
    const message = document.createElement('p');
    message.textContent = `Are you sure you want to delete "${card.title}"?`;
    message.style.cssText = `color: ${DesignSystem.typography.primary}; margin: 0;`;
    
    return this.createModal({
      title: 'Delete Card',
      content: message,
      onConfirm: onDelete,
      onCancel: () => {},
      confirmText: 'Delete',
      destructive: true
    });
  },

  // Column creation modal
  createColumnModal(onCreate: (name: string) => void): HTMLElement {
    const form = document.createElement('div');
    
    const label = document.createElement('label');
    label.textContent = 'Column Name *';
    label.style.cssText = `color: ${DesignSystem.typography.secondary}; font-size: 12px; display: block; margin-bottom: 4px;`;
    
    const input = document.createElement('input');
    input.placeholder = 'Enter column name';
    input.style.cssText = `
      width: 100%;
      background: ${DesignSystem.input.background};
      border: ${DesignSystem.input.border};
      color: ${DesignSystem.input.color};
      border-radius: ${DesignSystem.input.borderRadius};
      padding: ${DesignSystem.input.padding};
      box-sizing: border-box;
    `;
    
    form.appendChild(label);
    form.appendChild(input);
    
    return this.createModal({
      title: 'Create Column',
      content: form,
      onConfirm: () => onCreate(input.value),
      onCancel: () => {},
      confirmText: 'Create'
    });
  },

  // Update card count badge (real-time, no page reload)
  updateCardCount(columnId: string, delta: number): void {
    const badge = document.getElementById(`count-${columnId}`);
    if (badge) {
      const current = parseInt(badge.textContent || '0');
      badge.textContent = (current + delta).toString();
    }
  },

  // Apply dark theme to document
  applyTheme(): void {
    document.body.style.backgroundColor = DesignSystem.layout.boardBackground;
    document.body.style.color = DesignSystem.typography.primary;
    document.body.style.fontFamily = DesignSystem.typography.fontFamily;
    document.body.style.margin = '0';
  }
};

// Helper: Convert URLs in text to clickable links
function linkify(text: string): string {
  if (!text) return '';
  // URL regex: matches http/https/ftp URLs (explicitly exclude newlines/carriage returns)
  const urlRegex = /(https?:\/\/[^\s<\n\r]+|ftp:\/\/[^\s<\n\r]+)/gi;
  return text.replace(urlRegex, function(url) {
    // Escape HTML in the URL for href attribute (security)
    const safeUrl = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Show original URL as text (not escaped), use CSS class for hover
    return '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="card-link">' + url + '</a>';
  });
}

// Server-side render page function (for server.ts compatibility)
export function renderPage(board: { columns: Array<{ id: number | string; name: string; cards: Array<{ id: number | string; title: string; description: string | null; order_index: number }> }> }): string {
  const columnsHtml = board.columns.map(col => `
    <div class="column" data-column-id="${col.id}" draggable="true" style="
      background: ${DesignSystem.layout.columnBackground};
      border-radius: 8px; min-width: 280px; max-width: 280px;
      display: flex; flex-direction: column; max-height: calc(100vh - 32px);
      cursor: grab;
    ">
      <div class="column-header" style="
        padding: 12px 16px;
        border-bottom: 1px solid ${DesignSystem.layout.boardBackground};
        display: flex; justify-content: space-between; align-items: center;
        position: relative;
      ">
        <span class="column-name" data-column-id="${col.id}" style="margin: 0; color: ${DesignSystem.typography.primary}; font-size: 14px; font-weight: 600; padding-right: 80px;">${col.name}</span>
        <div style="display: flex; align-items: center; gap: 8px; position: absolute; right: 16px;">
          <button class="edit-column-btn" data-column-id="${col.id}" style="
            background: transparent; border: none; color: ${DesignSystem.typography.secondary};
            cursor: pointer; font-size: 14px; opacity: 0; transition: opacity 0.2s;
            padding: 4px; border-radius: 4px;
          " title="Edit column">✏️</button>
          <button class="delete-column-btn" data-column-id="${col.id}" style="
            background: transparent; border: none; color: #f38ba8;
            cursor: pointer; font-size: 14px; opacity: 0; transition: opacity 0.2s;
            padding: 4px; border-radius: 4px;
          " title="Delete column">🗑️</button>
          <span id="count-${col.id}" style="
            background: ${DesignSystem.badge.background}; color: ${DesignSystem.badge.color};
            border-radius: ${DesignSystem.badge.borderRadius}; padding: ${DesignSystem.badge.padding};
            font-size: ${DesignSystem.badge.fontSize};
          ">${col.cards.length}</span>
        </div>
      </div>
      <div class="column-cards" style="
        flex: 1; overflow-y: auto; padding: 12px;
        display: flex; flex-direction: column; gap: 8px;
      ">
        ${col.cards.map(card => `
          <div class="card" data-card-id="${card.id}" draggable="true" style="
            background: ${DesignSystem.card.background}; border-radius: ${DesignSystem.card.borderRadius};
            padding: ${DesignSystem.card.padding}; box-shadow: ${DesignSystem.card.shadow};
            cursor: grab; max-height: ${DesignSystem.card.maxHeight}; overflow-y: auto;
            position: relative;
          ">
            <button class="edit-card-btn" data-card-id="${card.id}" style="
              position: absolute; top: 8px; right: 8px;
              background: ${DesignSystem.card.background}; border: none;
              color: ${DesignSystem.typography.secondary}; cursor: pointer;
              font-size: 14px; padding: 4px; border-radius: 4px;
              opacity: 0; transition: opacity 0.2s; z-index: 10;
              pointer-events: auto;
            " title="Edit card"><span style="pointer-events: none;">✏️</span></button>
            <button class="delete-card-btn" data-card-id="${card.id}" style="
              position: absolute; top: 8px; right: 32px;
              background: ${DesignSystem.card.background}; border: none;
              color: #f38ba8; cursor: pointer;
              font-size: 14px; padding: 4px; border-radius: 4px;
              opacity: 0; transition: opacity 0.2s; z-index: 10;
              pointer-events: auto;
            " title="Delete card"><span style="pointer-events: none;">🗑️</span></button>
            <h4 style="margin: 0 0 4px 0; color: ${DesignSystem.typography.primary}; font-size: 14px; padding-right: 48px;">${card.title}</h4>
            ${card.description ? `<p style="margin: 0; color: ${DesignSystem.typography.secondary}; font-size: 12px; overflow-wrap: break-word; white-space: pre-wrap;">${linkify(card.description)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="add-card-btn" data-column-id="${col.id}" style="
        background: transparent; border: none; color: ${DesignSystem.typography.secondary};
        padding: 12px; cursor: pointer; font-size: 12px; text-align: left;
      ">+ Add Card</button>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <style>${designSystemStyles}</style>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    .kanban-board {
      display: flex; flex-direction: row; gap: 16px;
      padding: 16px; height: 100vh; overflow-x: auto; overflow-y: hidden; align-items: flex-start;
    }
    .card { transition: opacity 0.2s; cursor: grab; position: relative; }
    .card-link { color: #89b4fa; text-decoration: none; }
    .card-link:hover { text-decoration: underline; }
    .card:hover .edit-card-btn, .card:hover .delete-card-btn { opacity: 1 !important; }
    .edit-card-btn:hover { color: #89b4fa !important; background: #1e1e2e !important; }
    .delete-card-btn:hover { color: #f38ba8 !important; background: #1e1e2e !important; }
    .card[draggable="true"]:hover { opacity: 0.8; }
    .column-cards.drag-over { background: rgba(137, 180, 250, 0.1) !important; }
    .column-header:hover .edit-column-btn, .column-header:hover .delete-column-btn { opacity: 1 !important; }
    .edit-column-btn:hover { color: #89b4fa !important; background: #1e1e2e !important; }
    .delete-column-btn:hover { color: #f38ba8 !important; background: #1e1e2e !important; }
    .column[draggable="true"] { transition: opacity 0.2s; }
    .column[draggable="true"]:hover { opacity: 0.9; }
    .column.dragging { opacity: 0.5; cursor: grabbing; }
    .column.drag-over { border-left: 3px solid #89b4fa; }
  </style>
</head>
<body>
  <div class="kanban-board">
    ${columnsHtml}
    <button id="add-column" style="
      background: transparent; border: 2px dashed ${Theme.colors.surface1};
      color: ${DesignSystem.typography.secondary}; border-radius: 8px;
      padding: 12px 24px; cursor: pointer; min-width: 280px; font-size: 14px;
    ">+ Add Column</button>
  </div>
  <script>
    // Helper: Convert URLs in text to clickable links
    function linkify(text) {
      if (!text) return '';
      // URL regex: matches http/https/ftp URLs (explicitly exclude newlines)
      var urlRegex = new RegExp('(https?://[^\\s<\\n\\r]+|ftp://[^\\s<\\n\\r]+)', 'gi');
      return text.replace(urlRegex, function(url) {
        // Escape HTML in the URL for href attribute (security)
        var safeUrl = url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Show original URL as text (not escaped)
        return '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="card-link">' + url + '</a>';
      });
    }

    // Modal helper (styled, not native prompt)
    function showModal(title, contentHtml, onConfirm, confirmText, cancelText) {
      confirmText = confirmText || 'Confirm';
      cancelText = cancelText || 'Cancel';
      var backdrop = document.createElement('div');
      backdrop.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;';
      
      var modal = document.createElement('div');
      modal.style.cssText = 'background:#181825;border-radius:8px;min-width:400px;max-width:90vw;';
      
      modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #313244;">' +
        '<h2 style="margin:0;color:#cdd6f4;font-size:18px;">' + title + '</h2>' +
        '<button class="modal-close" style="background:transparent;border:none;color:#a6adc8;font-size:24px;cursor:pointer;">×</button>' +
        '</div>' +
        '<div style="padding:24px;">' + contentHtml + '</div>' +
        '<div style="display:flex;justify-content:flex-end;gap:12px;padding:16px 24px;border-top:1px solid #313244;">' +
        '<button class="modal-cancel" style="background:transparent;color:#cdd6f4;border:1px solid #a6adc8;border-radius:6px;padding:8px 16px;cursor:pointer;">' + cancelText + '</button>' +
        '<button class="modal-confirm" style="background:#89b4fa;color:#1e1e2e;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;">' + confirmText + '</button>' +
        '</div>';
      
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      
      var closeModal = function() { backdrop.remove(); };
      
      // Handle Enter key to submit (unless in textarea)
      var enterHandler = function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onConfirm();
          closeModal();
          document.removeEventListener('keydown', enterHandler);
        }
      };
      document.addEventListener('keydown', enterHandler);
      
      backdrop.addEventListener('click', function(e) { if (e.target === backdrop) closeModal(); });
      document.addEventListener('keydown', function escHandler(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } });
      modal.querySelector('.modal-close').addEventListener('click', closeModal);
      modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('.modal-confirm').addEventListener('click', function() { onConfirm(); closeModal(); });
      
      // Auto-focus first input field and position cursor at end
      var firstInput = modal.querySelector('input, textarea');
      if (firstInput) {
        setTimeout(function() { 
          firstInput.focus();
          // Position cursor at end of value for edit dialogs
          var val = firstInput.value;
          if (val && val.length > 0) {
            firstInput.selectionStart = val.length;
            firstInput.selectionEnd = val.length;
          }
        }, 0);
      }
    }

    // Drag and drop for cards
    var draggedCard = null;
    document.querySelectorAll('.card').forEach(function(card) {
      card.addEventListener('dragstart', function(e) {
        e.stopPropagation(); // Prevent column drag from triggering
        draggedCard = card;
        card.style.opacity = '0.5';
        e.dataTransfer.setData('text/plain', card.dataset.cardId);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function(e) {
        e.stopPropagation(); // Prevent column dragend from triggering
        card.style.opacity = '1';
        draggedCard = null;
      });
    });
    
    // Drag and drop for columns
    var draggedColumn = null;
    document.querySelectorAll('.column').forEach(function(column) {
      column.addEventListener('dragstart', function(e) {
        // Don't drag column if dragging a card inside it
        if (e.target.classList && e.target.classList.contains('card')) return;
        
        draggedColumn = column;
        column.classList.add('dragging');
        e.dataTransfer.setData('text/plain', column.dataset.columnId);
        e.dataTransfer.effectAllowed = 'move';
      });
      column.addEventListener('dragend', function(e) {
        // Only clear if we were dragging this column (not a card)
        if (draggedColumn === column) {
          column.classList.remove('dragging');
          draggedColumn = null;
          // Remove all drag-over indicators
          document.querySelectorAll('.column').forEach(function(col) {
            col.classList.remove('drag-over');
          });
        }
      });
      
      // Drag enter/over/leave/drop for column reordering
      column.addEventListener('dragenter', function(e) {
        // Skip if dragging a card (not a column)
        if (draggedCard) return;
        if (draggedColumn && draggedColumn !== column) {
          column.classList.add('drag-over');
        }
      });
      column.addEventListener('dragleave', function(e) {
        if (draggedCard) return;
        column.classList.remove('drag-over');
      });
      column.addEventListener('dragover', function(e) {
        if (draggedCard) {
          // Allow card drop but don't show column reorder UI
          return;
        }
        if (draggedColumn) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      });
      column.addEventListener('drop', function(e) {
        // If dropping a card, let card drop handler process it
        if (draggedCard) {
          // Card drop is handled separately
          return;
        }
        
        if (draggedColumn && draggedColumn !== column) {
          e.preventDefault();
          column.classList.remove('drag-over');
          
          var draggedId = draggedColumn.dataset.columnId;
          var targetId = column.dataset.columnId;
          
          // Move column in DOM before API call
          var board = document.querySelector('.kanban-board');
          var allColumns = Array.from(board.querySelectorAll('.column'));
          var targetIndex = allColumns.indexOf(column);
          var draggedIndex = allColumns.indexOf(draggedColumn);
          
          if (targetIndex > draggedIndex) {
            column.after(draggedColumn);
          } else {
            column.before(draggedColumn);
          }
          
          // Calculate new order_index (0-based position)
          var newOrderIndex = Array.from(board.querySelectorAll('.column')).indexOf(draggedColumn);
          
          // Call API to persist move
          fetch('/api/columns/' + draggedId + '/move', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: newOrderIndex })
          }).then(function(res) {
            if (!res.ok) {
              console.error('Failed to move column');
            }
          }).catch(function(err) {
            console.error('Error moving column:', err);
          });
        }
      });
    });
    
    // Card action buttons (edit/delete) - using event delegation for all cards including dynamic
    document.querySelector('.kanban-board').addEventListener('click', function(e) {
      var btn = e.target.closest('.edit-card-btn');
      if (!btn) return;
      
      e.stopPropagation();
      var cardId = btn.dataset.cardId;
      var card = btn.closest('.card');
      var titleEl = card.querySelector('h4');
      var descEl = card.querySelector('p');
      var currentTitle = titleEl ? titleEl.textContent : '';
      var currentDesc = descEl ? descEl.textContent : '';
      
      var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Title *</label>' +
        '<input id="edit-card-title" value="' + currentTitle.replace(/"/g, '&quot;') + '" maxlength="200" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;margin-bottom:16px;">' +
        '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Description</label>' +
        '<textarea id="edit-card-desc" style="width:100%;min-height:100px;resize:vertical;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">' + currentDesc + '</textarea>';
      
      showModal('Edit Card', content, function() {
        var newTitle = document.getElementById('edit-card-title').value.trim();
        var newDesc = document.getElementById('edit-card-desc').value.trim();
        if (newTitle) {
          fetch('/api/cards/' + cardId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, description: newDesc || null })
          }).then(function(res) {
            if (res.ok) {
              if (titleEl) titleEl.textContent = newTitle;
              if (newDesc) {
                if (descEl) {
                  descEl.innerHTML = linkify(newDesc);
                } else {
                  var p = document.createElement('p');
                  p.style.cssText = 'margin:0;color:#6c7086;font-size:12px;overflow-wrap:break-word;white-space:pre-wrap;';
                  p.innerHTML = linkify(newDesc);
                  card.appendChild(p);
                }
              } else if (descEl) {
                descEl.remove();
              }
            } else console.error('Failed to update card:', res.status);
          }).catch(function(err) {
            console.error('Error updating card:', err);
          });
        }
      }, 'Save');
    });
    
    // Delete card buttons - using event delegation
    document.querySelector('.kanban-board').addEventListener('click', function(e) {
      var btn = e.target.closest('.delete-card-btn');
      if (!btn) return;
      
      e.stopPropagation();
      var cardId = btn.dataset.cardId;
      var card = btn.closest('.card');
      var column = card.closest('.column');
      var columnId = column.dataset.columnId;
      
      showModal('Delete Card', '<p style="color:#cdd6f4;margin:0;">Are you sure you want to delete this card?</p><p style="color:#a6adc8;font-size:12px;margin:8px 0 0 0;">This action cannot be undone.</p>', function() {
        fetch('/api/cards/' + cardId, { method: 'DELETE' })
          .then(function(res) {
            if (res.ok) {
              card.remove();
              updateCardCount(columnId, -1);
            } else console.error('Failed to delete card:', res.status);
          })
          .catch(function(err) { console.error('Error deleting card:', err); });
      }, 'Delete', 'Cancel');
    });
    
    document.querySelectorAll('.column-cards').forEach(function(container) {
      container.addEventListener('dragover', function(e) {
        e.preventDefault();
        container.classList.add('drag-over');
      });
      container.addEventListener('dragleave', function() {
        container.classList.remove('drag-over');
      });
      container.addEventListener('drop', function(e) {
        e.preventDefault();
        container.classList.remove('drag-over');
        var cardId = e.dataTransfer.getData('text/plain');
        var columnId = container.closest('.column').dataset.columnId;
        var draggedEl = document.querySelector('.card[data-card-id="' + cardId + '"]');
        // Get old column BEFORE moving the element
        var oldColumn = draggedEl ? draggedEl.closest('.column') : null;
        var oldColId = oldColumn ? oldColumn.dataset.columnId : null;
        
        fetch('/api/cards/' + cardId + '/move', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column_id: columnId, order_index: 0 })
        }).then(function(res) {
          if (res.ok) {
            // Move card in DOM to new column (prepend)
            if (draggedEl) {
              draggedEl.style.opacity = '1';
              container.insertBefore(draggedEl, container.firstChild);
              // Update counts - increment new, decrement old (if different)
              updateCardCount(columnId, 1);
              if (oldColId && oldColId !== columnId) {
                updateCardCount(oldColId, -1);
              }
            }
          } else console.error('Failed to move card:', res.status);
        }).catch(function(err) {
          console.error('Error moving card:', err);
        });
      });
    });

    // Add Card buttons - styled modal
    document.querySelectorAll('.add-card-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var columnId = btn.dataset.columnId;
        var container = btn.closest('.column').querySelector('.column-cards');
        var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Title *</label>' +
          '<input id="card-title" maxlength="200" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;margin-bottom:16px;">' +
          '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Description</label>' +
          '<textarea id="card-desc" style="width:100%;min-height:100px;resize:vertical;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;"></textarea>';
        showModal('Create Card', content, function() {
          var title = document.getElementById('card-title').value.trim();
          var desc = document.getElementById('card-desc').value.trim();
          if (title) {
            fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: title, description: desc || null, column_id: columnId })
            }).then(function(res) {
              if (res.ok) return res.json();
              else throw new Error('Failed to create');
            }).then(function(card) {
              // Create card element and append to column
              var cardEl = document.createElement('div');
              cardEl.className = 'card';
              cardEl.dataset.cardId = card.id;
              cardEl.draggable = true;
              cardEl.style.cssText = 'background:#1e1e2e;border-radius:6px;padding:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:grab;position:relative;';
              var descHtml = card.description ? '<p style="margin:0;color:#6c7086;font-size:12px;overflow-wrap:break-word;white-space:pre-wrap;">' + linkify(card.description) + '</p>' : '';
              cardEl.innerHTML = '<button class="edit-card-btn" data-card-id="' + card.id + '" style="position:absolute;top:8px;right:8px;background:#1e1e2e;border:none;color:#6c7086;cursor:pointer;font-size:14px;padding:4px;border-radius:4px;opacity:0;transition:opacity 0.2s;z-index:10;pointer-events:auto;" title="Edit card"><span style=\"pointer-events:none;\">✏️</span></button>' +
                '<button class="delete-card-btn" data-card-id="' + card.id + '" style="position:absolute;top:8px;right:32px;background:#1e1e2e;border:none;color:#f38ba8;cursor:pointer;font-size:14px;padding:4px;border-radius:4px;opacity:0;transition:opacity 0.2s;z-index:10;pointer-events:auto;" title="Delete card"><span style=\"pointer-events:none;\">🗑️</span></button>' +
                '<h4 style="margin:0 0 4px 0;color:#cdd6f4;font-size:14px;padding-right:48px;">' + card.title + '</h4>' + descHtml;
              
              // Add drag handlers
              cardEl.addEventListener('dragstart', function(e) {
                e.stopPropagation(); // Prevent column drag from triggering
                draggedCard = cardEl;
                cardEl.style.opacity = '0.5';
                e.dataTransfer.setData('text/plain', card.id);
                e.dataTransfer.effectAllowed = 'move';
              });
              cardEl.addEventListener('dragend', function(e) {
                e.stopPropagation(); // Prevent column dragend from triggering
                cardEl.style.opacity = '1';
                draggedCard = null;
              });
              
              // Add edit/delete handlers for this card
              cardEl.querySelector('.edit-card-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                var titleEl = cardEl.querySelector('h4');
                var descEl = cardEl.querySelector('p');
                var currentTitle = titleEl ? titleEl.textContent : '';
                var currentDesc = descEl ? descEl.textContent : '';
                
                var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Title *</label>' +
                  '<input id="edit-card-title-existing" value="' + currentTitle.replace(/"/g, '&quot;') + '" maxlength="200" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;margin-bottom:16px;">' +
                  '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Description</label>' +
                  '<textarea id="edit-card-desc-existing" style="width:100%;min-height:100px;resize:vertical;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">' + currentDesc + '</textarea>';
                
                showModal('Edit Card', content, function() {
                  var newTitle = document.getElementById('edit-card-title-existing').value.trim();
                  var newDesc = document.getElementById('edit-card-desc-existing').value.trim();
                  if (newTitle) {
                    fetch('/api/cards/' + card.id, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: newTitle, description: newDesc || null })
                    }).then(function(res) {
                      if (res.ok) {
                        if (titleEl) titleEl.textContent = newTitle;
                        if (newDesc) {
                          if (descEl) descEl.innerHTML = linkify(newDesc);
                          else {
                            var p = document.createElement('p');
                            p.style.cssText = 'margin:0;color:#6c7086;font-size:12px;overflow-wrap:break-word;white-space:pre-wrap;';
                            p.innerHTML = linkify(newDesc);
                            cardEl.appendChild(p);
                          }
                        } else if (descEl) descEl.remove();
                      }
                    });
                  }
                }, 'Save');
              });
              
              cardEl.querySelector('.delete-card-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                showModal('Delete Card', '<p style="color:#cdd6f4;margin:0;">Are you sure?</p>', function() {
                  fetch('/api/cards/' + card.id, { method: 'DELETE' })
                    .then(function(res) {
                      if (res.ok) {
                        cardEl.remove();
                        updateCardCount(columnId, -1);
                      }
                    });
                }, 'Delete', 'Cancel');
              });
              
              container.appendChild(cardEl);
              updateCardCount(columnId, 1);
            }).catch(function(err) {
              console.error('Error creating card:', err);
            });
          }
        }, 'Create');
      });
    });

    // Add Column button - styled modal
    document.getElementById('add-column').addEventListener('click', function() {
      var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Column Name *</label>' +
        '<input id="col-name" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">';
      showModal('Create Column', content, function() {
        var name = document.getElementById('col-name').value.trim();
        if (name) {
          fetch('/api/columns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
          }).then(function(res) {
            if (res.ok) return res.json();
            else throw new Error('Failed to create');
          }).then(function(col) {
            // Create column element and insert before Add Column button
            var colHtml = '<div class="column" data-column-id="' + col.id + '" style="background:#313244;border-radius:8px;min-width:280px;max-width:280px;display:flex;flex-direction:column;max-height:calc(100vh - 32px);">' +
              '<div class="column-header" style="padding:12px 16px;border-bottom:1px solid #1e1e2e;display:flex;justify-content:space-between;align-items:center;position:relative;">' +
                '<span class="column-name" data-column-id="' + col.id + '" style="margin:0;color:#cdd6f4;font-size:14px;font-weight:600;padding-right:80px;">' + col.name + '</span>' +
                '<div style="display:flex;align-items:center;gap:8px;position:absolute;right:16px;">' +
                  '<button class="edit-column-btn" data-column-id="' + col.id + '" style="background:transparent;border:none;color:#6c7086;cursor:pointer;font-size:14px;opacity:0;transition:opacity 0.2s;padding:4px;border-radius:4px;" title="Edit column">✏️</button>' +
                  '<button class="delete-column-btn" data-column-id="' + col.id + '" style="background:transparent;border:none;color:#f38ba8;cursor:pointer;font-size:14px;opacity:0;transition:opacity 0.2s;padding:4px;border-radius:4px;" title="Delete column">🗑️</button>' +
                  '<span id="count-' + col.id + '" style="background:#313244;color:#89b4fa;border-radius:10px;padding:2px 8px;font-size:12px;">0</span>' +
                '</div>' +
              '</div>' +
              '<div class="column-cards" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;"></div>' +
              '<button class="add-card-btn" data-column-id="' + col.id + '" style="background:transparent;border:none;color:#6c7086;padding:12px;cursor:pointer;font-size:12px;text-align:left;">+ Add Card</button>' +
            '</div>';
            var temp = document.createElement('div');
            temp.innerHTML = colHtml;
            var newCol = temp.firstChild;
            var board = document.querySelector('.kanban-board');
            var addBtn = document.getElementById('add-column');
            board.insertBefore(newCol, addBtn);
            
            // Wire up drop zone
            var cardsContainer = newCol.querySelector('.column-cards');
            cardsContainer.addEventListener('dragover', function(e) {
              e.preventDefault();
              cardsContainer.classList.add('drag-over');
            });
            cardsContainer.addEventListener('dragleave', function() {
              cardsContainer.classList.remove('drag-over');
            });
            cardsContainer.addEventListener('drop', function(e) {
              e.preventDefault();
              cardsContainer.classList.remove('drag-over');
              var cardId = e.dataTransfer.getData('text/plain');
              var draggedEl = document.querySelector('.card[data-card-id="' + cardId + '"]');
              fetch('/api/cards/' + cardId + '/move', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column_id: col.id, order_index: 0 })
              }).then(function(res) {
                if (res.ok) {
                  if (draggedEl) {
                    draggedEl.style.opacity = '1';
                    cardsContainer.insertBefore(draggedEl, cardsContainer.firstChild);
                    updateCardCount(col.id, 1);
                    var oldColumn = draggedEl.closest('.column');
                    if (oldColumn) {
                      var oldColId = oldColumn.dataset.columnId;
                      if (oldColId !== col.id) updateCardCount(oldColId, -1);
                    }
                  }
                } else console.error('Failed to move card:', res.status);
              });
            });
            
            // Wire up add card button
            newCol.querySelector('.add-card-btn').addEventListener('click', function() {
              var content2 = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Title *</label>' +
                '<input id="card-title-' + col.id + '" maxlength="200" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;margin-bottom:16px;">' +
                '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Description</label>' +
                '<textarea id="card-desc-' + col.id + '" style="width:100%;min-height:100px;resize:vertical;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;"></textarea>';
              showModal('Create Card', content2, function() {
                var title = document.getElementById('card-title-' + col.id).value.trim();
                var desc = document.getElementById('card-desc-' + col.id).value.trim();
                if (title) {
                  fetch('/api/cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title, description: desc || null, column_id: col.id })
                  }).then(function(r) { return r.json(); }).then(function(card) {
                    var cardEl = document.createElement('div');
                    cardEl.className = 'card'; cardEl.dataset.cardId = card.id;
                    cardEl.draggable = true;
                    cardEl.style.cssText = 'background:#1e1e2e;border-radius:6px;padding:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:grab;position:relative;';
                    var descHtml = card.description ? '<p style="margin:0;color:#6c7086;font-size:12px;white-space:pre-wrap;">' + linkify(card.description) + '</p>' : '';
                    cardEl.innerHTML = '<button class="edit-card-btn" data-card-id="' + card.id + '" style="position:absolute;top:8px;right:8px;background:#1e1e2e;border:none;color:#6c7086;cursor:pointer;font-size:14px;padding:4px;border-radius:4px;opacity:0;transition:opacity 0.2s;z-index:10;pointer-events:auto;" title="Edit card"><span style=\"pointer-events:none;\">✏️</span></button>' +
                      '<button class="delete-card-btn" data-card-id="' + card.id + '" style="position:absolute;top:8px;right:32px;background:#1e1e2e;border:none;color:#f38ba8;cursor:pointer;font-size:14px;padding:4px;border-radius:4px;opacity:0;transition:opacity 0.2s;z-index:10;pointer-events:auto;" title="Delete card"><span style=\"pointer-events:none;\">🗑️</span></button>' +
                      '<h4 style="margin:0 0 4px 0;color:#cdd6f4;font-size:14px;padding-right:48px;">' + card.title + '</h4>' + descHtml;
                    cardEl.addEventListener('dragstart', function(e) {
                      e.stopPropagation(); // Prevent column drag from triggering
                      draggedCard = cardEl;
                      cardEl.style.opacity='0.5';
                      e.dataTransfer.setData('text/plain', card.id);
                      e.dataTransfer.effectAllowed = 'move';
                    });
                    cardEl.addEventListener('dragend', function(e) {
                      e.stopPropagation(); // Prevent column dragend from triggering
                      cardEl.style.opacity='1';
                      draggedCard = null;
                    });
                    
                    // Explicit handlers for dynamic cards (event delegation backup)
                    cardEl.querySelector('.edit-card-btn').addEventListener('click', function(e) {
                      e.stopPropagation();
                      var btn = e.currentTarget;
                      var cardId = btn.dataset.cardId;
                      var titleEl2 = cardEl.querySelector('h4');
                      var descEl2 = cardEl.querySelector('p');
                      var currentTitle2 = titleEl2 ? titleEl2.textContent : '';
                      var currentDesc2 = descEl2 ? descEl2.textContent : '';
                      
                      var content2 = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Title *</label>' +
                        '<input id="edit-card-title-dyn" value="' + currentTitle2.replace(/"/g, '&quot;') + '" maxlength="200" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;margin-bottom:16px;">' +
                        '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Description</label>' +
                        '<textarea id="edit-card-desc-dyn" style="width:100%;min-height:100px;resize:vertical;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">' + currentDesc2 + '</textarea>';
                      
                      showModal('Edit Card', content2, function() {
                        var newTitle2 = document.getElementById('edit-card-title-dyn').value.trim();
                        var newDesc2 = document.getElementById('edit-card-desc-dyn').value.trim();
                        if (newTitle2) {
                          fetch('/api/cards/' + cardId, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: newTitle2, description: newDesc2 || null })
                          }).then(function(res) {
                            if (res.ok) {
                              if (titleEl2) titleEl2.textContent = newTitle2;
                              if (newDesc2) {
                                if (descEl2) descEl2.innerHTML = linkify(newDesc2);
                                else {
                                  var p2 = document.createElement('p');
                                  p2.style.cssText = 'margin:0;color:#6c7086;font-size:12px;overflow-wrap:break-word;white-space:pre-wrap;';
                                  p2.innerHTML = linkify(newDesc2);
                                  cardEl.appendChild(p2);
                                }
                              } else if (descEl2) descEl2.remove();
                            }
                          });
                        }
                      }, 'Save');
                    });
                    
                    cardEl.querySelector('.delete-card-btn').addEventListener('click', function(e) {
                      e.stopPropagation();
                      var btn = e.currentTarget;
                      var cardId = btn.dataset.cardId;
                      showModal('Delete Card', '<p style="color:#cdd6f4;margin:0;">Are you sure?</p>', function() {
                        fetch('/api/cards/' + cardId, { method: 'DELETE' })
                          .then(function(res) {
                            if (res.ok) {
                              cardEl.remove();
                              updateCardCount(col.id, -1);
                            }
                          });
                      }, 'Delete', 'Cancel');
                    });
                    
                    cardsContainer.appendChild(cardEl);
                    updateCardCount(col.id, 1);
                  });
                }
              }, 'Create');
            });
            
            // Wire up delete column button for new column
            newCol.querySelector('.delete-column-btn').addEventListener('click', function() {
              var cardCount = parseInt(document.getElementById('count-' + col.id).textContent || '0');
              var content = '<p style="color:#cdd6f4;margin:0;">Are you sure you want to delete this column?</p>' +
                '<p style="color:#a6adc8;font-size:12px;margin:8px 0 0 0;">This will also delete ' + cardCount + ' card' + (cardCount !== 1 ? 's' : '') + '. This action cannot be undone.</p>';
              showModal('Delete Column', content, function() {
                fetch('/api/columns/' + col.id, { method: 'DELETE' })
                  .then(function(res) {
                    if (res.ok) {
                      newCol.remove();
                    } else {
                      console.error('Failed to delete column:', res.status);
                      showModal('Cannot Delete', '<p style="color:#f38ba8;">Cannot delete the last column. At least one column must remain.</p>', function() {}, 'OK', null);
                    }
                  })
                  .catch(function(err) { console.error('Error deleting column:', err); });
              }, 'Delete', 'Cancel');
            });
            
            // Wire up edit column button for new column
            newCol.querySelector('.edit-column-btn').addEventListener('click', function() {
              var nameEl = newCol.querySelector('.column-name');
              var currentName = nameEl ? nameEl.textContent : '';
              
              var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Column Name *</label>' +
                '<input id="edit-column-name-dyn" value="' + currentName.replace(/"/g, '&quot;') + '" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">';
              
              showModal('Edit Column', content, function() {
                var newName = document.getElementById('edit-column-name-dyn').value.trim();
                if (newName && newName !== currentName) {
                  fetch('/api/columns/' + col.id, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                  }).then(function(res) {
                    if (res.ok) {
                      if (nameEl) nameEl.textContent = newName;
                    } else console.error('Failed to rename column:', res.status);
                  }).catch(function(err) {
                    console.error('Error renaming column:', err);
                  });
                }
              }, 'Save');
            });
          }).catch(function(err) {
            console.error('Error creating column:', err);
          });
        }
      }, 'Create');
    });
    
    // Edit column buttons
    document.querySelectorAll('.edit-column-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var columnId = btn.dataset.columnId;
        var columnEl = btn.closest('.column');
        var nameEl = columnEl.querySelector('.column-name');
        var currentName = nameEl ? nameEl.textContent : '';
        
        var content = '<label style="color:#a6adc8;font-size:12px;display:block;margin-bottom:4px;">Column Name *</label>' +
          '<input id="edit-column-name" value="' + currentName.replace(/"/g, '&quot;') + '" style="width:100%;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:8px 12px;box-sizing:border-box;">';
        
        showModal('Edit Column', content, function() {
          var newName = document.getElementById('edit-column-name').value.trim();
          if (newName && newName !== currentName) {
            fetch('/api/columns/' + columnId, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName })
            }).then(function(res) {
              if (res.ok) {
                if (nameEl) nameEl.textContent = newName;
              } else console.error('Failed to rename column:', res.status);
            }).catch(function(err) {
              console.error('Error renaming column:', err);
            });
          }
        }, 'Save');
      });
    });
    
    // Delete column buttons
    document.querySelectorAll('.delete-column-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var columnId = btn.dataset.columnId;
        var columnEl = btn.closest('.column');
        var cardCount = parseInt(document.getElementById('count-' + columnId).textContent || '0');
        
        var content = '<p style="color:#cdd6f4;margin:0;">Are you sure you want to delete this column?</p>' +
          '<p style="color:#a6adc8;font-size:12px;margin:8px 0 0 0;">This will also delete ' + cardCount + ' card' + (cardCount !== 1 ? 's' : '') + '. This action cannot be undone.</p>';
        
        showModal('Delete Column', content, function() {
          fetch('/api/columns/' + columnId, {
            method: 'DELETE'
          }).then(function(res) {
            if (res.ok) {
              // Remove column from DOM
              if (columnEl) columnEl.remove();
            } else {
              console.error('Failed to delete column:', res.status);
              showModal('Cannot Delete', '<p style="color:#f38ba8;">Cannot delete the last column. At least one column must remain.</p>', function() {}, 'OK', null);
            }
          }).catch(function(err) {
            console.error('Error deleting column:', err);
          });
        }, 'Delete', 'Cancel');
      });
    });
    
    // Update card count badge
    function updateCardCount(columnId, delta) {
      var badge = document.getElementById('count-' + columnId);
      if (badge) {
        var count = parseInt(badge.textContent || '0') + delta;
        badge.textContent = count;
      }
    }
  </script>
</body>
</html>`;
}

// Phoenix traceability
export const _phoenix = {
  iu_id: 'c39c81f09beb196ea6fbe628b281f5e941b968fb5598f0087d68b4fd4360ce16',
  name: 'Ui',
  risk_tier: 'high'
} as const;
