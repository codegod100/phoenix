# Implementation Units

Planned from canonical requirements. Each IU groups related requirements by feature area.

---

## IU-1: Task Domain Model (MEDIUM)

**Description:** Core task entity with lifecycle, assignment, deadline management, and archive support.

**Risk Tier:** MEDIUM (21 requirements, business logic complexity)

**Canonical Requirements:**
- node-a1b2c3d4: create tasks with title description priority
- node-b2c3d4e5: generate unique task id as uuid v4
- node-c3d4e5f6: status transitions open to in_progress to review to done and done to open for reopening
- node-d4e5f678: reject invalid status transitions
- node-e5f67890: track created_at and updated_at timestamps
- node-f6789012: record completion timestamp and duration
- node-67890123: support archiving tasks
- node-78901234: support restoring archived tasks
- node-89012345: list archived tasks separately
- node-90123456: assign task to single user
- node-01234567: log previous assignee in audit trail
- node-12345678: query unassigned tasks
- node-23456789: validate user id non-empty
- node-34567890: search by title substring case-insensitive
- node-45678901: filter by status priority assignee and archived state
- node-56789012: sort by priority then created_at
- node-67890123a: empty query returns all tasks
- node-78901234a: support optional deadline dates
- node-89012345a: flag overdue tasks automatically
- node-90123456a: list all overdue tasks
- node-01234567a: allow past deadline with warning

**Contract:**
- Inputs: Task creation/updates, search/filter criteria (including archived state)
- Outputs: Task records, filtered lists, overdue flags, archived task lists
- Invariants: Valid status transitions only, UUID uniqueness, archived tasks retain data

**Output Files:**
- `src/generated/taskflow/task-model.ts`
- `src/generated/taskflow/__tests__/task-model.test.ts`

---

## IU-2: Analytics Engine (MEDIUM)

**Description:** Metrics calculation and reporting functions.

**Risk Tier:** MEDIUM (10 requirements, calculation complexity)

**Canonical Requirements:**
- node-12345678a: track total created completed overdue
- node-23456789a: calculate average completion time
- node-34567890a: compute throughput 7-day rolling
- node-45678901a: compute from array no database
- node-56789012a: report count by priority
- node-67890123b: report count by status
- node-78901234b: include percentage in breakdowns
- node-89012345b: calculate per-assignee completion rate
- node-90123456b: identify top performer
- node-01234567b: exclude unassigned from team metrics

**Contract:**
- Inputs: Array of task records (including archived)
- Outputs: Metrics objects, breakdowns, performance stats
- Invariants: No external dependencies

**Output Files:**
- `src/generated/taskflow/analytics.ts`
- `src/generated/taskflow/__tests__/analytics.test.ts`

---

## IU-3: Dashboard Page & Theme (HIGH)

**Description:** HTML page structure, Catppuccin theme, responsive layout.

**Risk Tier:** HIGH (15 requirements, user-facing UI)

**Canonical Requirements:**
- node-12345678b: render complete html page inline css js
- node-23456789b: compact header taskflow title 32px
- node-34567890b: css custom properties catppuccin colors
- node-45678901b: responsive layout mobile desktop
- def-1a2b3c4d: catppuccin mocha exclusive no toggle
- def-2b3c4d5e: background 1e1e2e card 313244
- def-3c4d5e6f: text cdd6f4 secondary a6adc8
- def-4d5e6f78: accent blue success green warning yellow danger red
- def-5e6f7890: priority colors
- def-6f789012: status colors including archived surface1 dimmed
- node-56789012b: css custom properties theming
- node-67890123c: cards subtle shadows rounded 8px hover
- node-78901234c: system-ui font hierarchy
- node-89012345c: buttons rounded padding cursor

**Contract:**
- Inputs: None (generates static HTML/CSS structure)
- Outputs: HTML page string with inline styles
- Invariants: Catppuccin Mocha only, no external CSS

**Output Files:**
- `src/generated/taskflow/dashboard-page.ts`
- `src/generated/taskflow/__tests__/dashboard-page.test.ts`

---

## IU-4: Dashboard Task List (HIGH)

**Description:** Task grid display, cards, badges, localStorage persistence.

**Risk Tier:** HIGH (8 requirements, user-facing UI)

**Canonical Requirements:**
- node-90123456c: render tasks styled cards responsive grid
- node-01234567c: card shows title description priority status assignee deadline
- node-12345678c: priority badges color-coded
- node-23456789c: status badges color-coded including archived overlay0 dim
- node-34567890c: overdue tasks red border indicator
- node-45678901c: card status transition buttons
- node-56789012c: persist in localstorage survive refresh
- node-67890123d: immediate display on page load

**Contract:**
- Inputs: Task data from localStorage
- Outputs: Rendered card HTML, event handlers
- Invariants: localStorage schema versioned

**Output Files:**
- `src/generated/taskflow/dashboard-tasklist.ts`
- `src/generated/taskflow/__tests__/dashboard-tasklist.test.ts`

---

## IU-5: Dashboard Edit UI (HIGH)

**Description:** Create form and inline editing for tasks.

**Risk Tier:** HIGH (11 requirements, user-facing UI, form complexity)

**Canonical Requirements:**
- node-78901234d: create form title description priority deadline
- node-89012345d: validate title non-empty
- node-90123456d: edit button replaces content not modal
- node-01234567d: edit form in place pre-populated
- node-12345678d: card-content div hideable
- node-23456789d: edit form sibling not nested
- node-34567890d: toggle display via inline style
- node-45678901d: save cancel buttons visual distinction
- node-56789012d: cancel/save restore card view
- node-67890123e: edit title description priority deadline assignee
- node-78901234e: update updated_at automatically

**Contract:**
- Inputs: Task data, DOM elements
- Outputs: Updated task data, DOM mutations
- Invariants: No nested forms, timestamp auto-updated

**Output Files:**
- `src/generated/taskflow/dashboard-edit.ts`
- `src/generated/taskflow/__tests__/dashboard-edit.test.ts`

---

## IU-6: Dashboard Archive UI (HIGH)

**Description:** Archive tab switching, archived task display with status badges, restore functionality.

**Risk Tier:** HIGH (9 requirements, user-facing UI, visual state management)

**Canonical Requirements:**
- node-89012345e: archived view via archived tasks tab
- node-90123456e: switch active archived no reload
- node-01234567e: archived queryable restorable
- node-12345678e: archive completed tasks
- node-23456789e: archived status visually indicated muted dim
- node-34567890e: archived badge in active tab dimmed strikethrough
- node-45678901e: archived tab shows original status with indicator
- node-56789012e: archived display in same grid
- node-67890123f: archived cards have restore button

**Contract:**
- Inputs: Archive status, task data, original status for archived tasks
- Outputs: Filtered view, restore actions, visual status indicators
- Invariants: Archived tasks retained not deleted, visual state consistent

**Output Files:**
- `src/generated/taskflow/dashboard-archive.ts`
- `src/generated/taskflow/__tests__/dashboard-archive.test.ts`

---

## IU-7: Dashboard Bulk Operations (HIGH)

**Description:** Multi-select, bulk actions including archive, confirmation modals.

**Risk Tier:** HIGH (10 requirements, user-facing UI, destructive operations)

**Canonical Requirements:**
- node-78901234f: bulk checkboxes multi-select
- node-89012345f: bulk action bar delete archive selected
- node-90123456f: bulk delete archive reassign
- node-01234567f: bulk delete by id with confirmation
- node-12345678f: delete by unique id
- node-23456789f: delete button opens confirmation modal
- node-34567890f: delete button danger color trash icon
- node-45678901f: deleted removed from all views
- node-56789012f: custom modal overlays not browser confirm alert
- node-67890123g: delete requires confirmation modal

**Contract:**
- Inputs: Selected task IDs, action type (delete/archive/reassign)
- Outputs: Bulk operation results, modal UI
- Invariants: Confirmation before delete, modal not alert

**Output Files:**
- `src/generated/taskflow/dashboard-bulk.ts`
- `src/generated/taskflow/__tests__/dashboard-bulk.test.ts`

---

## IU-8: Dashboard Analytics Bar (MEDIUM)

**Description:** Compact status bar with key metrics display.

**Risk Tier:** MEDIUM (9 requirements, UI display)

**Canonical Requirements:**
- node-78901234g: compact status bar key metrics inline
- node-89012345g: status bar horizontal below header
- node-90123456g: max 48px height minimal padding
- node-01234567g: centered width as content not full
- node-12345678g: no vertical space consumption
- node-23456789g: display total completed overdue archived rate
- node-34567890g: inline metrics with separators
- node-45678901g: subtle text colors
- node-56789012g: no large emoji no backgrounds no hover

**Contract:**
- Inputs: Task metrics from analytics engine
- Outputs: Status bar HTML
- Invariants: Compact inline display only

**Output Files:**
- `src/generated/taskflow/dashboard-analytics-bar.ts`
- `src/generated/taskflow/__tests__/dashboard-analytics-bar.test.ts`

---

## IU-9: Dashboard Integration (HIGH)

**Description:** Integration layer that wires all dashboard components into a complete working single-page application. Manages component composition, event flow, state synchronization, and UI coordination.

**Risk Tier:** HIGH (39 requirements, complex integration, all user-facing UI components must work together)

**Canonical Requirements:**
- node-integ001: dashboard shall compose page theme task list edit form archive tabs bulk selection and analytics bar into single working page
- node-integ002: create form shall append new tasks to localStorage and trigger task grid re-render
- node-integ003: task grid shall display tasks from localStorage and pass click events to edit handlers
- node-integ004: inline edit form shall update localStorage and trigger task grid re-render on save
- node-integ005: archive tabs shall filter task grid display without page reload
- node-integ006: bulk selection shall update task grid checkbox states and show hide bulk action bar
- node-integ007: analytics bar shall recalculate on every localStorage change
- node-integ007a: analytics bar shall display inline on same line as page title in header with no visual separator line below
- node-integ008: form submit events shall validate input write to localStorage then call render functions
- node-integ008a: date inputs shall use Catppuccin Mocha theme colors with matching border background and focus states
- node-integ008b: date picker component shall be styled with Catppuccin Mocha theme colors
- node-integ008c: date picker shall display calendar grid with month year navigation and themed day selection
- node-integ009: status transition buttons shall update task status update updated_at timestamp write to localStorage then re-render
- node-integ00a: edit button clicks shall hide card content div and show edit form sibling
- node-integ00b: cancel save buttons shall toggle display none on edit form and restore card view
- node-integ00c: archive restore actions shall set archived flag with timestamp write to localStorage then re-render current view
- node-integ00d: delete actions shall show confirmation modal then on confirm remove from localStorage and re-render
- node-integ00e: tab clicks shall switch view state active archived clear bulk selection re-render task grid
- node-integ00f: localStorage key taskflow_tasks shall be single source of truth for all components
- node-integ010: all components shall read from localStorage on every render no in-memory caching
- node-integ011: write operations shall complete before triggering re-render synchronous flow
- node-integ012: state mutations shall include updated_at timestamp automatically
- node-integ013: archived tasks shall retain all original data plus archived boolean and archived_at timestamp
- node-integ013a: create form and task grid shall render side by side in two-column layout on desktop create form on left task grid on right
- node-integ013b: on mobile create form shall stack above task grid in single column
- node-integ013c: create form and task grid shall align at same top height for visual symmetry
- node-integ014: active tab shall show task cards with status badges archived tasks shown with dimmed strikethrough badge overlay
- node-integ014a: active tab shall display done tasks in separate section below active tasks with completed heading using same grid layout as active tasks
- node-integ015: archived tab shall show archived tasks with original status badge plus archived indicator
- node-integ016: bulk action bar shall only appear when selectedIds length greater than 0
- node-integ017: bulk bar shall disable archive button when viewing archived tab disable restore when viewing active tab
- node-integ018: confirmation modal shall overlay entire page with semi-transparent background
- node-integ019: modal confirm action shall execute callback then close modal
- node-integ01a: escape key shall cancel modal click outside modal shall cancel
- node-integ01b: no component shall read localStorage state
- node-integ01c: no state change shall occur without updating localStorage first
- node-integ01d: re-renders shall be synchronous following state updates
- node-integ01e: all event handlers shall be attached on initial page load
- node-integ01f: components shall not have external dependencies all data from localStorage

**Contract:**
- Inputs: None (self-contained; reads from localStorage)
- Outputs: Complete working HTML page with all components wired together
- Invariants: localStorage is single source of truth; all renders read fresh state; writes complete before re-render; no external dependencies

**Output Files:**
- `src/generated/taskflow/dashboard-integration.ts`
- `src/generated/taskflow/__tests__/dashboard-integration.test.ts`

---

## Summary

| IU | Name | Risk | Requirements | Test File |
|----|------|------|--------------|-----------|
| 1 | Task Domain Model | MEDIUM | 21 | ✅ |
| 2 | Analytics Engine | MEDIUM | 10 | ✅ |
| 3 | Dashboard Page & Theme | HIGH | 15 | ✅ |
| 4 | Dashboard Task List | HIGH | 8 | ✅ |
| 5 | Dashboard Edit UI | HIGH | 11 | ✅ |
| 6 | Dashboard Archive UI | HIGH | 9 | ✅ |
| 7 | Dashboard Bulk Operations | HIGH | 10 | ✅ |
| 8 | Dashboard Analytics Bar | MEDIUM | 9 | ✅ |
| 9 | Dashboard Integration | HIGH | 32 | ✅ |

**Total: 9 IUs, 125 canonical requirements mapped**

**Changes from previous run:**
- Added IU-9: Dashboard Integration (32 requirements, wires all components into working app)
- IU-9 covers component wiring, event flow, state management, UI coordination
- Updated requirement count from 93 to 125
