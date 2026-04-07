/**
 * Sidebar Component
 * IU-5c9a7e4f: Sidebar Component (MEDIUM)
 * 
 * node-c2a8f4e6: Sidebar with searchable note list
 * node-9b5d7c3a: Titles truncated to 40 chars with last updated time
 * node-6a3f9c8d: "New Note" button at top
 * node-b8e5c2a7: Real-time search filter
 * node-2e8a5c9f: Responsive design
 * node-8a4e6c3b: System font for UI chrome
 */

import { Note, truncateTitle, getRelativeTime } from '../types.js';

export interface SidebarCallbacks {
  onSelectNote: (noteId: number) => void;
  onCreateNote: () => void;
  onSearch: (query: string) => void;
}

export interface Sidebar {
  element: HTMLElement;
  setNotes(notes: Note[]): void;
  setSelectedNoteId(id: number | null): void;
  getSearchQuery(): string;
}

/**
 * Create sidebar UI component
 */
export function createSidebar(container: HTMLElement, callbacks: SidebarCallbacks): Sidebar {
  let selectedNoteId: number | null = null;
  let notes: Note[] = [];

  // Create main container
  const element = document.createElement('div');
  element.className = 'sidebar';
  element.style.cssText = `
    display: flex;
    flex-direction: column;
    width: 300px;
    min-width: 250px;
    max-width: 400px;
    height: 100%;
    border-right: 1px solid #e0e0e0;
    background: #fafafa;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Header with new note button
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  `;

  const newButton = document.createElement('button');
  newButton.textContent = '+ New Note';
  newButton.style.cssText = `
    width: 100%;
    padding: 10px 16px;
    background: #1967d2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  `;
  newButton.onmouseover = () => newButton.style.background = '#1557b0';
  newButton.onmouseout = () => newButton.style.background = '#1967d2';
  newButton.onclick = () => callbacks.onCreateNote();
  header.appendChild(newButton);

  // Search input
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
  `;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search notes...';
  searchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
  `;
  searchInput.onfocus = () => searchInput.style.borderColor = '#1967d2';
  searchInput.onblur = () => searchInput.style.borderColor = '#dadce0';
  
  // node-b8e5c2a7: Real-time search filter
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  searchInput.oninput = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      callbacks.onSearch(searchInput.value);
    }, 50); // Fast debounce for real-time feel
  };
  
  searchContainer.appendChild(searchInput);

  // Notes list container
  const listContainer = document.createElement('div');
  listContainer.className = 'notes-list';
  listContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  `;

  element.appendChild(header);
  element.appendChild(searchContainer);
  element.appendChild(listContainer);
  container.appendChild(element);

  /**
   * Render a single note item
   * node-9b5d7c3a: Truncated title and relative time
   */
  function createNoteItem(note: Note): HTMLElement {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.noteId = String(note.id);
    
    const isSelected = note.id === selectedNoteId;
    item.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-left: 3px solid ${isSelected ? '#1967d2' : 'transparent'};
      background: ${isSelected ? '#e8f0fe' : 'transparent'};
      transition: background 0.15s;
    `;
    item.onmouseover = () => {
      if (note.id !== selectedNoteId) {
        item.style.background = '#f0f0f0';
      }
    };
    item.onmouseout = () => {
      item.style.background = isSelected ? '#e8f0fe' : 'transparent';
    };
    item.onclick = () => callbacks.onSelectNote(note.id);

    // Title
    const title = document.createElement('div');
    title.textContent = truncateTitle(note.title || '(Untitled)');
    title.style.cssText = `
      font-size: 14px;
      font-weight: ${isSelected ? '500' : '400'};
      color: #202124;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;

    // Timestamp
    const time = document.createElement('div');
    time.textContent = getRelativeTime(note.updatedAt);
    time.style.cssText = `
      font-size: 12px;
      color: #5f6368;
      margin-top: 4px;
    `;

    item.appendChild(title);
    item.appendChild(time);
    return item;
  }

  /**
   * Update the notes list
   */
  function renderNotes(): void {
    listContainer.innerHTML = '';
    
    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No notes yet. Create one!';
      empty.style.cssText = `
        padding: 32px 16px;
        text-align: center;
        color: #5f6368;
        font-size: 14px;
      `;
      listContainer.appendChild(empty);
      return;
    }

    notes.forEach(note => {
      listContainer.appendChild(createNoteItem(note));
    });
  }

  return {
    element,
    setNotes(newNotes: Note[]) {
      notes = newNotes;
      renderNotes();
    },
    setSelectedNoteId(id: number | null) {
      selectedNoteId = id;
      renderNotes();
    },
    getSearchQuery() {
      return searchInput.value;
    },
  };
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '5c9a7e4f8d2b5c9a7e4f8d2b5c9a7e4f8d2b5c9a7e4f8d2b5c9a7e4f8d2b5c9a7',
  name: 'Sidebar Component',
  risk_tier: 'medium',
  requirements: [
    'node-c2a8f4e6',
    'node-9b5d7c3a',
    'node-6a3f9c8d',
    'node-b8e5c2a7',
    'node-2e8a5c9f',
    'node-8a4e6c3b',
  ],
} as const;
