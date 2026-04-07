# Canonical Requirements - SQLite WASM Notes App

Generated from spec/notes.md

## Data Model

- node-4a7e8c21: A note shall have a title, content body, created_at timestamp, and updated_at timestamp
- node-b9d3f156: Every note shall have a stable unique integer identifier (rowid) for reliable referencing
- node-2c8a5e94: CONSTRAINT: Titles must be non-empty and must not exceed 200 characters
- node-7f1e3d82: CONSTRAINT: Content body must be stored as text with no practical length limit
- node-e5a9c618: Timestamps shall be recorded as Unix epoch milliseconds in UTC
- node-3d6b8f45: The system shall display timestamps in the user's local timezone
- node-f2a9c3d8: The system shall maintain separate created_at and updated_at timestamps for each note

## Storage

- node-a1b4c7e9: The system shall use @sqlite.org/sqlite-wasm for all data persistence
- node-worker1: The system shall use the Worker1 Promiser pattern for non-blocking database operations
- node-8f2e5b8c: The database shall use the Origin Private File System (OPFS) via the 'opfs' VFS for persistent storage when available
- node-5c9a2d71: The system shall fall back to an in-memory database when OPFS is unavailable
- node-9d7c1e5a: The database filename shall be "file:notes.sqlite3?vfs=opfs" for OPFS or ":memory:" for in-memory fallback
- node-e3b8a4f6: The database schema shall be versioned and migrated automatically on startup
- node-b4f8e2c9: CONSTRAINT: The system must not use localStorage, IndexedDB, or other browser storage mechanisms for note data
- node-callback-api: CONSTRAINT: The system must use callbacks to capture query results from the Worker1 Promiser exec API

## Note Operations

- node-c7e3a9d2: Users shall be able to create a new note by providing at least a title
- node-1f6b8e45: Users shall be able to view a list of all notes sorted by most recently updated first
- node-a8d4c7f3: Users shall be able to view the full content of a selected note
- node-5e9b2c81: Users shall be able to edit a note's title and content at any time
- node-2c7f5a9e: Users shall be able to delete a note permanently with confirmation
- node-d8a3f6c5: Users shall be able to search notes by title or content body text
- node-4b9e2d8a: The updated_at timestamp shall be refreshed automatically on every save
- node-f3c7a9b1: Deleted notes shall be permanently removed without a soft-delete mechanism

## Web Interface

- node-7e5a3c8f: The app shall display immediately on page load with no login required
- node-c2a8f4e6: The main view shall show a sidebar with a searchable note list and a main editor area
- node-9b5d7c3a: The sidebar shall display note titles truncated to 40 characters with the last updated time
- node-e4c9a7f2: The editor area shall show the selected note with an editable title field and a textarea for content
- node-6a3f9c8d: A "New Note" button shall be prominently placed at the top of the sidebar
- node-b8e5c2a7: A search input shall filter the note list in real-time as the user types
- node-3f7c9e4b: A delete button shall appear in the editor header with a confirmation dialog
- node-a5d8e3c6: The editor shall auto-save changes 500ms after the user stops typing
- node-c9e4b7a2: A status indicator shall show when the database is ready, saving, or has errors
- node-2e8a5c9f: The design shall be clean and responsive with a maximum content width of 1200px
- node-f7c3a9e5: The interface shall use a monospaced font for the note content textarea
- node-8a4e6c3b: The interface shall use a system font for all UI chrome and note titles

## Database Schema

- node-d5c9a3f8: The database shall contain a single table named "notes"
- node-1a7e5c9b: The notes table shall have columns: id (INTEGER PRIMARY KEY), title (TEXT NOT NULL), content (TEXT), created_at (INTEGER), updated_at (INTEGER)
- node-6e4b8d2c: The schema version shall be tracked in a "schema_version" table
- node-9c2f7a5e: The system shall run migrations to bring the database to the current schema version on initialization
- node-a8f3d6c7: CONSTRAINT: The schema must never use AUTOINCREMENT; rowid shall serve as the stable identifier

## Error Handling

- node-b5e7c9a4: The app shall display a clear error message if the database fails to initialize
- node-3c9f6e8a: The app shall display a clear error message if OPFS is unavailable with instructions for enabling it
- node-7a2e8c5f: Save failures shall be retried automatically up to 3 times before showing an error
- node-d4f9c3e7: All errors shall be logged to the browser console with a "[notes-app]" prefix

## Performance

- node-e8a5c3f9: The app shall handle up to 1000 notes without UI degradation
- node-5c3f7a9e: Search results shall display within 100ms for the maximum dataset size
- node-a2e8c5d4: The initial database load shall complete within 2 seconds on a modern device
- node-f9c6e4b8: CONSTRAINT: The app must not block the main thread during database operations

## Security & Headers

- node-4e8a3c9f: CONSTRAINT: The deployment documentation must specify the required COOP and COEP headers for OPFS support
- node-c7f5a2e9: The Cross-Origin-Opener-Policy header must be set to "same-origin"
- node-8e4c7f3a: The Cross-Origin-Embedder-Policy header must be set to "require-corp"

## Implementation Notes

- node-sqlite-wasm-api: Implementation uses @sqlite.org/sqlite-wasm with Worker1 Promiser pattern
- node-coop-coep: OPFS requires COOP/COEP headers for cross-origin isolation
- node-callback-pattern: Query results captured via callback in exec API, not RETURNING clause

---

**Summary:** 50 canonical requirements from 1 spec file (including implementation constraints)
