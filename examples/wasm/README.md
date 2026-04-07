# SQLite WASM Notes Example

A Phoenix example project demonstrating a browser-based notes app using SQLite compiled to WebAssembly with persistent storage via the Origin Private File System (OPFS).

## Overview

This example showcases:
- **SQLite WASM** for in-browser SQL database
- **OPFS persistence** for durable local storage
- **Phoenix spec-driven development** workflow

## Prerequisites

The sqlite-wasm library requires specific HTTP headers for OPFS support:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## Project Structure

```
wasm/
├── spec/
│   └── notes.md          # Phoenix specification
└── .phoenix/             # Generated artifacts (after pipeline run)
    ├── canonical.json
    ├── plan.md
    └── generated/
```

## Quick Start

1. Run the Phoenix pipeline to generate implementation:
   ```
   /skill:phoenix pipeline
   ```

2. Serve the app with required headers (see spec for header requirements)

3. Open in browser - notes are stored locally and persist across sessions

## Technology

- **Database**: SQLite 3 via `@sqlite.org/sqlite-wasm`
- **Storage**: Origin Private File System (OPFS)
- **API**: Worker1 Promiser pattern (recommended approach)

## Features

- Create, edit, delete notes
- Full-text search across titles and content
- Auto-save with debounce
- Persistent local storage
- Responsive split-pane UI

## References

- [sqlite-wasm on GitHub](https://github.com/sqlite/sqlite-wasm)
- [SQLite WASM Documentation](https://sqlite.org/wasm/doc/trunk/index.md)
- [OPFS on MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
