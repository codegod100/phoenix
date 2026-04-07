# SQLite WASM Notes App

A simple browser-based note-taking application powered by SQLite running in WebAssembly via the Worker1 Promiser API. Notes are stored locally using the Origin Private File System (OPFS) for persistent, private storage that survives browser restarts.

## Data Model

- REQUIREMENT: A note shall have a title, content body, created_at timestamp, and updated_at timestamp
- REQUIREMENT: Every note shall have a stable unique integer identifier (rowid) for reliable referencing
- CONSTRAINT: Titles must be non-empty and must not exceed 200 characters
- CONSTRAINT: Content body must be stored as text with no practical length limit
- REQUIREMENT: Timestamps shall be recorded as Unix epoch milliseconds in UTC
- REQUIREMENT: The system shall display timestamps in the user's local timezone
- REQUIREMENT: The system shall maintain separate created_at and updated_at timestamps for each note

## Storage

- REQUIREMENT: The system shall use @sqlite.org/sqlite-wasm for all data persistence
- REQUIREMENT: The system shall use the Worker1 Promiser pattern for non-blocking database operations
- REQUIREMENT: The database shall use the Origin Private File System (OPFS) via the 'opfs' VFS for persistent storage when available
- REQUIREMENT: The system shall fall back to an in-memory database when OPFS is unavailable
- REQUIREMENT: The database filename shall be "file:notes.sqlite3?vfs=opfs" for OPFS or ":memory:" for in-memory fallback
- REQUIREMENT: The database schema shall be versioned and migrated automatically on startup
- CONSTRAINT: The system must not use localStorage, IndexedDB, or other browser storage mechanisms for note data
- CONSTRAINT: The system must use callbacks to capture query results from the Worker1 Promiser exec API

## Note Operations

- REQUIREMENT: Users shall be able to create a new note by providing at least a title
- REQUIREMENT: Users shall be able to view a list of all notes sorted by most recently updated first
- REQUIREMENT: Users shall be able to view the full content of a selected note
- REQUIREMENT: Users shall be able to edit a note's title and content at any time
- REQUIREMENT: Users shall be able to delete a note permanently with confirmation
- REQUIREMENT: Users shall be able to search notes by title or content body text
- REQUIREMENT: The updated_at timestamp shall be refreshed automatically on every save
- REQUIREMENT: Deleted notes shall be permanently removed without a soft-delete mechanism

## Web Interface

- REQUIREMENT: The app shall display immediately on page load with no login required
- REQUIREMENT: The main view shall show a sidebar with a searchable note list and a main editor area
- REQUIREMENT: The sidebar shall display note titles truncated to 40 characters with the last updated time
- REQUIREMENT: The editor area shall show the selected note with an editable title field and a textarea for content
- REQUIREMENT: A "New Note" button shall be prominently placed at the top of the sidebar
- REQUIREMENT: A search input shall filter the note list in real-time as the user types
- REQUIREMENT: A delete button shall appear in the editor header with a confirmation dialog
- REQUIREMENT: The editor shall auto-save changes 500ms after the user stops typing
- REQUIREMENT: A status indicator shall show when the database is ready, saving, or has errors
- REQUIREMENT: The design shall be clean and responsive with a maximum content width of 1200px
- REQUIREMENT: The interface shall use a monospaced font for the note content textarea
- REQUIREMENT: The interface shall use a system font for all UI chrome and note titles

## Database Schema

- REQUIREMENT: The database shall contain a single table named "notes"
- REQUIREMENT: The notes table shall have columns: id (INTEGER PRIMARY KEY), title (TEXT NOT NULL), content (TEXT), created_at (INTEGER), updated_at (INTEGER)
- REQUIREMENT: The schema version shall be tracked in a "schema_version" table
- REQUIREMENT: The system shall run migrations to bring the database to the current schema version on initialization
- CONSTRAINT: The schema must never use AUTOINCREMENT; rowid shall serve as the stable identifier

## Error Handling

- REQUIREMENT: The app shall display a clear error message if the database fails to initialize
- REQUIREMENT: The app shall display a clear error message if OPFS is unavailable with instructions for enabling it
- REQUIREMENT: Save failures shall be retried automatically up to 3 times before showing an error
- REQUIREMENT: All errors shall be logged to the browser console with a "[notes-app]" prefix

## Performance

- REQUIREMENT: The app shall handle up to 1000 notes without UI degradation
- REQUIREMENT: Search results shall display within 100ms for the maximum dataset size
- REQUIREMENT: The initial database load shall complete within 2 seconds on a modern device
- CONSTRAINT: The app must not block the main thread during database operations

## Security & Headers

- CONSTRAINT: The deployment documentation must specify the required COOP and COEP headers for OPFS support
- REQUIREMENT: The Cross-Origin-Opener-Policy header must be set to "same-origin"
- REQUIREMENT: The Cross-Origin-Embedder-Policy header must be set to "require-corp"

## Implementation Notes

### SQLite WASM API Patterns

The implementation uses @sqlite.org/sqlite-wasm with the Worker1 Promiser pattern:

```typescript
// For queries that return data, use a callback
const rows: T[] = [];
await promiser('exec', {
  dbId: dbId,
  sql: 'SELECT id, title FROM notes',
  callback: (row: { row: T[] }) => { rows.push(row.row); }
});

// For DDL or DML without results, omit the callback
await promiser('exec', {
  dbId: dbId,
  sql: 'INSERT INTO notes (title) VALUES (?)',
  bind: ['New Note']
});
```

### COOP/COEP Headers Requirement

OPFS requires cross-origin isolation. The server must emit:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Without these headers, the app falls back to in-memory storage and notes will not persist.

### Database Access Patterns

- **Create**: Insert then select by max(id) since RETURNING clause is not reliably supported
- **Read**: Use callback-based exec with typed row arrays
- **Update**: Update then re-select the row by id
- **Delete**: Simple exec with bind parameter
- **Search**: Use LOWER() with LIKE pattern for case-insensitive search
