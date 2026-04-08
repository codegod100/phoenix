# Dashboard Integration

Integration layer that wires all dashboard components together into a complete working application.

## Component Wiring

- REQUIREMENT: The dashboard shall compose the page theme, task list, edit form, archive tabs, bulk selection, and analytics bar into a single working page
- REQUIREMENT: The analytics bar shall display inline on the same line as the page title in the header with no visual separator line below
- REQUIREMENT: The create form shall append new tasks to localStorage and trigger task grid re-render
- REQUIREMENT: The task grid shall display tasks from localStorage and pass click events to edit handlers
- REQUIREMENT: The inline edit form shall update localStorage and trigger task grid re-render on save
- REQUIREMENT: The archive tabs shall filter task grid display without page reload
- REQUIREMENT: The bulk selection shall update task grid checkbox states and show or hide bulk action bar
- REQUIREMENT: The analytics bar shall recalculate on every localStorage change

## Event Flow

- REQUIREMENT: Form submit events shall validate input, write to localStorage, then call render functions
- REQUIREMENT: Status transition buttons shall update task status, update updated_at timestamp, write to localStorage, then re-render
- REQUIREMENT: Edit button clicks shall hide card content div and show edit form sibling
- REQUIREMENT: Cancel and save buttons shall toggle display none on edit form and restore card view
- REQUIREMENT: Archive and restore actions shall set archived flag with timestamp, write to localStorage, then re-render current view
- REQUIREMENT: Delete actions shall show confirmation modal, then on confirm remove from localStorage and re-render
- REQUIREMENT: Tab clicks shall switch view state between active and archived, clear bulk selection, and re-render task grid

## State Management

- REQUIREMENT: localStorage key taskflow_tasks shall be the single source of truth for all components
- REQUIREMENT: All components shall read from localStorage on every render with no in-memory caching
- REQUIREMENT: Write operations shall complete before triggering re-render using synchronous flow
- REQUIREMENT: State mutations shall include updated_at timestamp automatically
- REQUIREMENT: Archived tasks shall retain all original data plus archived boolean and archived_at timestamp

## UI Coordination

- REQUIREMENT: The create form and task grid shall render side by side in a two-column layout on desktop with create form on left and task grid on right
- REQUIREMENT: The create form and task grid module containers shall align at the exact same top edge for visual symmetry
- REQUIREMENT: Both module headers with h2 titles shall have identical margin, padding, and line-height
- REQUIREMENT: On mobile, the create form shall stack above the task grid in a single column
- REQUIREMENT: Active tab shall show task cards with status badges and archived tasks shown with dimmed strikethrough badge overlay
- REQUIREMENT: Active tab shall display done tasks in a separate section below active tasks with a Completed heading
- REQUIREMENT: Done tasks must render in the same grid layout as active tasks with same column widths, gaps, and responsive behavior
- REQUIREMENT: Archived tab shall show archived tasks with original status badge plus archived indicator
- REQUIREMENT: Bulk action bar shall only appear when selectedIds length is greater than 0
- REQUIREMENT: Bulk bar shall disable archive button when viewing archived tab and disable restore when viewing active tab
- REQUIREMENT: Confirmation modal shall overlay entire page with semi-transparent background
- REQUIREMENT: Modal confirm action shall execute callback then close modal
- REQUIREMENT: Escape key shall cancel modal and click outside modal shall cancel

## Modal Requirements

- REQUIREMENT: The create/edit modal dialog must fit within the viewport without requiring vertical scroll on standard desktop resolutions (1080p)
- REQUIREMENT: The modal shall have a maximum width of 700px to accommodate all form fields comfortably
- REQUIREMENT: The modal shall use 95% of viewport width on mobile devices
- REQUIREMENT: The modal shall have 32px internal padding for proper spacing of form elements
- REQUIREMENT: The modal content area shall scroll internally only if absolutely necessary, preferring to fit all fields
- REQUIREMENT: All form fields (title, description, status, priority, assignee, deadline, tags) shall be visible without scrolling on desktop

## Integration Invariants

- CONSTRAINT: No component shall render without reading current localStorage state
- CONSTRAINT: No state change shall occur without updating localStorage first
- CONSTRAINT: Re-renders shall be synchronous following state updates
- CONSTRAINT: All event handlers shall be attached on initial page load
- CONSTRAINT: Components shall not have external dependencies with all data from localStorage
