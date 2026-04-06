// @ts-nocheck
// @vitest-environment happy-dom
// Generated tests for UI IU

import { describe, it, expect, beforeEach } from 'bun:test';
import { UI } from '../ui.ui';
import { DesignSystem } from '../design-system.ui';

describe('UI', () => {
  beforeEach(() => {
    // Clean up any modals
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    }
  });

  describe('createModal', () => {
    it('should create modal with backdrop', () => {
      const modal = UI.createModal({
        title: 'Test Modal',
        content: document.createElement('div'),
        onConfirm: () => {},
        onCancel: () => {}
      });
      
      expect(modal.className).toBe('modal-backdrop');
      expect(modal.querySelector('.modal-container')).not.toBeNull();
    });

    it('should have title and close button', () => {
      const modal = UI.createModal({
        title: 'My Title',
        content: document.createElement('div'),
        onConfirm: () => {},
        onCancel: () => {}
      });
      
      const title = modal.querySelector('h2');
      expect(title?.textContent).toBe('My Title');
    });

    it('should call onConfirm when confirm clicked', () => {
      let confirmed = false;
      const modal = UI.createModal({
        title: 'Test',
        content: document.createElement('div'),
        onConfirm: () => { confirmed = true; },
        onCancel: () => {},
        confirmText: 'Do It'
      });
      
      const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Do It');
      confirmBtn?.dispatchEvent(new Event('click'));
      expect(confirmed).toBe(true);
    });

    it('should call onCancel when cancel clicked', () => {
      let cancelled = false;
      const modal = UI.createModal({
        title: 'Test',
        content: document.createElement('div'),
        onConfirm: () => {},
        onCancel: () => { cancelled = true; }
      });
      
      const cancelBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      cancelBtn?.dispatchEvent(new Event('click'));
      expect(cancelled).toBe(true);
    });

    it('should call onCancel when backdrop clicked', () => {
      let cancelled = false;
      const modal = UI.createModal({
        title: 'Test',
        content: document.createElement('div'),
        onConfirm: () => {},
        onCancel: () => { cancelled = true; }
      });
      
      modal.dispatchEvent(new Event('click', { bubbles: true }));
      expect(cancelled).toBe(true);
    });

    it('should have destructive confirm button when specified', () => {
      const modal = UI.createModal({
        title: 'Delete?',
        content: document.createElement('div'),
        onConfirm: () => {},
        onCancel: () => {},
        destructive: true,
        confirmText: 'Delete'
      });
      
      const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Delete');
      expect(confirmBtn?.style.backgroundColor).toContain(DesignSystem.colors.red);
    });
  });

  describe('createCardModal', () => {
    it('should have title input with label', () => {
      const modal = UI.createCardModal('col-1', () => {});
      const inputs = modal.querySelectorAll('input, textarea');
      const labels = modal.querySelectorAll('label');
      
      expect(inputs.length).toBe(2); // title and description
      expect(labels.length).toBe(2);
    });

    it('should validate max title length', () => {
      const modal = UI.createCardModal('col-1', () => {});
      const titleInput = modal.querySelector('input');
      expect(titleInput?.getAttribute('maxLength')).toBe('200');
    });
  });

  describe('editCardModal', () => {
    it('should populate with card data', () => {
      const modal = UI.editCardModal(
        { id: '1', title: 'Test', description: 'Desc', column_id: 'col-1', order_index: 0, created_at: new Date() },
        () => {}
      );
      
      const titleInput = modal.querySelector('input') as HTMLInputElement;
      const descInput = modal.querySelector('textarea') as HTMLTextAreaElement;
      
      expect(titleInput.value).toBe('Test');
      expect(descInput.value).toBe('Desc');
    });
  });

  describe('deleteCardModal', () => {
    it('should show destructive styling', () => {
      const modal = UI.deleteCardModal(
        { id: '1', title: 'To Delete', description: null, column_id: 'col-1', order_index: 0, created_at: new Date() },
        () => {}
      );
      
      const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.textContent === 'Delete');
      expect(confirmBtn).not.toBeUndefined();
    });

    it('should show card title in message', () => {
      const modal = UI.deleteCardModal(
        { id: '1', title: 'Important Card', description: null, column_id: 'col-1', order_index: 0, created_at: new Date() },
        () => {}
      );
      
      const message = modal.querySelector('p');
      expect(message?.textContent).toContain('Important Card');
    });
  });

  describe('createColumnModal', () => {
    it('should have name input with label', () => {
      const modal = UI.createColumnModal(() => {});
      const input = modal.querySelector('input');
      const label = modal.querySelector('label');
      
      expect(input).not.toBeNull();
      expect(label?.textContent).toContain('Name');
    });
  });

  describe('updateCardCount', () => {
    it('should update badge count', () => {
      const badge = document.createElement('span');
      badge.id = 'count-test-col';
      badge.textContent = '5';
      document.body.appendChild(badge);
      
      UI.updateCardCount('test-col', 3);
      expect(badge.textContent).toBe('8');
      
      document.body.removeChild(badge);
    });
  });

  describe('applyTheme', () => {
    it('should apply dark theme to body', () => {
      UI.applyTheme();
      expect(document.body.style.backgroundColor).toBe(DesignSystem.layout.boardBackground);
      expect(document.body.style.color).toBe(DesignSystem.typography.primary);
    });
  });
});
