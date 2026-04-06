# Dashboard Integration

Integration layer that wires all dashboard components together into a complete working application.

## Component Wiring

- The dashboard shall compose the page theme, task list, edit form, archive tabs, bulk selection, and analytics bar into a single working page
- The analytics bar shall display inline on the same line as the page title in the header with no visual separator line below
- The create form shall append new tasks to localStorage and trigger task grid re-render
- The task grid shall display tasks from localStorage and pass click events to edit handlers
- The inline edit form shall update localStorage and trigger task grid re-render on save
- The archive tabs shall filter task grid display without page reload
- The bulk selection shall update task grid checkbox states and show/hide bulk action bar
- The analytics bar shall recalculate on every localStorage change

## Event Flow

- Form submit events shall validate input, write to localStorage, then call render functions
- Status transition buttons shall update task status, update updated_at timestamp, write to localStorage, then re-render
- Edit button clicks shall hide card content div and show edit form sibling
- Cancel/save buttons shall toggle display:none on edit form and restore card view
- Archive/restore actions shall set archived flag with timestamp, write to localStorage, then re-render current view
- Delete actions shall show confirmation modal, then on confirm remove from localStorage and re-render
- Tab clicks shall switch view state (active/archived), clear bulk selection, re-render task grid

## State Management

- localStorage key 'taskflow_tasks' shall be the single source of truth for all components
- All components shall read from localStorage on every render (no in-memory caching)
- Write operations shall complete before triggering re-render (synchronous flow)
- State mutations shall include updated_at timestamp automatically
- Archived tasks shall retain all original data plus archived boolean and archived_at timestamp

## UI Coordination

- The create form and task grid shall render side by side in a two-column layout on desktop (create form on left, task grid on right)
- The create form and task grid module containers shall align at the exact same top edge for visual symmetry
- Both module headers (h2 titles) shall have identical margin, padding, and line-height
- On mobile, the create form shall stack above the task grid in a single column
- Active tab shall show task cards with status badges; archived tasks shown with dimmed strikethrough badge overlay
- Active tab shall display done tasks in a separate section below active tasks with a "Completed" heading
- Done tasks must render in the same grid layout as active tasks (same column widths, gaps, and responsive behavior)
- Archived tab shall show archived tasks with original status badge plus archived indicator
- Bulk action bar shall only appear when selectedIds.length > 0
- Bulk bar shall disable archive button when viewing archived tab; disable restore when viewing active tab
- Confirmation modal shall overlay entire page with semi-transparent background
- Modal confirm action shall execute callback then close modal
- Escape key shall cancel modal; click outside modal shall cancel

## Integration Invariants

- No component shall render without reading current localStorage state
- No state change shall occur without updating localStorage first
- Re-renders shall be synchronous following state updates
- All event handlers shall be attached on initial page load
- Components shall not have external dependencies (all data from localStorage)
