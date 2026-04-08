# Implementation Units

Planned from canonical requirements. Each IU groups related requirements by feature area.

---

## IU-29eaf566: Metrics Domain (MEDIUM)

**Description:** Implements metrics functionality with 5 requirements

**Risk Tier:** medium (5 requirements)

**Canonical Requirements:**
- 41e8bd3b9765...
- 6fd3cccffb26...
- d069da158b6c...
- e25f9b8a3fb3...
- eb443327a877...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/metrics/index.ts`
- `src/generated/metrics/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests

---

## IU-7cce149b: Priority Domain (LOW)

**Description:** Implements priority functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 1e36aa90a520...
- c302c6dc31cb...
- dbd7a98a77dd...
- ef282c4f5888...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/priority/index.ts`
- `src/generated/priority/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-169b3c51: Team Domain (LOW)

**Description:** Implements team functionality with 3 requirements

**Risk Tier:** low (3 requirements)

**Canonical Requirements:**
- 21a8432fc76f...
- 7b890674e3dd...
- c384544cc226...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/team/index.ts`
- `src/generated/team/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-d46cdcd2: Task Domain (HIGH)

**Description:** Implements task functionality with 15 requirements

**Risk Tier:** high (15 requirements)

**Canonical Requirements:**
- 0c8fd64b342a...
- 0ec58c72f695...
- 22c19be38ec4...
- 26e1ab361fa6...
- 27291946d9c1...
- 3dee3bcd6fc7...
- 400ee183fafc...
- 6741feb08b69...
- 6e2403b97c6f...
- 950b321591c4...
- ... and 5 more

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the dashboard must render all tasks as styled cards in a responsive grid layout
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/task/index.ts`
- `src/generated/task/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-013287c8: Assignment Domain (LOW)

**Description:** Implements assignment functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 3d832f261b6d...
- 5e0a0179854a...
- b604c9dae64a...
- f8cbfa7d6c88...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/assignment/index.ts`
- `src/generated/assignment/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-5d746ac1: Search Domain (LOW)

**Description:** Implements search functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 49a95edd719e...
- d162133ca6cb...
- d87a8adb9fea...
- fa9e6c9a18b3...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: an empty search query must return all tasks
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/search/index.ts`
- `src/generated/search/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-fa4e979e: Deadline Domain (LOW)

**Description:** Implements deadline functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 23a499c17f6d...
- 3306386ed3c6...
- 45db43506cd2...
- b085dd428dc5...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/deadline/index.ts`
- `src/generated/deadline/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-92d0c760: Status Domain (HIGH)

**Description:** Implements status functionality with 12 requirements

**Risk Tier:** high (12 requirements)

**Canonical Requirements:**
- 04863c16775d...
- 06236ca2480f...
- 1d9ff4151b5a...
- 23d13da966e4...
- 3fbf0135a960...
- 5e9d6248b4c4...
- 8394b9997e08...
- 8f060feffe64...
- dc96fbc84d80...
- e5d2dfbce7cc...
- ... and 2 more

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the status bar must render as a single horizontal bar below the header
- Invariants: the status bar must be centered horizontally and only as wide as its content not fullwidth, the status bar must not consume vertical space like the previous metric cards design

**Output Files:**
- `src/generated/status/index.ts`
- `src/generated/status/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-fc178077: Archive Domain (HIGH)

**Description:** Implements archive functionality with 9 requirements

**Risk Tier:** high (9 requirements)

**Canonical Requirements:**
- 0bbf6f693cec...
- 0bfbf4eb8ef7...
- 0dfbaefa54a5...
- 1cedce764142...
- 78f83d3cedc0...
- 79afe2985ea4...
- 81f910f80ba0...
- 9cc63176bbc9...
- dfcddaf1235e...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/archive/index.ts`
- `src/generated/archive/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-a329ef6c: Page Domain (HIGH)

**Description:** Implements page functionality with 6 requirements

**Risk Tier:** high (6 requirements)

**Canonical Requirements:**
- 30d7c5acea64...
- 3b90fe0067a3...
- aab62f839329...
- bf3ef52e9fb0...
- d36869b76eb6...
- e5812b6a5847...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the dashboard must render a complete html page with inline css and javascript
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/page/index.ts`
- `src/generated/page/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-f56c1390: Catppuccin Domain (MEDIUM)

**Description:** Implements catppuccin functionality with 7 requirements

**Risk Tier:** medium (7 requirements)

**Canonical Requirements:**
- 023acc45de37...
- 5897f7d83429...
- 894211f4ec8a...
- a7e9866bf870...
- b90a45d9d761...
- e2ea22fa125c...
- ed4b8264171a...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: no theme toggle or system preference detection catppuccin mocha is the only theme

**Output Files:**
- `src/generated/catppuccin/index.ts`
- `src/generated/catppuccin/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests

---

## IU-e9b69935: Base Domain (HIGH)

**Description:** Implements base functionality with 8 requirements

**Risk Tier:** high (8 requirements)

**Canonical Requirements:**
- 0e495d1ee4c2...
- 1d98cea9ca41...
- 2333b8650b4e...
- 39f5873bbfd3...
- 58b80bc522aa...
- 71c8e6f5c3ef...
- 9d6580bab657...
- c90f58ebacff...

**Contract:**
- Inputs: date inputs must use a custom date picker component styled with catppuccin mocha theme
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/base/index.ts`
- `src/generated/base/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-eb7c109e: Bulk Domain (LOW)

**Description:** Implements bulk functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 47e0a64ce995...
- 5ba9c276d405...
- 7580079c9863...
- dd47204341c3...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/bulk/index.ts`
- `src/generated/bulk/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-12c44af6: Delete Domain (LOW)

**Description:** Implements delete functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 0ca3fa4b0879...
- 4c4897891d89...
- c37ac43e5c7f...
- d612bbc65b30...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/delete/index.ts`
- `src/generated/delete/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-7bde30d9: Confirmation Domain (LOW)

**Description:** Implements confirmation functionality with 2 requirements

**Risk Tier:** low (2 requirements)

**Canonical Requirements:**
- 12fb0edc1287...
- 796b4e363127...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/confirmation/index.ts`
- `src/generated/confirmation/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-8ae5c45f: Create Domain (LOW)

**Description:** Implements create functionality with 2 requirements

**Risk Tier:** low (2 requirements)

**Canonical Requirements:**
- 2e6138167683...
- 65cf841d09b2...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/create/index.ts`
- `src/generated/create/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-1b10421c: Inline Domain (HIGH)

**Description:** Implements inline functionality with 5 requirements

**Risk Tier:** high (5 requirements)

**Canonical Requirements:**
- 11d42093d9e4...
- 56c320fc4463...
- 9b1a91087034...
- dad35101507f...
- ed55103ac8f5...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/inline/index.ts`
- `src/generated/inline/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-b0512ab0: Edit Domain (LOW)

**Description:** Implements edit functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 0b7df6f4e1fe...
- 8ecb82202835...
- a536745291c2...
- c3ae3e10e08b...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/edit/index.ts`
- `src/generated/edit/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-a2326ea1: Component Domain (HIGH)

**Description:** Implements component functionality with 8 requirements

**Risk Tier:** high (8 requirements)

**Canonical Requirements:**
- 09a6c7528b63...
- 3b3b6ce2da6d...
- 72c4a2c45dc1...
- 8a0f621ecff2...
- 93e388ff1c8a...
- a731f6b43208...
- a9bd9ecc8c5b...
- f20e473ea249...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the create form shall append new tasks to localstorage and trigger task grid rerender, the inline edit form shall update localstorage and trigger task grid rerender on save
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/component/index.ts`
- `src/generated/component/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-c73fdbc4: Event Domain (HIGH)

**Description:** Implements event functionality with 7 requirements

**Risk Tier:** high (7 requirements)

**Canonical Requirements:**
- 2623171ed714...
- 3cabdbbabcf6...
- 493bf4f1ea33...
- 4c22b2bde5ba...
- 62e720747aa3...
- befecd912aa1...
- e6ea15b2c95d...

**Contract:**
- Inputs: form submit events shall validate input write to localstorage then call render functions
- Outputs: form submit events shall validate input write to localstorage then call render functions, status transition buttons shall update task status update updatedat timestamp write to localstorage then rerender, archive and restore actions shall set archived flag with timestamp write to localstorage then rerender current view, delete actions shall show confirmation modal then on confirm remove from localstorage and rerender, tab clicks shall switch view state between active and archived clear bulk selection and rerender task grid
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/event/index.ts`
- `src/generated/event/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-b25d3806: State Domain (HIGH)

**Description:** Implements state functionality with 5 requirements

**Risk Tier:** high (5 requirements)

**Canonical Requirements:**
- 01e92e240085...
- 0afc29d57dce...
- 4a49ae7c4ceb...
- bb1e6cc7b2c8...
- f937d4a27dd9...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: all components shall read from localstorage on every render with no inmemory caching, write operations shall complete before triggering rerender using synchronous flow
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/state/index.ts`
- `src/generated/state/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-fa4c8303: UI Domain (HIGH)

**Description:** Implements ui functionality with 13 requirements

**Risk Tier:** high (13 requirements)

**Canonical Requirements:**
- 01e9f448f073...
- 024c1a2b29b1...
- 06083503e786...
- 10753d83edf2...
- 1551cfef5a8e...
- 7ad31f6c3116...
- 7f65243582ee...
- 93833e524931...
- 93e81a349be5...
- a57321f9ffae...
- ... and 3 more

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the create form and task grid shall render side by side in a twocolumn layout on desktop with create form on left and task grid on right, done tasks must render in the same grid layout as active tasks with same column widths gaps and responsive behavior
- Invariants: bulk action bar shall only appear when selectedids length is greater than 0

**Output Files:**
- `src/generated/ui/index.ts`
- `src/generated/ui/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-8c63f282: Modal Domain (HIGH)

**Description:** Implements modal functionality with 14 requirements

**Risk Tier:** high (14 requirements)

**Canonical Requirements:**
- 0fcd31ba2080...
- 395c7bc1288d...
- 5c212153a1ff...
- 619c94741ca3...
- 7141acc2b75a...
- 8cebf2b05843...
- 90ee4a23b51c...
- 954cf4092081...
- 987ca469857b...
- d9ecce2e6f7f...
- ... and 4 more

**Contract:**
- Inputs: input padding shall be compact 6px vertical to reduce field heights, when the modal opens the title input field shall receive immediate focus for rapid data entry, the title input shall use autofocus attribute or javascript focus call in the openmodal function
- Outputs: status and priority fields shall render sidebyside in a twocolumn grid layout to save vertical space, assignee and deadline fields shall render sidebyside in a twocolumn grid layout to save vertical space
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/modal/index.ts`
- `src/generated/modal/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-379356eb: Integration Domain (HIGH)

**Description:** Implements integration functionality with 5 requirements

**Risk Tier:** high (5 requirements)

**Canonical Requirements:**
- 1195e2f9dc63...
- 4d3caa9e1a34...
- 5a52732aa411...
- 6bb5fa7fddac...
- 8a0318be0732...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: no component shall render without reading current localstorage state, rerenders shall be synchronous following state updates
- Invariants: components shall not have external dependencies with all data from localstorage

**Output Files:**
- `src/generated/integration/index.ts`
- `src/generated/integration/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## IU-2ff32cc9: Overdue Domain (LOW)

**Description:** Implements overdue functionality with 1 requirements

**Risk Tier:** low (1 requirements)

**Canonical Requirements:**
- a38b11267825...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/overdue/index.ts`
- `src/generated/overdue/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-f5ffe871: Data Domain (HIGH)

**Description:** Implements data functionality with 2 requirements

**Risk Tier:** high (2 requirements)

**Canonical Requirements:**
- 900da6bbb6ab...
- b5ce30f01710...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/data/index.ts`
- `src/generated/data/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests
- property_tests
- threat_note

---

## Coverage Summary

- Total canonical nodes: 157
- Covered: 157
- Orphans: 0
