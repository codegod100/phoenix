/**
 * Sidebar Component
 * IU: 5c9a7e4f - Sidebar Component (MEDIUM)
 *
 * Navigation sidebar showing note list with search, truncation,
 * and relative timestamps. Handles note selection and creation.
 */

import type { NoteSummary } from '../types';
import { truncateText, formatRelativeTime } from '../types';

/** Maximum length for displayed titles */
const MAX_DISPLAY_TITLE_LENGTH = 40;

/**
 * Callback types for sidebar events.
 */
export type NoteSelectCallback = (noteId: number) => void;
export type NewNoteCallback = () => void;
export type SearchCallback = (query: string) => void;

/**
 * Sidebar component for displaying the note list and search.
 */
export class Sidebar {
  private element: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private noteList: HTMLElement | null = null;
  private notes: NoteSummary[] = [];
  private selectedId: number | null = null;

  constructor(
    private container: HTMLElement,
    private onSelectNote: NoteSelectCallback,
    private onNewNote: NewNoteCallback,
    private onSearch: SearchCallback
  ) {}

  /**
   * Renders the sidebar into the container.
   */
  render(): void {
    this.element = document.createElement('aside');
    this.element.className = 'sidebar';

    // Header with title and new note button
    const header = document.createElement('div');
    header.className = 'sidebar-header';

    const title = document.createElement('h2');
    title.textContent = 'Notes';
    header.appendChild(title);

    const newButton = document.createElement('button');
    newButton.className = 'new-note-btn';
    newButton.textContent = '+ New Note';
    newButton.onclick = () => this.onNewNote();
    header.appendChild(newButton);

    this.element.appendChild(header);

    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-input';
    this.searchInput.placeholder = 'Search notes...';
    this.searchInput.oninput = (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.onSearch(query);
    };

    searchContainer.appendChild(this.searchInput);
    this.element.appendChild(searchContainer);

    // Note list container
    this.noteList = document.createElement('div');
    this.noteList.className = 'note-list';
    this.element.appendChild(this.noteList);

    this.container.appendChild(this.element);
  }

  /**
   * Updates the displayed notes.
   *
   * @param notes - Array of note summaries to display
   */
  setNotes(notes: NoteSummary[]): void {
    this.notes = notes;
    this.renderNoteList();
  }

  /**
   * Sets the currently selected note ID.
   *
   * @param id - Selected note ID, or null for none
   */
  setSelectedId(id: number | null): void {
    this.selectedId = id;
    this.updateSelection();
  }

  /**
   * Gets the current search query.
   *
   * @returns Current search input value
   */
  getSearchQuery(): string {
    return this.searchInput?.value || '';
  }

  /**
   * Clears the search input.
   */
  clearSearch(): void {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
  }

  /**
   * Renders the note list based on current notes.
   */
  private renderNoteList(): void {
    if (!this.noteList) return;

    this.noteList.innerHTML = '';

    if (this.notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'note-list-empty';
      empty.textContent = this.getSearchQuery()
        ? 'No notes found'
        : 'No notes yet. Create your first note!';
      this.noteList.appendChild(empty);
      return;
    }

    for (const note of this.notes) {
      const item = this.createNoteItem(note);
      this.noteList.appendChild(item);
    }

    this.updateSelection();
  }

  /**
   * Creates a single note item element.
   */
  private createNoteItem(note: NoteSummary): HTMLElement {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.noteId = String(note.id);
    item.onclick = () => this.onSelectNote(note.id);

    const title = document.createElement('div');
    title.className = 'note-item-title';
    title.textContent = truncateText(note.title || 'Untitled', MAX_DISPLAY_TITLE_LENGTH);
    item.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'note-item-meta';
    meta.textContent = formatRelativeTime(note.updated_at);
    item.appendChild(meta);

    return item;
  }

  /**
   * Updates visual selection state for all note items.
   */
  private updateSelection(): void {
    if (!this.noteList) return;

    const items = this.noteList.querySelectorAll('.note-item');
    items.forEach(item => {
      const noteId = Number(item.getAttribute('data-note-id'));
      if (noteId === this.selectedId) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  /**
   * Updates the search query display without triggering search.
   *
   * @param query - Query to display in search input
   */
  setSearchQuery(query: string): void {
    if (this.searchInput) {
      this.searchInput.value = query;
    }
  }

  /**
   * Focuses the search input.
   */
  focusSearch(): void {
    this.searchInput?.focus();
  }

  /**
   * Destroys the component and removes from DOM.
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.searchInput = null;
    this.noteList = null;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '5c9a7e4f8d2c5c9a7e4f8d2c5c9a7e4f8d2c5c9a7e4f8d2c5c9a7e4f8d2c5c9a7e4f8d2c5c9a7e4f8d2c5c9',
  name: 'Sidebar Component',
  risk_tier: 'medium',
} as const;
