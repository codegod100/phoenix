# Canonical Requirements

Generated from spec files. Each requirement has a unique hash-based ID.

## Task Domain

- [node-a1b2c3d4] system shall support creating tasks with title description priority low medium high critical
- [node-b2c3d4e5] system shall generate unique task id as uuid v4
- [node-c3d4e5f6] system shall support status transitions open to in_progress to review to done and done to open for reopening
- [node-d4e5f678] system shall reject invalid status transitions with clear error message
- [node-e5f67890] system shall track created_at and updated_at timestamps automatically
- [node-f6789012] system shall record completion timestamp and duration when task completed
- [node-67890123] system shall support archiving tasks to hide from active views while retaining data
- [node-78901234] system shall support restoring archived tasks to previous active status
- [node-89012345] system shall provide function to list all archived tasks separately from active tasks
- [node-90123456] system shall support assigning task to single user by user id
- [node-01234567] system shall log previous assignee in audit trail when reassigning
- [node-12345678] system shall allow querying unassigned tasks as filtered list
- [node-23456789] system shall validate user id is non-empty on assignment
- [node-34567890] system shall support searching tasks by title substring case-insensitive
- [node-45678901] system shall support filtering tasks by status priority assignee and archived state
- [node-56789012] system shall sort search results by priority critical first then created_at
- [node-67890123a] system shall return all tasks when search query is empty
- [node-78901234a] system shall support optional deadline dates on tasks
- [node-89012345a] system shall automatically flag overdue tasks past deadline and not done
- [node-90123456a] system shall provide function to list all overdue tasks
- [node-01234567a] system shall allow setting deadline in past with warning

## Analytics Domain

- [node-12345678a] system shall track total tasks created completed and overdue
- [node-23456789a] system shall calculate average task completion time in hours
- [node-34567890a] system shall compute throughput as tasks completed per day over rolling 7-day window
- [node-45678901a] system shall compute metrics from array of task records no database dependency
- [node-56789012a] system shall report task count grouped by priority level
- [node-67890123b] system shall report task count grouped by current status
- [node-78901234b] system shall include percentage of total in each breakdown
- [node-89012345b] system shall calculate per-assignee completion rate done divided by total assigned
- [node-90123456b] system shall identify top performer highest completion rate with minimum 3 tasks
- [node-01234567b] system shall exclude unassigned tasks from team performance metrics

## Dashboard Base UI

- [node-12345678b] dashboard shall render complete html page with inline css and javascript
- [node-23456789b] dashboard shall display compact header with title taskflow minimal vertical padding 32px height
- [node-34567890b] dashboard shall use css custom properties for all catppuccin colors
- [node-45678901b] dashboard layout shall be responsive single column mobile multi-column desktop

## Catppuccin Theme (Definitions)

- [def-1a2b3c4d] catppuccin mocha is exclusive theme no toggle
- [def-2b3c4d5e] background color is 1e1e2e base card background is 313244 surface0
- [def-3c4d5e6f] text color is cdd6f4 secondary text is a6adc8 subtext0
- [def-4d5e6f78] primary accent is 89b4fa blue success is a6e3a1 green warning is f9e2af yellow danger is f38ba8 red
- [def-5e6f7890] priority critical is f38ba8 red high is fab387 peach medium is f9e2af yellow low is a6e3a1 green
- [def-6f789012] status open is 6c7086 overlay0 in_progress is 89b4fa blue review is cba6f7 mauve done is a6e3a1 green archived is 585b70 surface1 dimmed

## Dashboard Styles

- [node-56789012b] dashboard shall use css custom properties for theming primary danger success warning
- [node-67890123c] cards shall have subtle shadows rounded corners 8px and hover effects
- [node-78901234c] font shall be system-ui with size hierarchy h1 1.5rem body 0.95rem
- [node-89012345c] buttons shall have rounded corners appropriate padding cursor pointer

## Dashboard Task List

- [node-90123456c] dashboard shall render all tasks as styled cards in responsive grid layout
- [node-01234567c] each task card shall show title description priority badge status badge assignee deadline
- [node-12345678c] priority badges shall be color-coded critical red high orange medium yellow low green
- [node-23456789c] status badges shall be color-coded open gray in_progress blue review purple done green archived overlay0 dim
- [node-34567890c] overdue tasks shall have red border and overdue indicator
- [node-45678901c] each card shall have buttons for status transitions based on current status
- [node-56789012c] tasks shall persist in browser localstorage and survive page refreshes
- [node-67890123d] dashboard shall immediately display all tasks from localstorage on page load

## Dashboard Edit UI

- [node-78901234d] page shall include form to create new tasks with title description priority dropdown optional deadline
- [node-89012345d] create form shall validate title is non-empty before submission
- [node-90123456d] each task card shall have edit button replacing card content with edit form not modal
- [node-01234567d] edit form shall appear in place of card content with pre-populated fields
- [node-12345678d] card content shall be wrapped in card-content div hideable via css display
- [node-23456789d] edit form shall be sibling to card-content div not nested
- [node-34567890d] clicking edit shall hide card-content and show edit-form via inline style toggling
- [node-45678901d] edit form shall have save and cancel buttons with clear visual distinction
- [node-56789012d] clicking cancel or saving shall restore task card view hide edit-form show card-content
- [node-67890123e] users shall edit task properties title description priority deadline assignee
- [node-78901234e] editing task shall update updated_at timestamp automatically

## Dashboard Archive UI

- [node-89012345e] archived tasks shall be viewable via separate archived tasks tab or filter
- [node-90123456e] switching between active and archived views shall update task list without page reload
- [node-01234567e] archived tasks shall be queryable separately and restorable to active status
- [node-12345678e] users shall archive completed tasks hide from active views retain data
- [node-23456789e] archived status shall be visually indicated on task card status badge with muted dim appearance
- [node-34567890e] archived tasks shall display archived status badge when viewing active tab dimmed strikethrough style
- [node-45678901e] when viewing archived tab tasks show original status with archived indicator overlay
- [node-56789012e] archived tasks shall display in same grid layout as active tasks
- [node-67890123f] archived task cards shall have restore button to reactivate

## Dashboard Bulk Operations

- [node-78901234f] bulk selection checkboxes shall appear on each task card for multi-select
- [node-89012345f] header shall include bulk action bar when tasks selected delete selected archive selected
- [node-90123456f] system shall support bulk operations delete multiple archive multiple reassign multiple
- [node-01234567f] system shall provide function to bulk delete tasks by id list with confirmation modal
- [node-12345678f] users shall delete tasks by unique id
- [node-23456789f] each task card shall have delete button opening confirmation modal not browser alert
- [node-34567890f] delete button shall use danger color red and include trash icon
- [node-45678901f] deleted tasks shall be removed from all filtered views and search results
- [node-56789012f] all confirmation dialogs shall be custom modal overlays not browser confirm alert popups
- [node-67890123g] deleting task shall require confirmation via custom modal dialog

## Dashboard Analytics Bar

- [node-78901234g] dashboard shall include compact status bar showing key metrics inline
- [node-89012345g] status bar shall render as single horizontal bar below header
- [node-90123456g] status bar shall be visually compact max 48px height minimal padding
- [node-01234567g] status bar shall be centered horizontally only as wide as content not full-width
- [node-12345678g] status bar shall not consume vertical space like previous metric cards design
- [node-23456789g] status bar shall display total tasks count completed count overdue count archived count completion rate percentage
- [node-34567890g] metrics shall display inline with simple separators
- [node-45678901g] status bar shall use subtle text colors primary values in ctp-text labels in ctp-subtext0
- [node-56789012g] no emoji icons larger than text no card backgrounds no hover effects

---

## Dashboard Integration


## Dashboard Integration

- [node-integ001] dashboard shall compose page theme task list edit form archive tabs bulk selection and analytics bar into single working page
- [node-integ002] create form shall append new tasks to localStorage and trigger task grid re-render
- [node-integ003] task grid shall display tasks from localStorage and pass click events to edit handlers
- [node-integ004] inline edit form shall update localStorage and trigger task grid re-render on save
- [node-integ005] archive tabs shall filter task grid display without page reload
- [node-integ006] bulk selection shall update task grid checkbox states and show hide bulk action bar
- [node-integ007] analytics bar shall recalculate on every localStorage change
- [node-integ007a] analytics bar shall display inline on same line as page title in header with no visual separator line below
- [node-integ008] form submit events shall validate input write to localStorage then call render functions
- [node-integ008a] date inputs shall use Catppuccin Mocha theme colors with matching border background and focus states
- [node-integ008b] date picker component must be styled with Catppuccin Mocha theme colors
- [node-integ008c] date picker must display calendar grid with month year navigation and themed day selection
- [node-integ009] status transition buttons shall update task status update updated_at timestamp write to localStorage then re-render
- [node-integ00a] edit button clicks shall hide card content div and show edit form sibling
- [node-integ00b] cancel save buttons shall toggle display none on edit form and restore card view
- [node-integ00c] archive restore actions shall set archived flag with timestamp write to localStorage then re-render current view
- [node-integ00d] delete actions shall show confirmation modal then on confirm remove from localStorage and re-render
- [node-integ00e] tab clicks shall switch view state active archived clear bulk selection re-render task grid
- [node-integ00f] localStorage key taskflow_tasks shall be single source of truth for all components
- [node-integ010] all components shall read from localStorage on every render no in-memory caching
- [node-integ011] write operations shall complete before triggering re-render synchronous flow
- [node-integ012] state mutations shall include updated_at timestamp automatically
- [node-integ013] archived tasks shall retain all original data plus archived boolean and archived_at timestamp
- [node-integ013a] create form and task grid shall render side by side in two-column layout on desktop create form on left task grid on right
- [node-integ013b] on mobile create form shall stack above task grid in single column
- [node-integ013c] create form and task grid shall align at same top height for visual symmetry
- [node-integ014] active tab shall show task cards with status badges archived tasks shown with dimmed strikethrough badge overlay
- [node-integ014a] active tab shall display done tasks in separate section below active tasks with completed heading using same grid layout as active tasks
- [node-integ015] archived tab shall show archived tasks with original status badge plus archived indicator
- [node-integ016] bulk action bar shall only appear when selectedIds length greater than 0
- [node-integ017] bulk bar shall disable archive button when viewing archived tab disable restore when viewing active tab
- [node-integ018] confirmation modal shall overlay entire page with semi-transparent background
- [node-integ019] modal confirm action shall execute callback then close modal
- [node-integ01a] escape key shall cancel modal click outside modal shall cancel
- [node-integ01b] no component shall render without reading current localStorage state
- [node-integ01c] no state change shall occur without updating localStorage first
- [node-integ01d] re-renders shall be synchronous following state updates
- [node-integ01e] all event handlers shall be attached on initial page load
- [node-integ01f] components shall not have external dependencies all data from localStorage
