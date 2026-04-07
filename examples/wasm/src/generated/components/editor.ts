/**
 * Editor Component
 * IU: 4d8f6c3e - Editor Component (HIGH)
 *
 * Main editor area for viewing and editing notes.
 * Auto-save with debounce, delete confirmation, and status display.
 */

import type { Note, UpdateNoteInput, validateTitle } from '../types';

/** Auto-save delay in milliseconds */
const AUTO_SAVE_DELAY_MS = 500;

/** Maximum retry attempts for save operations */
const MAX_SAVE_RETRIES = 3;

/**
 * Callback types for editor events.
 */
export type SaveCallback = (id: number, input: UpdateNoteInput) => Promise<void>;
export type DeleteCallback = (id: number) => Promise<void>;

/**
 * Editor component for note viewing and editing.
 */
export class Editor {
  private element: HTMLElement | null = null;
  private titleInput: HTMLInputElement | null = null;
  private contentTextarea: HTMLTextAreaElement | null = null;
  private header: HTMLElement | null = null;
  private saveTimeout: number | null = null;
  private currentNote: Note | null = null;
  private hasChanges = false;
  private saveAttempts = 0;

  constructor(
    private container: HTMLElement,
    private onSave: SaveCallback,
    private onDelete: DeleteCallback,
    private onStatusChange: (status: 'saving' | 'saved' | 'error', message?: string) => void
  ) {}

  /**
   * Renders the editor into the container.
   */
  render(): void {
    this.element = document.createElement('main');
    this.element.className = 'editor';

    // Header with title and delete button
    this.header = document.createElement('div');
    this.header.className = 'editor-header';

    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title';
    this.header.appendChild(titleLabel);

    this.titleInput = document.createElement('input');
    this.titleInput.type = 'text';
    this.titleInput.className = 'note-title-input';
    this.titleInput.placeholder = 'Note title...';
    this.titleInput.maxLength = 200;
    this.titleInput.oninput = () => this.onInput();
    this.header.appendChild(this.titleInput);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = '🗑️ Delete';
    deleteButton.onclick = () => this.confirmDelete();
    this.header.appendChild(deleteButton);

    this.element.appendChild(this.header);

    // Content textarea
    const contentLabel = document.createElement('label');
    contentLabel.textContent = 'Content';
    this.element.appendChild(contentLabel);

    this.contentTextarea = document.createElement('textarea');
    this.contentTextarea.className = 'note-content-textarea';
    this.contentTextarea.placeholder = 'Start writing...';
    this.contentTextarea.oninput = () => this.onInput();
    this.element.appendChild(this.contentTextarea);

    // Empty state message
    const emptyState = document.createElement('div');
    emptyState.className = 'editor-empty-state';
    emptyState.textContent = 'Select a note to edit, or create a new note';
    this.element.appendChild(emptyState);

    this.container.appendChild(this.element);
  }

  /**
   * Loads a note into the editor.
   *
   * @param note - Note to edit, or null for empty state
   */
  loadNote(note: Note | null): void {
    this.currentNote = note;
    this.hasChanges = false;
    this.saveAttempts = 0;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (!note) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    if (this.titleInput) {
      this.titleInput.value = note.title;
      this.titleInput.disabled = false;
    }

    if (this.contentTextarea) {
      this.contentTextarea.value = note.content;
      this.contentTextarea.disabled = false;
    }

    this.updateHeaderVisibility(true);
  }

  /**
   * Clears the editor and shows empty state.
   */
  clear(): void {
    this.loadNote(null);
  }

  /**
   * Gets the current note ID being edited.
   */
  getCurrentNoteId(): number | null {
    return this.currentNote?.id || null;
  }

  /**
   * Checks if there are unsaved changes.
   */
  hasUnsavedChanges(): boolean {
    return this.hasChanges;
  }

  /**
   * Forces immediate save of current note.
   */
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.performSave();
  }

  /**
   * Handles input changes with debounced auto-save.
   */
  private onInput(): void {
    this.hasChanges = true;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.onStatusChange('saving');

    // Set new timeout for auto-save
    this.saveTimeout = window.setTimeout(() => {
      this.performSave();
    }, AUTO_SAVE_DELAY_MS);
  }

  /**
   * Performs the actual save operation with retry logic.
   */
  private async performSave(): Promise<void> {
    if (!this.currentNote || !this.hasChanges) return;

    const title = this.titleInput?.value.trim() || '';
    const content = this.contentTextarea?.value || '';

    // Validate title
    if (!title) {
      this.onStatusChange('error', 'Title is required');
      console.error('[notes-app] Save failed: Title is required');
      return;
    }

    const input: UpdateNoteInput = { title, content };

    this.saveAttempts++;

    try {
      await this.onSave(this.currentNote.id, input);
      this.hasChanges = false;
      this.saveAttempts = 0;
      this.onStatusChange('saved');
    } catch (error) {
      console.error('[notes-app] Save failed:', error);

      if (this.saveAttempts < MAX_SAVE_RETRIES) {
        this.onStatusChange('saving', `Retrying... (${this.saveAttempts}/${MAX_SAVE_RETRIES})`);
        // Retry after delay
        setTimeout(() => this.performSave(), 500 * this.saveAttempts);
      } else {
        this.onStatusChange('error', 'Save failed after 3 attempts');
        this.saveAttempts = 0;
      }
    }
  }

  /**
   * Shows confirmation dialog for delete.
   */
  private confirmDelete(): void {
    if (!this.currentNote) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${this.currentNote.title || 'Untitled'}"?\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      this.performDelete();
    }
  }

  /**
   * Performs the delete operation.
   */
  private async performDelete(): Promise<void> {
    if (!this.currentNote) return;

    try {
      await this.onDelete(this.currentNote.id);
      this.clear();
    } catch (error) {
      console.error('[notes-app] Delete failed:', error);
      this.onStatusChange('error', 'Delete failed');
    }
  }

  /**
   * Shows the empty state message.
   */
  private showEmptyState(): void {
    if (this.titleInput) {
      this.titleInput.value = '';
      this.titleInput.disabled = true;
    }
    if (this.contentTextarea) {
      this.contentTextarea.value = '';
      this.contentTextarea.disabled = true;
    }
    this.updateHeaderVisibility(false);

    const emptyState = this.element?.querySelector('.editor-empty-state');
    if (emptyState) {
      (emptyState as HTMLElement).style.display = 'block';
    }
  }

  /**
   * Hides the empty state message.
   */
  private hideEmptyState(): void {
    const emptyState = this.element?.querySelector('.editor-empty-state');
    if (emptyState) {
      (emptyState as HTMLElement).style.display = 'none';
    }
  }

  /**
   * Updates header visibility based on note selection.
   */
  private updateHeaderVisibility(show: boolean): void {
    if (this.header) {
      this.header.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Focuses the title input.
   */
  focusTitle(): void {
    this.titleInput?.focus();
  }

  /**
   * Destroys the component and removes from DOM.
   */
  destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.titleInput = null;
    this.contentTextarea = null;
    this.header = null;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '4d8f6c3e9a7b4d8f6c3e9a7b4d8f6c3e9a7b4d8f6c3e9a7b4d8f6c3e9a7b4d8f6c3e9a7b4d8f6c3e9a7b4d8',
  name: 'Editor Component',
  risk_tier: 'high',
} as const;
