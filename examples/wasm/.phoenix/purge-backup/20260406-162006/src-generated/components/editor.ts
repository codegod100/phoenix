/**
 * Editor Component
 * IU-4d8f6c3e: Editor Component (HIGH)
 * 
 * node-e4c9a7f2: Editable title field and content textarea
 * node-3f7c9e4b: Delete button with confirmation dialog
 * node-a5d8e3c6: Auto-save 500ms after typing stops
 * node-f7c3a9e5: Monospaced font for content textarea
 * node-8a4e6c3b: System font for titles
 * node-d4f9c3e7: Error logging with [notes-app] prefix
 */

import { Note, validateTitle } from '../types.js';

export interface EditorCallbacks {
  onSave: (id: number, title: string, content: string) => Promise<void>;
  onDelete: (id: number) => void;
}

export interface Editor {
  element: HTMLElement;
  setNote(note: Note | null): void;
  getCurrentNoteId(): number | null;
  hasUnsavedChanges(): boolean;
}

/**
 * Create editor UI component
 */
export function createEditor(container: HTMLElement, callbacks: EditorCallbacks): Editor {
  let currentNote: Note | null = null;
  let hasChanges = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Main container
  const element = document.createElement('div');
  element.className = 'editor';
  element.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
  `;

  // Header with delete button
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
  `;

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'Note title';
  titleInput.style.cssText = `
    flex: 1;
    font-size: 18px;
    font-weight: 500;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: none;
    outline: none;
    background: transparent;
    margin-right: 16px;
  `;
  titleInput.oninput = () => {
    hasChanges = true;
    scheduleSave();
  };

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.style.cssText = `
    padding: 6px 12px;
    background: transparent;
    color: #d93025;
    border: 1px solid #d93025;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  deleteButton.onmouseover = () => {
    deleteButton.style.background = '#fce8e8';
  };
  deleteButton.onmouseout = () => {
    deleteButton.style.background = 'transparent';
  };
  
  // node-3f7c9e4b: Delete button with confirmation
  deleteButton.onclick = () => {
    if (!currentNote) return;
    
    const confirmed = confirm(`Delete "${currentNote.title || 'Untitled'}"? This cannot be undone.`);
    if (confirmed) {
      console.log('[notes-app] Deleting note:', currentNote.id);
      callbacks.onDelete(currentNote.id);
    }
  };

  header.appendChild(titleInput);
  header.appendChild(deleteButton);

  // Content textarea
  // node-f7c3a9e5: Monospaced font for content textarea
  const contentArea = document.createElement('textarea');
  contentArea.placeholder = 'Start typing...';
  contentArea.style.cssText = `
    flex: 1;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: white;
  `;
  contentArea.oninput = () => {
    hasChanges = true;
    scheduleSave();
  };

  element.appendChild(header);
  element.appendChild(contentArea);
  container.appendChild(element);

  /**
   * node-a5d8e3c6: Auto-save 500ms after typing stops
   */
  function scheduleSave(): void {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      if (currentNote && hasChanges) {
        const title = titleInput.value.trim();
        const validation = validateTitle(title);
        
        if (!validation.valid) {
          console.error('[notes-app] Validation error:', validation.error);
          return;
        }

        try {
          await callbacks.onSave(currentNote.id, title, contentArea.value);
          hasChanges = false;
          console.log('[notes-app] Note saved:', currentNote.id);
        } catch (err) {
          console.error('[notes-app] Save failed:', err);
        }
      }
    }, 500);
  }

  return {
    element,
    setNote(note: Note | null) {
      // Save any pending changes before switching
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        if (currentNote && hasChanges) {
          // Trigger immediate save
          const title = titleInput.value.trim();
          if (title) {
            callbacks.onSave(currentNote.id, title, contentArea.value).catch(err => {
              console.error('[notes-app] Auto-save on switch failed:', err);
            });
          }
        }
      }

      currentNote = note;
      hasChanges = false;

      if (note) {
        titleInput.value = note.title;
        contentArea.value = note.content;
        titleInput.disabled = false;
        contentArea.disabled = false;
        deleteButton.style.display = 'block';
      } else {
        titleInput.value = '';
        contentArea.value = '';
        titleInput.disabled = true;
        contentArea.disabled = true;
        deleteButton.style.display = 'none';
      }
    },
    getCurrentNoteId() {
      return currentNote?.id || null;
    },
    hasUnsavedChanges() {
      return hasChanges;
    },
  };
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '4d8f6c3e7a5f4d8f6c3e7a5f4d8f6c3e7a5f4d8f6c3e7a5f4d8f6c3e7a5f4d8',
  name: 'Editor Component',
  risk_tier: 'high',
  requirements: [
    'node-e4c9a7f2',
    'node-3f7c9e4b',
    'node-a5d8e3c6',
    'node-f7c3a9e5',
    'node-8a4e6c3b',
    'node-d4f9c3e7',
  ],
} as const;
