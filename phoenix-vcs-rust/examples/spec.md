# Log Viewer

Template: python-textual

## Overview
A terminal application for viewing and searching log files. 
Supports real-time tailing, filtering, and bookmarking.

## UI Layout
The interface has:
- Header showing current file name and a clock
- Search bar at the top for filtering logs
- Main log display area (scrollable, follows tail)
- Footer showing line count and status

## Key Bindings
- `q`: Quit the application
- `/`: Focus search bar
- `n`: Jump to next search match
- `p`: Jump to previous match
- `Space`: Pause/resume tailing
- `b`: Add bookmark at current line

## Data / State
The application manages:
- Current file path (string)
- Search query (string)
- Bookmarks (array of line numbers)
- Tailing paused state (boolean)
- Filter patterns (array of strings)

## Styling
Dark theme with:
- Primary accent: cyan
- Error lines: red background
- Warning lines: yellow
- Bookmarked lines: green marker
