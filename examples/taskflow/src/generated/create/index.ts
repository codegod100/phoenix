// 🔴 RED: Create Domain (IU-8ae5c45f)
// Description: Implements create functionality with 2 requirements
// Risk Tier: LOW

// @phoenix-iu: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0
// @phoenix-migrated: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0
// @phoenix-migrated: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0
// @phoenix-name: Create Domain
// @phoenix-risk: low
// @phoenix-short: IU-8ae5c45f

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: 2e61381676836dee...
// REQUIREMENT: the page must include a form to create new tasks with fields for title descri...

// @phoenix-canon: 65cf841d09b215ab...
// CONSTRAINT: the create form must validate that title is nonempty before submission


// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-8ae5c45f
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// === TYPES ===
// @phoenix-gen: types

export interface Create {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

// @phoenix-canon: 2e61381676836dee...
// REQUIREMENT: the page must include a form to create new tasks with fields for title descri...
/**
 * 🔴 RED: setDeadline
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function setDeadline(item: Create): Create {
  // 🔴 RED: WRONG — returns input unchanged
  // Should: Processed results
  return item; // ← No transformation!
}

// @phoenix-canon: 65cf841d09b215ab...
// CONSTRAINT: the create form must validate that title is nonempty before submission
/**
 * 🔴 RED: getOverdueTasks
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function getOverdueTasks(id: string): Create | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}

// @phoenix-canon: 2e61381676836dee...
// REQUIREMENT: the page must include a form to create new tasks with fields for title descri...
/**
 * 🔴 RED: setPriority
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function setPriority(item: Create): Create {
  // 🔴 RED: WRONG — returns input unchanged
  // Should: Processed results
  return item; // ← No transformation!
}

// @phoenix-canon: 65cf841d09b215ab...
// CONSTRAINT: the create form must validate that title is nonempty before submission
/**
 * 🔴 RED: filterByPriority
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function filterByPriority(id: string): Create | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}
