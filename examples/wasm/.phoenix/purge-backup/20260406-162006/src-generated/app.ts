/**
 * App Shell - Main application orchestration
 * IU-2e8f5a4b: App Shell (HIGH)
 * 
 * node-7e5a3c8f: Display immediately on load, no login
 * node-c2a8f4e6: Split-pane layout (sidebar + editor)
 * node-2e8a5c9f: Clean responsive design, max 1200px width
 * node-b5e7c9a4: Error display for initialization failures
 * node-3c9f6e8a: OPFS unavailable error with instructions
 * node-e8a5c3f9: Handle up to 1000 notes
 * node-5c3f7a9e: Search within 100ms
 * node-a2e8c5d4: Load within 2 seconds
 */

import { Note } from './types.js';
import { DatabaseInstance, initializeDatabase, getOpfsInstructions, closeDatabase } from './database.js';
import { migrate } from './schema.js';
import { createNoteInDb, getAllNotes, getNoteById, updateNote, deleteNote, searchNotes, withRetry } from './repository.js';
import { createSidebar, Sidebar } from './components/sidebar.js';
import { createEditor, Editor } from './components/editor.js';
import { createStatusIndicator, StatusIndicator } from './components/status.js';

const log = (...args: unknown[]) => console.log('[notes-app]', ...args);
const error = (...args: unknown[]) => console.error('[notes-app]', ...args);

export interface App {
  destroy(): Promise<void>;
}

/**
 * Initialize and mount the notes app
 */
export async function createApp(container: HTMLElement): Promise<App> {
  const startTime = performance.now();
  
  // Clear container and set up base styles
  container.innerHTML = '';
  container.style.cssText = `
    width: 100%;
    max-width: 1200px;
    height: 100vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  // Status bar at top
  const statusBar = document.createElement('div');
  statusBar.style.cssText = `
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  container.appendChild(statusBar);

  const statusIndicator = createStatusIndicator(statusBar);
  
  // OPFS warning badge (if needed)
  const opfsWarning = document.createElement('div');
  opfsWarning.style.cssText = `
    font-size: 12px;
    color: #f9ab00;
    padding: 8px 12px;
    display: none;
  `;
  statusBar.appendChild(opfsWarning);

  // Main content area
  const mainArea = document.createElement('div');
  mainArea.style.cssText = `
    flex: 1;
    display: flex;
    overflow: hidden;
  `;
  container.appendChild(mainArea);

  let db: DatabaseInstance | null = null;
  let sidebar: Sidebar | null = null;
  let editor: Editor | null = null;
  let allNotes: Note[] = [];
  let currentSearchQuery = '';

  try {
    // Initialize database
    statusIndicator.setState('initializing', 'Connecting to database...');
    db = await initializeDatabase();
    
    // Show OPFS warning if needed
    if (!db.isOpfs) {
      opfsWarning.style.display = 'block';
      opfsWarning.textContent = '⚠ In-memory mode - notes will not persist';
      opfsWarning.title = getOpfsInstructions();
      console.warn('[notes-app]', getOpfsInstructions());
    }

    // Run migrations
    statusIndicator.setState('initializing', 'Running migrations...');
    await migrate(db);
    log('Database migrations complete');

    // Load initial notes
    statusIndicator.setState('initializing', 'Loading notes...');
    allNotes = await getAllNotes(db);
    log('Loaded', allNotes.length, 'notes');

    const loadTime = performance.now() - startTime;
    log('App initialized in', Math.round(loadTime), 'ms');
    
    if (loadTime > 2000) {
      console.warn('[notes-app] Load time exceeded 2 second target:', Math.round(loadTime), 'ms');
    }

    statusIndicator.setState('ready', `${allNotes.length} notes`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    error('Failed to initialize app:', msg);
    statusIndicator.setState('error', 'Database error - check console');
    
    // Show error UI
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      padding: 32px;
      text-align: center;
      color: #d93025;
    `;
    errorDiv.innerHTML = `
      <h2>⚠️ Failed to initialize</h2>
      <p>${msg}</p>
      <p style="margin-top: 16px; font-size: 14px; color: #5f6368;">
        Check browser console for details.
      </p>
    `;
    mainArea.appendChild(errorDiv);
    
    throw err;
  }

  // Create sidebar
  sidebar = createSidebar(mainArea, {
    onSelectNote: (noteId) => {
      const note = allNotes.find(n => n.id === noteId);
      if (note && editor) {
        editor.setNote(note);
        sidebar?.setSelectedNoteId(noteId);
      }
    },
    onCreateNote: async () => {
      if (!db) return;
      
      statusIndicator.setState('saving');
      try {
        const newNote = await withRetry(() => createNoteInDb(db!, 'New Note', ''));
        allNotes.unshift(newNote);
        refreshNoteList();
        
        // Select the new note
        sidebar?.setSelectedNoteId(newNote.id);
        editor?.setNote(newNote);
        
        statusIndicator.setState('ready', `${allNotes.length} notes`);
        log('Created note:', newNote.id);
      } catch (err) {
        error('Failed to create note:', err);
        statusIndicator.setState('error', 'Failed to create note');
      }
    },
    onSearch: (query) => {
      currentSearchQuery = query;
      refreshNoteList();
    },
  });

  // Create editor
  editor = createEditor(mainArea, {
    onSave: async (id, title, content) => {
      if (!db) return;
      
      statusIndicator.setState('saving');
      try {
        const updated = await withRetry(() => updateNote(db!, id, title, content));
        
        // Update in local list
        const idx = allNotes.findIndex(n => n.id === id);
        if (idx >= 0) {
          allNotes[idx] = updated;
          // Move to top (most recently updated)
          allNotes.splice(idx, 1);
          allNotes.unshift(updated);
        }
        
        refreshNoteList();
        statusIndicator.setState('ready', 'Saved');
        
        // Reset to just showing count after a moment
        setTimeout(() => {
          statusIndicator.setState('ready', `${allNotes.length} notes`);
        }, 2000);
      } catch (err) {
        error('Failed to save note:', err);
        statusIndicator.setState('error', 'Save failed - retrying...');
        throw err;
      }
    },
    onDelete: async (id) => {
      if (!db) return;
      
      try {
        await withRetry(() => deleteNote(db!, id));
        allNotes = allNotes.filter(n => n.id !== id);
        
        if (editor?.getCurrentNoteId() === id) {
          editor.setNote(null);
        }
        
        refreshNoteList();
        statusIndicator.setState('ready', `${allNotes.length} notes`);
        log('Deleted note:', id);
      } catch (err) {
        error('Failed to delete note:', err);
        statusIndicator.setState('error', 'Delete failed');
      }
    },
  });

  // Initial render of notes
  refreshNoteList();

  /**
   * Refresh the note list based on current search query
   * node-5c3f7a9e: Search within 100ms
   */
  async function refreshNoteList(): Promise<void> {
    if (!sidebar || !db) return;

    const searchStart = performance.now();
    
    let notesToDisplay: Note[];
    if (currentSearchQuery.trim()) {
      notesToDisplay = await searchNotes(db, currentSearchQuery);
    } else {
      notesToDisplay = allNotes;
    }
    
    const searchTime = performance.now() - searchStart;
    if (searchTime > 100) {
      console.warn('[notes-app] Search time exceeded 100ms target:', Math.round(searchTime), 'ms');
    }

    sidebar.setNotes(notesToDisplay);
  }

  return {
    async destroy() {
      log('Shutting down app...');
      
      // Save any pending changes
      if (editor?.hasUnsavedChanges()) {
        // Trigger save - in real app would await the debounced save
        await new Promise(r => setTimeout(r, 600));
      }
      
      if (db) {
        await closeDatabase(db);
      }
    },
  };
}

/**
 * Bootstrap the app when DOM is ready
 */
export function mountApp(selector: string): Promise<App> {
  const container = document.querySelector(selector);
  if (!container) {
    throw new Error(`Container not found: ${selector}`);
  }
  return createApp(container as HTMLElement);
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5',
  name: 'App Shell',
  risk_tier: 'high',
  requirements: [
    'node-7e5a3c8f',
    'node-c2a8f4e6',
    'node-2e8a5c9f',
    'node-b5e7c9a4',
    'node-3c9f6e8a',
    'node-e8a5c3f9',
    'node-5c3f7a9e',
    'node-a2e8c5d4',
  ],
} as const;
