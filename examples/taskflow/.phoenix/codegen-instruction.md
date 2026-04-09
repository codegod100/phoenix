# Phoenix Code Generation Instruction

## Language Context

**Detected Language:** TypeScript (Web)  
**Module System:** esm  
**File Extension:** .ts

## Theory Mapping (ThIU → ThTypeScriptWeb)

This instruction includes a theory morphism that maps Implementation Units to TypeScript (Web) constructs.

### IU → Language Function Mapping

- Metrics Domain (medium):
    - computMetrics(): any
- Priority Domain (low):
    (no exports)
- Team Domain (low):
    (no exports)
- Task Domain (high):
    - async restorTasks(): Promise<any>
    - async list(): Promise<any>
    - async a(): Promise<any>
    - async renderA(): Promise<any>
- Assignment Domain (low):
    - async assignTasks(): Promise<any>
    - async queryTasks(): Promise<any>
- Search Domain (low):
    - async searchTasks(): Promise<any>
    - search(): any
    - async filterTasks(): Promise<any>
    - filterByStatus(): any
- Deadline Domain (low):
    - list(): any
    - a(): any
- Status Domain (high):
    - async renderTasks(): Promise<any>
- Archive Domain (high):
    - async viewTasks(): Promise<any>
    - async queryTasks(): Promise<any>
    - async archive(): Promise<any>
    - async renderStatus(): Promise<any>
- Page Domain (high):
    - async renderHeader(): Promise<any>
- Catppuccin Domain (medium):
    (no exports)
- Base Domain (high):
    - async renderDatepicker(): Promise<any>
    - async getDatepickerHTML(): Promise<any>
    - async renderGrid(): Promise<any>
    - async showDatepicker(): Promise<any>
    - async hideDatepicker(): Promise<any>
    - async renderPickerpopover(): Promise<any>
    - async showPickerpopover(): Promise<any>
    - async hidePickerpopover(): Promise<any>
- Tab Domain (medium):
    (no exports)
- Bulk Domain (high):
    - async render3px(): Promise<any>
    - async bulk(): Promise<any>
    - async a(): Promise<any>
- Delete Domain (low):
    - delete(): any
- Confirmation Domain (low):
    (no exports)
- Create Domain (low):
    (no exports)
- Inline Domain (high):
    (no exports)
- Edit Domain (medium):
    - edit(): any
- Component Domain (high):
    (no exports)
- Event Domain (high):
    (no exports)
- State Domain (high):
    (no exports)
- UI Domain (high):
    (no exports)
- Modal Domain (high):
    (no exports)
- Integration Domain (high):
    (no exports)
- Overdue Domain (low):
    (no exports)
- Data Domain (high):
    (no exports)

### Constraint → Implementation Mapping

- UNMATCHED: "metrics must be computable from an array of task r..." → manual review needed
- UNMATCHED: "unassigned tasks must be excluded from team perfor..." → manual review needed
- UNMATCHED: "invalid status transitions must be rejected with a..." → manual review needed
- UNMATCHED: "assignment must validate that the user id is nonem..." → manual review needed
- UNMATCHED: "an empty search query must return all tasks..." → manual review needed
- UNMATCHED: "setting a deadline in the past must produce a warn..." → manual review needed
- UNMATCHED: "no theme toggle or system preference detection cat..." → manual review needed
- UNMATCHED: "the tab button must use borderradius 0 to ensure p..." → manual review needed
- UNMATCHED: "the highlight line must not use any boxshadow or g..." → manual review needed
- UNMATCHED: "cards must not display any left border highlight o..." → manual review needed
- UNMATCHED: "the create form must validate that title is nonemp..." → manual review needed
- autocompleteoff attribute: "create form inputs must use autocompleteoff attrib..." → autocomplete="off" on input elements
- autocompleteoff attribute: "form inputs must use autocompleteoff attribute to ..." → autocomplete="off" on input elements
- autocompleteoff attribute: "all modal form inputs must use autocompleteoff att..." → autocomplete="off" on input elements
- UNMATCHED: "no component shall render without reading current ..." → manual review needed
- UNMATCHED: "no state change shall occur without updating local..." → manual review needed
- UNMATCHED: "rerenders shall be synchronous following state upd..." → manual review needed
- UNMATCHED: "all event handlers shall be attached on initial pa..." → manual review needed
- UNMATCHED: "components shall not have external dependencies wi..." → manual review needed

## Deliverable Structure

**Server Framework:** Node.js native http  
**UI Pattern:** inline HTML/JS  
**State Management:** in-memory Map

**Output Files:**
- `/home/nandi/code/phoenix/examples/taskflow/src/generated/app/server.ts`
- `/home/nandi/code/phoenix/examples/taskflow/src/generated/app/store.ts`

## Your Task

1. **Read the full canonical.json** at: `/home/nandi/code/phoenix/examples/taskflow/.phoenix/graphs/canonical.json`
2. **Read the language theory** at: `/home/nandi/code/phoenix/examples/taskflow/.phoenix/language-theory.json`
3. **Generate code in TypeScript (Web)** in: `/home/nandi/code/phoenix/examples/taskflow/src/generated`

### Requirements

- Implement ALL IU functions using the mapped signatures above
- Apply ALL canonical constraints using the mapped implementations
- Follow TypeScript (Web) idioms and best practices
- Include traceability comments: `// @phoenix-canon: <canon-id>`
- Use esm module system

### Language-Specific Patterns

- autocompleteoff attribute: autocomplete="off" on input elements
- enter key submits form: keydown event listener with e.key === "Enter"
- autofocus: element.focus() call after modal open
- form validation: HTML5 validation attributes or JS validation

## Output

Generate complete, working TypeScript (Web) code. No TODOs for core functionality.

---
Generated: 2026-04-09T04:29:21.290Z
Language Variant: typescript-web
