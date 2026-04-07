/**
 * App Shell
 * IU: 2e8f5a4b - App Shell (HIGH)
 *
 * Main application container. Initializes database via Worker1,
 * handles split-pane layout, wires components, manages global state.
 */

import { db, DatabaseError } from './database';
import { NoteRepository } from './repository';
import { Sidebar } from './components/sidebar';
import { Editor } from './components/editor';
import { StatusIndicator } from './components/status';
import type { Note, CreateNoteInput, UpdateNoteInput, truncateText } from './types';

/** Maximum expected note count for performance monitoring */
const MAX_NOTES_TARGET = 1000;

/** Target search response time in milliseconds */
const SEARCH_TARGET_MS = 100;

/** Target initial load time in milliseconds */
const LOAD_TARGET_MS = 2000;

/**
 * Main application class for the SQLite WASM Notes App.
 * Orchestrates database, repository, and UI components.
 */
export class NotesApp {
  private sidebar: Sidebar | null = null;
  private editor: Editor | null = null;
  private status: StatusIndicator | null = null;
  private repository: NoteRepository | null = null;
  private notes: Note[] = [];
  private filteredNotes: Note[] = [];
  private currentSearch = '';
  private selectedNoteId: number | null = null;
  private container: HTMLElement | null = null;

  /**
   * Initializes and starts the application.
   *
   * @param containerId - ID of the container element
   */
  async start(containerId = 'app'): Promise<void> {
    const startTime = performance.now();

    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`[notes-app] Container element #${containerId} not found`);
    }

    // Show loading state
    this.container.innerHTML = '<div class="app-loading">Loading...</div>';

    try {
      // Initialize database
      await this.initializeDatabase();

      // Create repository
      const state = db.getState();
      this.repository = new NoteRepository(state.promiser, state.dbId);

      // Build UI
      this.buildUI();

      // Load initial data
      await this.loadNotes();

      // Performance check
      const loadTime = performance.now() - startTime;
      if (loadTime > LOAD_TARGET_MS) {
        console.warn(`[notes-app] Load time ${loadTime.toFixed(0)}ms exceeds target ${LOAD_TARGET_MS}ms`);
      } else {
        console.log(`[notes-app] Loaded in ${loadTime.toFixed(0)}ms`);
      }

    } catch (error) {
      console.error('[notes-app] Failed to start:', error);
      this.showErrorScreen(error);
    }
  }

  /**
   * Initializes the database with error handling.
   */
  private async initializeDatabase(): Promise<void> {
    this.updateStatus({ type: 'initializing', message: 'Initializing database...' });

    try {
      await db.init();

      const isPersistent = db.isPersistent();
      this.updateStatus({
        type: 'ready',
        message: isPersistent ? 'Ready (persistent storage)' : 'Ready (in-memory only)',
        persistent: isPersistent
      });

      if (!isPersistent && !db.isPersistent()) {
        console.warn('[notes-app] OPFS not available - notes will not persist between sessions');
        console.warn('[notes-app] Ensure COOP/COEP headers are set for OPFS support');
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Database initialization failed', error);
    }
  }

  /**
   * Builds the application UI.
   */
  private buildUI(): void {
    if (!this.container) return;

    // Clear container
    this.container.innerHTML = '';

    // Create app layout
    const appWrapper = document.createElement('div');
    appWrapper.className = 'app-wrapper';

    // Header with status
    const header = document.createElement('header');
    header.className = 'app-header';

    const title = document.createElement('h1');
    title.textContent = 'SQLite Notes';
    header.appendChild(title);

    const statusContainer = document.createElement('div');
    statusContainer.className = 'status-container';
    header.appendChild(statusContainer);

    appWrapper.appendChild(header);

    // Main content area (split pane)
    const main = document.createElement('div');
    main.className = 'app-main';

    // Sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.className = 'sidebar-container';
    main.appendChild(sidebarContainer);

    // Editor container
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';
    main.appendChild(editorContainer);

    appWrapper.appendChild(main);
    this.container.appendChild(appWrapper);

    // Initialize components
    this.status = new StatusIndicator(statusContainer);
    this.status.render();

    this.sidebar = new Sidebar(
      sidebarContainer,
      (id) => this.selectNote(id),
      () => this.createNewNote(),
      (query) => this.handleSearch(query)
    );
    this.sidebar.render();

    this.editor = new Editor(
      editorContainer,
      (id, input) => this.saveNote(id, input),
      (id) => this.deleteNote(id),
      (status, message) => this.handleEditorStatus(status, message)
    );
    this.editor.render();
  }

  /**
   * Loads all notes from the repository.
   */
  private async loadNotes(): Promise<void> {
    if (!this.repository) return;

    const startTime = performance.now();
    this.notes = await this.repository.listAll();
    const loadTime = performance.now() - startTime;

    // Performance check
    if (this.notes.length > MAX_NOTES_TARGET) {
      console.warn(`[notes-app] Note count ${this.notes.length} exceeds target ${MAX_NOTES_TARGET}`);
    }

    console.log(`[notes-app] Loaded ${this.notes.length} notes in ${loadTime.toFixed(0)}ms`);

    // Apply current search filter
    this.applySearch();
  }

  /**
   * Applies current search query to filter notes.
   */
  private applySearch(): void {
    const startTime = performance.now();

    if (!this.currentSearch.trim()) {
      this.filteredNotes = [...this.notes];
    } else {
      const query = this.currentSearch.toLowerCase();
      this.filteredNotes = this.notes.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    const searchTime = performance.now() - startTime;
    if (searchTime > SEARCH_TARGET_MS) {
      console.warn(`[notes-app] Search took ${searchTime.toFixed(0)}ms, exceeds target ${SEARCH_TARGET_MS}ms`);
    }

    // Update sidebar
    const summaries = this.filteredNotes.map(n => ({
      id: n.id,
      title: n.title,
      updated_at: n.updated_at
    }));
    this.sidebar?.setNotes(summaries);
    this.sidebar?.setSelectedId(this.selectedNoteId);
  }

  /**
   * Handles search query changes.
   */
  private handleSearch(query: string): void {
    this.currentSearch = query;
    this.applySearch();
  }

  /**
   * Selects a note for editing.
   */
  private selectNote(id: number): void {
    this.selectedNoteId = id;
    const note = this.notes.find(n => n.id === id);

    if (note) {
      this.editor?.loadNote(note);
    }

    this.sidebar?.setSelectedId(id);
  }

  /**
   * Creates a new note.
   */
  private async createNewNote(): Promise<void> {
    if (!this.repository) return;

    try {
      const newNote = await this.repository.create({
        title: 'New Note',
        content: ''
      });

      this.notes.unshift(newNote);
      this.applySearch();
      this.selectNote(newNote.id);
      this.editor?.focusTitle();

    } catch (error) {
      console.error('[notes-app] Failed to create note:', error);
      this.updateStatus({ type: 'error', message: 'Failed to create note' });
    }
  }

  /**
   * Saves a note.
   */
  private async saveNote(id: number, input: UpdateNoteInput): Promise<void> {
    if (!this.repository) return;

    const updated = await this.repository.update(id, input);

    // Update local cache
    const index = this.notes.findIndex(n => n.id === id);
    if (index >= 0) {
      this.notes[index] = updated;
      // Re-sort by updated_at
      this.notes.sort((a, b) => b.updated_at - a.updated_at);
    }

    this.applySearch();
  }

  /**
   * Deletes a note.
   */
  private async deleteNote(id: number): Promise<void> {
    if (!this.repository) return;

    await this.repository.delete(id);

    // Update local cache
    this.notes = this.notes.filter(n => n.id !== id);
    this.applySearch();

    if (this.selectedNoteId === id) {
      this.selectedNoteId = null;
      this.editor?.clear();
    }
  }

  /**
   * Handles editor status changes.
   */
  private handleEditorStatus(
    status: 'saving' | 'saved' | 'error',
    message?: string
  ): void {
    switch (status) {
      case 'saving':
        this.updateStatus({ type: 'saving', message: message || 'Saving...' });
        break;
      case 'saved':
        this.updateStatus({ type: 'saved', message: 'Saved' });
        // Revert to ready after brief delay
        setTimeout(() => {
          const persistent = db.isPersistent();
          this.updateStatus({
            type: 'ready',
            message: persistent ? 'Ready' : 'Ready (in-memory)',
            persistent
          });
        }, 1500);
        break;
      case 'error':
        this.updateStatus({ type: 'error', message: message || 'Error' });
        break;
    }
  }

  /**
   * Updates the status indicator.
   */
  private updateStatus(status: {
    type: 'initializing' | 'ready' | 'saving' | 'saved' | 'error';
    message: string;
    persistent?: boolean;
  }): void {
    this.status?.setStatus(status);
  }

  /**
   * Shows error screen for critical failures.
   */
  private showErrorScreen(error: unknown): void {
    if (!this.container) return;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isOPFSError = errorMessage.includes('OPFS') || errorMessage.includes('persistent');

    this.container.innerHTML = `
      <div class="app-error">
        <h2>⚠️ Error</h2>
        <p>${errorMessage}</p>
        ${isOPFSError ? `
          <div class="error-help">
            <p><strong>OPFS Storage Unavailable</strong></p>
            <p>To enable persistent storage, the server must send these headers:</p>
            <pre>
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp</pre>
            <p>Notes will work in-memory only until these headers are configured.</p>
          </div>
        ` : ''}
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  /**
   * Destroys the application and cleans up resources.
   */
  async destroy(): Promise<void> {
    this.sidebar?.destroy();
    this.editor?.destroy();
    this.status?.destroy();
    await db.close();
  }
}

/**
 * Mounts the NotesApp to a DOM element.
 * This is the main entry point for the application.
 *
 * @param selector - CSS selector for the container element (e.g., '#app')
 * @returns Promise resolving to the app instance with destroy method
 */
export async function mountApp(selector: string): Promise<{ destroy: () => Promise<void> }> {
  const app = new NotesApp();
  await app.start(selector.replace('#', ''));
  return app;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5a4b9c7d2e8f5',
  name: 'App Shell',
  risk_tier: 'high',
} as const;
