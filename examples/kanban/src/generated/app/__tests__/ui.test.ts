// Generated tests for UI IU: c39c81f09beb196ea6fbe628b281f5e941b968fb5598f0087d68b4fd4360ce16

import { describe, it, expect, beforeEach } from 'bun:test';
import { renderPage } from '../ui.ui';
import { getBoard } from '../api';
import { initDatabase, seedDefaultColumns } from '../database';

describe('UI', () => {
  beforeEach(() => {
    initDatabase();
    seedDefaultColumns();
  });

  describe('renderPage', () => {
    it('should return HTML string', () => {
      const board = getBoard();
      const html = renderPage(board);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should contain board HTML structure', () => {
      const board = getBoard();
      const html = renderPage(board);
      expect(html).toContain('kanban-board');
      expect(html).toContain('column');
    });

    it('should include modal styles', () => {
      const board = getBoard();
      const html = renderPage(board);
      expect(html).toContain('modal');
    });
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: 'c39c81f09beb196ea6fbe628b281f5e941b968fb5598f0087d68b4fd4360ce16',
  name: 'Ui',
  risk_tier: 'high'
} as const;
