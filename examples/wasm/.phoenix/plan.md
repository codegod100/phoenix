# Implementation Plan - SQLite WASM Notes App

Updated from .phoenix/canonical.md

## IU-9d3c7e5a: Database Layer (HIGH)

**Contract:** Manages SQLite WASM initialization via Worker1 Promiser, OPFS storage detection, database lifecycle, and non-blocking connection management.

**Requirements:**
- node-a1b4c7e9: Use @sqlite.org/sqlite-wasm for data persistence
- node-worker1: Worker1 Promiser pattern for non-blocking operations
- node-8f2e5b8c: OPFS via 'opfs' VFS for persistent storage when available
- node-5c9a2d71: Fallback to in-memory database
- node-9d7c1e5a: Database filename "file:notes.sqlite3?vfs=opfs" or ":memory:"
- node-b4f8e2c9: No localStorage/IndexedDB
- node-f9c6e4b8: Non-blocking main thread operations
- node-b5e7c9a4: Error message on initialization failure
- node-c9e4b7a2: Status indicator for database state

**Risk Tier:** HIGH (critical infrastructure, user data at stake)

**Output:** `src/generated/database.ts`

---

## IU-8e5f3c9b: Schema & Migrations (MEDIUM)

**Contract:** Defines database schema, version tracking, and migration logic using DDL statements. Ensures database structure stays synchronized with application requirements.

**Requirements:**
- node-d5c9a3f8: Single table named "notes"
- node-1a7e5c9b: Notes table columns (id, title, content, created_at, updated_at)
- node-6e4b8d2c: Schema version tracking table
- node-9c2f7a5e: Automatic migration on initialization
- node-a8f3d6c7: No AUTOINCREMENT, use rowid
- node-callback-api: Use callbacks for query results (Worker1 pattern)

**Risk Tier:** MEDIUM (data integrity, but isolated)

**Output:** `src/generated/schema.ts`

---

## IU-7a4f2e8c: Note Repository (HIGH)

**Contract:** Data access layer for notes. Provides CRUD operations with callback-based result capture, search, and timestamp management with retry logic.

**Requirements:**
- node-c7e3a9d2: Create note with title
- node-1f6b8e45: View list sorted by updated_at
- node-a8d4c7f3: View full content of selected note
- node-5e9b2c81: Edit title and content
- node-2c7f5a9e: Delete with confirmation
- node-d8a3f6c5: Search by title or content
- node-4b9e2d8a: Auto-refresh updated_at on save
- node-f3c7a9b1: Permanent deletion (no soft-delete)
- node-7a2e8c5f: Retry save failures 3 times
- node-callback-api: Use Worker1 callback pattern for queries

**Risk Tier:** HIGH (core business logic, data mutations)

**Output:** `src/generated/repository.ts`

---

## IU-6f8e4c7d: Note Model (LOW)

**Contract:** TypeScript types and interfaces for the Note entity. Validation utilities for title/content constraints. Timestamp formatting utilities.

**Requirements:**
- node-4a7e8c21: Note has title, content, timestamps
- node-b9d3f156: Stable unique integer identifier (rowid)
- node-2c8a5e94: Title non-empty, max 200 chars
- node-7f1e3d82: Content stored as text
- node-e5a9c618: Timestamps as Unix epoch milliseconds in UTC
- node-3d6b8f45: Display timestamps in local timezone
- node-f2a9c3d8: Separate created_at and updated_at

**Risk Tier:** LOW (pure types, no runtime logic)

**Output:** `src/generated/types.ts`

---

## IU-5c9a7e4f: Sidebar Component (MEDIUM)

**Contract:** Navigation sidebar showing note list with search, truncation, and relative timestamps. Handles note selection and creation.

**Requirements:**
- node-c2a8f4e6: Sidebar with searchable note list
- node-9b5d7c3a: Titles truncated to 40 chars with relative time
- node-6a3f9c8d: "New Note" button at top
- node-b8e5c2a7: Real-time search filter
- node-2e8a5c9f: Responsive design
- node-8a4e6c3b: System font for UI chrome

**Risk Tier:** MEDIUM (UI component, affects UX)

**Output:** `src/generated/components/sidebar.ts`

---

## IU-4d8f6c3e: Editor Component (HIGH)

**Contract:** Main editor area for viewing and editing notes. Auto-save with debounce, delete confirmation, and status display.

**Requirements:**
- node-c2a8f4e6: Main editor area
- node-e4c9a7f2: Editable title field and content textarea
- node-3f7c9e4b: Delete button with confirmation dialog
- node-a5d8e3c6: Auto-save 500ms after typing stops
- node-f7c3a9e5: Monospaced font for content textarea
- node-8a4e6c3b: System font for titles
- node-d4f9c3e7: Error logging with [notes-app] prefix

**Risk Tier:** HIGH (primary user interaction, data entry)

**Output:** `src/generated/components/editor.ts`

---

## IU-3f7a9e5c: Status Indicator (LOW)

**Contract:** Visual feedback component showing database and save state (ready, saving, error).

**Requirements:**
- node-c9e4b7a2: Status indicator for ready/saving/error states
- node-b8e5c2a7: Real-time updates

**Risk Tier:** LOW (display only, no business logic)

**Output:** `src/generated/components/status.ts`

---

## IU-2e8f5a4b: App Shell (HIGH)

**Contract:** Main application container. Initializes database via Worker1, handles split-pane layout, wires components, manages global state and performance targets.

**Requirements:**
- node-7e5a3c8f: Display immediately on load, no login
- node-c2a8f4e6: Split-pane layout (sidebar + editor)
- node-2e8a5c9f: Clean responsive design, max 1200px width
- node-b5e7c9a4: Error display for initialization failures
- node-3c9f6e8a: OPFS unavailable error with instructions
- node-e8a5c3f9: Handle up to 1000 notes
- node-5c3f7a9e: Search within 100ms
- node-a2e8c5d4: Load within 2 seconds

**Risk Tier:** HIGH (orchestration, performance critical)

**Output:** `src/generated/app.ts`

---

## IU-1d7e4f8a: Deployment Config (LOW)

**Contract:** Documentation and configuration for required HTTP headers. Security guidance for COOP/COEP headers needed for OPFS.

**Requirements:**
- node-4e8a3c9f: Document COOP/COEP headers
- node-c7f5a2e9: Cross-Origin-Opener-Policy: same-origin
- node-8e4c7f3a: Cross-Origin-Embedder-Policy: require-corp
- node-coop-coep: OPFS requires cross-origin isolation

**Risk Tier:** LOW (documentation only)

**Output:** `DEPLOYMENT.md`

---

## Summary

| IU | Name | Risk | Requirements |
|----|------|------|--------------|
| 9d3c7e5a | Database Layer | HIGH | 10 |
| 8e5f3c9b | Schema & Migrations | MEDIUM | 6 |
| 7a4f2e8c | Note Repository | HIGH | 10 |
| 6f8e4c7d | Note Model | LOW | 7 |
| 5c9a7e4f | Sidebar Component | MEDIUM | 6 |
| 4d8f6c3e | Editor Component | HIGH | 7 |
| 3f7a9e5c | Status Indicator | LOW | 2 |
| 2e8f5a4b | App Shell | HIGH | 8 |
| 1d7e4f8a | Deployment Config | LOW | 4 |

**Total:** 9 IUs (LOW: 3, MEDIUM: 2, HIGH: 4)

**Implementation Notes:**
- Uses @sqlite.org/sqlite-wasm Worker1 Promiser pattern
- Callback-based result capture (not RETURNING clause)
- OPFS persistent storage with in-memory fallback
- COOP/COEP headers required for OPFS support
