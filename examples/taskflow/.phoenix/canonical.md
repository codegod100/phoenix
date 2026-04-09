# Canonical Requirements

Generated from spec files. Each requirement has a unique hash-based ID.

## Metrics

- [node-41e8bd3b] the system must track total tasks created completed and overdue
- [node-d069da15] the system must calculate average task completion time in hours
- [node-e25f9b8a] the system must compute throughput as tasks completed per day over a rolling 7day window
- [node-6fd3cccf] metrics must be computable from an array of task records with no database dependency

## Priority Breakdown

- [node-dbd7a98a] the system must report task count grouped by priority level
- [node-1e36aa90] the system must report task count grouped by current status
- [node-c302c6dc] each breakdown must include percentage of total

## Team Performance

- [node-c384544c] the system must calculate perassignee completion rate as done divided by total assigned
- [node-21a8432f] the system must identify the top performer with highest completion rate and minimum 3 tasks
- [node-7b890674] unassigned tasks must be excluded from team performance metrics

## Task Lifecycle

- [node-0ec58c72] users must create tasks with a title description and priority low medium high critical
- [node-950b3215] each task must have a unique id generated as a uuid v4
- [node-26e1ab36] tasks must support status transitions open inprogress review done and done open for reopening completed tasks
- [node-bc27c9f0] invalid status transitions must be rejected with a clear error message
- [node-22c19be3] tasks must track createdat and updatedat timestamps automatically
- [node-3dee3bcd] completing a task must record the completion timestamp and duration
- [node-400ee183] tasks must support archiving to hide from active views while retaining data
- [node-a16f8174] archived tasks must be restorable to their previous active status
- [node-c438a077] the system must provide a function to list all archived tasks separately from active tasks
- [node-6e2403b9] tasks must support tagging with multiple labels for flexible categorization

## Assignment

- [node-5e0a0179] tasks must be assignable to a single user by user id
- [node-f8cbfa7d] reassigning a task must log the previous assignee in an audit trail
- [node-3d832f26] unassigned tasks must be queryable as a filtered list
- [node-b604c9da] assignment must validate that the user id is nonempty

## Search and Filtering

- [node-49a95edd] tasks must be searchable by title substring caseinsensitive
- [node-d87a8adb] tasks must be filterable by status priority assignee and archived state
- [node-d162133c] search results must be sorted by priority critical first then by createdat
- [node-fa9e6c9a] an empty search query must return all tasks

## Deadline Management

- [node-45db4350] tasks must support optional deadline dates
- [node-3306386e] overdue tasks past deadline and not done must be flagged automatically
- [node-23a499c1] the system must provide a function to list all overdue tasks
- [node-b085dd42] setting a deadline in the past must produce a warning but still be allowed

## Status Bar Layout

- [node-eb6fcdb5] the dashboard must include an elegant analytics bar showing key metrics inline
- [node-c4e21e3e] the status bar must render as a horizontal bar below the header with comfortable spacing
- [node-87f6aafe] the status bar must have 56px height with generous vertical padding for visual breathing room
- [node-5e9d6248] the status bar must be centered horizontally and only as wide as its content not fullwidth
- [node-e5a204e2] the status bar must use a subtle surface0 background with rounded 8px corners for a modern cardlike appearance

## Status Bar Metrics

- [node-e5d9fbf0] the status bar must display total tasks count completed count overdue count archived count and completion rate percentage
- [node-f4e01844] each metric must be displayed as a pillshaped badge with surface1 background 6px 12px padding and 4px borderradius
- [node-ccb161d8] metric values must use fontweight 600 semibold in ctptext color
- [node-c8ea3a9e] metric labels must use fontweight 400 in ctpsubtext0 color with a colon separator
- [node-f680ef5e] format example tasks 12 done 8 overdue 2 archived 3 rate 67
- [node-9605be0b] badges must have 8px gap between them and subtle hover effect with surface2 background
- [node-c24d1ac5] use consistent icon prefixes with fontsize matching text 085rem
- [node-8d42c17a] completion rate badge uses accent color 89b4fa for the percentage value to highlight success metric

## Metrics Calculation

- [node-eb443327] the system must track total tasks created completed overdue and archived

## Archive Tab Navigation

- [node-81f910f8] archived tasks must be viewable via a separate archived tasks tab or filter
- [node-78f83d3c] switching between active and archived views must update the task list without a full page reload

## Archive Data

- [node-79afe298] archived tasks must be queryable separately and restorable to active status
- [node-0bfbf4eb] users must be able to archive completed tasks to hide from active views but retain data
- [node-1cedce76] archived status must be visually indicated on the task card status badge with a muted or dim appearance

## Archive Status Badge

- [node-9cc63176] archived tasks must display an archived status badge when viewing the active tab with dimmed or strikethrough style
- [node-0bbf6f69] when viewing the archived tab tasks show their original status with an archived indicator overlay

## Archive Display

- [node-dfcddaf1] archived tasks must be displayed in the same grid layout as active tasks
- [node-0dfbaefa] archived task cards must have a restore button to reactivate them

## Page Structure

- [node-e5812b6a] the dashboard must render a complete html page with inline css and javascript
- [node-30d7c5ac] the page must be encoded in utf8 with proper charset meta tag
- [node-bf3ef52e] the page must include a viewport meta tag for responsive scaling
- [node-68b2d5f2] the page must display a spacious header with the title taskflow with comfortable vertical padding 48px height centered content and larger text with fontweight 600
- [node-3b90fe00] the dashboard must use css custom properties for all catppuccin colors
- [node-aab62f83] the layout must be responsive with single column on mobile and multicolumn grid on desktop

## Catppuccin Theme

- [node-023acc45] the dashboard must use the catppuccin mocha color palette exclusively
- [node-e2ea22fa] background color is 1e1e2e base card background is 313244 surface0
- [node-5897f7d8] text color is cdd6f4 text secondary text is a6adc8 subtext0
- [node-b90a45d9] primary accent is 89b4fa blue success is a6e3a1 green warning is f9e2af yellow danger is f38ba8 red
- [node-ed4b8264] priority critical is f38ba8 red high is fab387 peach medium is f9e2af yellow low is a6e3a1 green
- [node-894211f4] status open is 6c7086 overlay0 inprogress is 89b4fa blue review is cba6f7 mauve done is a6e3a1 green archived is 585b70 surface1 dimmed
- [node-a7e9866b] no theme toggle or system preference detection catppuccin mocha is the only theme

## Base Styles

- [node-1d98cea9] the dashboard must use css custom properties for theming with primary danger success and warning colors
- [node-9d6580ba] cards must have subtle shadows rounded corners of 8px and hover effects
- [node-58b80bc5] the font must be systemui with appropriate size hierarchy h1 15rem body 095rem
- [node-c90f58eb] buttons must have rounded corners appropriate padding and cursor pointer
- [node-39f5873b] date inputs must use a custom date picker component styled with catppuccin mocha theme
- [node-71c8e6f5] the custom date picker must display a calendar grid with proper month and year navigation
- [node-2333b865] date picker days must have hover states and selected day highlighting using theme colors
- [node-0e495d1e] date picker popover must use ctpsurface0 background with ctpsurface1 borders

## Tab Navigation Design

- [node-8f5ee864] the active tab must use a straight horizontal highlight line underneath the tab text
- [node-be8721be] the highlight line must be a 3px solid line using the primary accent color 89b4fa
- [node-b3e81cef] the highlight line must span the full width of the tab button
- [node-91f627e6] the highlight line must have no rounded corners or curved edges
- [node-b2e88a7f] the tab button must use borderradius 0 to ensure perfectly straight edges
- [node-2bc7e5e8] the highlight line must not use any boxshadow or gradient effects that could create a curved appearance
- [node-45293a7b] inactive tabs must show no underline or highlight
- [node-909445f0] the tab container must have a subtle bottom border separator line using surface0 color
- [node-196bfc91] the tab highlight must animate with a 200ms transition when switching between tabs

## Bulk Selection

- [node-a6f0ad57] clicking anywhere on a task card shall toggle its selection state for multiselect operations
- [node-f72241db] selected cards must display a prominent 3px solid blue 89b4fa left border indicator
- [node-7d96ab28] selected cards must use surface2 background color 585b70 to clearly distinguish from unselected cards
- [node-32dcf102] the card cursor must change to pointer on hover to indicate clickability
- [node-66b1f11e] individual action buttons on cards edit archive delete must remain clickable without triggering card selection via stoppropagation
- [node-dd472043] the header must include a bulk action bar when tasks are selected including delete selected and archive selected
- [node-ca5a17a3] the selection state is tracked by addingremoving task ids from a selectedids array in javascript
- [node-1a410f8a] card selection visual feedback uses css class selected toggled on the card element

## Bulk Actions

- [node-47e0a64c] the system must support bulk operations including delete multiple archive multiple and reassign multiple
- [node-7580079c] the system must provide a function to bulk delete multiple tasks by id list with confirmation modal

## Delete Operations

- [node-0ca3fa4b] users must be able to delete tasks by their unique id
- [node-4c489789] each task card must have a delete button that opens a confirmation modal not browser alert before permanent removal
- [node-c37ac43e] the delete button must use the danger color red and include a trash icon
- [node-d612bbc6] deleted tasks must be removed from all filtered views and search results

## Confirmation Modal

- [node-796b4e36] all confirmation dialogs must be custom modal overlays not browser confirm or alert popups
- [node-12fb0edc] deleting a task must require confirmation via a custom modal dialog not browser confirm or alert

## Create Task Form

- [node-2e613816] the page must include a form to create new tasks with fields for title description priority dropdown and optional deadline date
- [node-65cf841d] the create form must validate that title is nonempty before submission
- [node-2cbb7095] create form inputs must use autocompleteoff attribute to disable browser autocomplete

## Inline Edit Form

- [node-56c320fc] each task card must have an edit button that replaces the card content with an edit form not a modal dialog
- [node-11d42093] the edit form must appear in place of the task card content and contain prepopulated fields for all editable properties
- [node-dad35101] the card content must be wrapped in a cardcontent div that can be hidden via css display property
- [node-ed55103a] the edit form must be a sibling element to the cardcontent div not nested inside it
- [node-9b1a9108] clicking edit must hide the cardcontent div and show the editform div using inline style display toggling

## Edit Form Controls

- [node-c3ae3e10] the edit form must have save and cancel buttons with clear visual distinction
- [node-0b7df6f4] clicking cancel or saving must restore the task card view by hiding editform and showing cardcontent
- [node-a5367452] users must be able to edit task properties including title description priority deadline and assignee
- [node-f2484cdf] form inputs must use autocompleteoff attribute to disable browser autocomplete and prevent the browser from suggesting previously entered values

## Edit Persistence

- [node-8ecb8220] editing a task must update the updatedat timestamp automatically

## Component Wiring

- [node-93e388ff] the dashboard shall compose the page theme task list edit form archive tabs bulk selection and analytics bar into a single working page
- [node-f20e473e] the analytics bar shall display inline on the same line as the page title in the header with no visual separator line below
- [node-3b3b6ce2] the create form shall append new tasks to localstorage and trigger task grid rerender
- [node-72c4a2c4] the task grid shall display tasks from localstorage and pass click events to edit handlers
- [node-a731f6b4] the inline edit form shall update localstorage and trigger task grid rerender on save
- [node-a9bd9ecc] the archive tabs shall filter task grid display without page reload
- [node-b4dff0da] the bulk selection shall update task card visual selection states and show or hide bulk action bar
- [node-09a6c752] the analytics bar shall recalculate on every localstorage change

## Event Flow

- [node-2623171e] form submit events shall validate input write to localstorage then call render functions
- [node-3cabdbba] status transition buttons shall update task status update updatedat timestamp write to localstorage then rerender
- [node-4c22b2bd] edit button clicks shall hide card content div and show edit form sibling
- [node-befecd91] cancel and save buttons shall toggle display none on edit form and restore card view
- [node-62e72074] archive and restore actions shall set archived flag with timestamp write to localstorage then rerender current view
- [node-e6ea15b2] delete actions shall show confirmation modal then on confirm remove from localstorage and rerender
- [node-493bf4f1] tab clicks shall switch view state between active and archived clear bulk selection and rerender task grid

## State Management

- [node-0afc29d5] localstorage key taskflowtasks shall be the single source of truth for all components
- [node-4a49ae7c] all components shall read from localstorage on every render with no inmemory caching
- [node-01e92e24] write operations shall complete before triggering rerender using synchronous flow
- [node-f937d4a2] state mutations shall include updatedat timestamp automatically
- [node-bb1e6cc7] archived tasks shall retain all original data plus archived boolean and archivedat timestamp

## UI Coordination

- [node-93e81a34] the create form and task grid shall render side by side in a twocolumn layout on desktop with create form on left and task grid on right
- [node-7f652435] the create form and task grid module containers shall align at the exact same top edge for visual symmetry
- [node-a57321f9] both module headers with h2 titles shall have identical margin padding and lineheight
- [node-06083503] on mobile the create form shall stack above the task grid in a single column
- [node-10753d83] active tab shall show task cards with status badges and archived tasks shown with dimmed strikethrough badge overlay
- [node-01e9f448] active tab shall display done tasks in a separate section below active tasks with a completed heading
- [node-024c1a2b] done tasks must render in the same grid layout as active tasks with same column widths gaps and responsive behavior
- [node-1551cfef] archived tab shall show archived tasks with original status badge plus archived indicator
- [node-ab0772dd] bulk action bar shall only appear when selectedids length is greater than 0
- [node-d6860f3b] bulk bar shall disable archive button when viewing archived tab and disable restore when viewing active tab
- [node-a8da650f] confirmation modal shall overlay entire page with semitransparent background
- [node-7ad31f6c] modal confirm action shall execute callback then close modal
- [node-93833e52] escape key shall cancel modal and click outside modal shall cancel

## Modal Requirements

- [node-5c212153] the createedit modal dialog must fit within the viewport without requiring vertical scroll on standard desktop resolutions 1080p
- [node-de80ad85] the modal shall have a maximum width of 800px to accommodate form fields comfortably
- [node-debbb758] the modal shall use 95 of viewport width on mobile devices
- [node-0fcd31ba] the modal shall have 24px internal padding to reduce overall height
- [node-395c7bc1] the modal shall have no overflowy scrolling enabled all content must fit naturally
- [node-7141acc2] all form fields title description status priority assignee deadline tags shall be visible without scrolling on desktop
- [node-954cf409] status and priority fields shall render sidebyside in a twocolumn grid layout to save vertical space
- [node-619c9474] assignee and deadline fields shall render sidebyside in a twocolumn grid layout to save vertical space
- [node-d9ecce2e] the description textarea shall use 2 rows maximum not 3 to reduce height
- [node-d9f092d7] form field margins shall be 12px not 16px between groups to reduce overall height
- [node-90ee4a23] form labels shall have minimal 2px marginbottom to reduce spacing
- [node-fe95f87a] input padding shall be compact 6px vertical to reduce field heights
- [node-8cebf2b0] when the modal opens the title input field shall receive immediate focus for rapid data entry
- [node-987ca469] the title input shall use autofocus attribute or javascript focus call in the openmodal function
- [node-98ba0fab] pressing the enter key while in any form field shall submit the form and save the task
- [node-15db98bf] all modal form inputs must use autocompleteoff attribute to disable browser autocomplete

## Integration Invariants

- [node-1195e2f9] no component shall render without reading current localstorage state
- [node-6bb5fa7f] no state change shall occur without updating localstorage first
- [node-5a52732a] rerenders shall be synchronous following state updates
- [node-4d3caa9e] all event handlers shall be attached on initial page load
- [node-8a0318be] components shall not have external dependencies with all data from localstorage

## Task Grid Layout

- [node-27291946] the dashboard must render all tasks as styled cards in a responsive grid layout
- [node-c1cfd0b2] completed tasks with statusdone must display in a separate section below active tasks within the active tab
- [node-f6003939] the done tasks section must have a clear visual separator and heading indicating completed tasks
- [node-0c8fd64b] done tasks must use the same responsive grid layout as active tasks with identical column widths gaps and breakpoints

## Task Card Display

- [node-6741feb0] each task card must show title description priority badge status badge assignee and deadline

## Priority Badges

- [node-ef282c4f] priority badges must be colorcoded with criticalred highorange mediumyellow lowgreen

## Status Badges

- [node-dc96fbc8] status badges must be colorcoded with opengray inprogressblue reviewpurple donegreen archivedoverlay0dim

## Overdue Indicator

- [node-a38b1126] overdue tasks must have a red border and an overdue indicator

## Status Transitions

- [node-04863c16] each card must have buttons for status transitions based on current status

## Data Persistence

- [node-900da6bb] tasks must persist in browser localstorage and survive page refreshes
- [node-b5ce30f0] the dashboard must immediately display all tasks from localstorage on page load with no manual refresh needed
