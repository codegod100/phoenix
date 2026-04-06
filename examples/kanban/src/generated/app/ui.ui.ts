// Generated from IU: UI (da1d8be46d7fb8ef67fd090f86bdba67e5264ebae258bea5b6380b706183bd6f)
// Source: spec/app.md - UI section
// Dependencies: Cards, Design System

import { DesignSystem, Theme } from './design-system.ui';
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
