// 🔴 RED: Search Domain (IU-5d746ac1)
// Description: Implements search functionality with 4 requirements
// Risk Tier: LOW

// @phoenix-iu: 5d746ac1128920d75ba29eea92baea4de98f5db5e30d13c28589bfefe5ca019f
// @phoenix-name: Search Domain
// @phoenix-risk: low
// @phoenix-short: IU-5d746ac1

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: 49a95edd719e1d20...
// REQUIREMENT: tasks must be searchable by title substring caseinsensitive

// @phoenix-canon: d162133ca6cb92ab...
// REQUIREMENT: search results must be sorted by priority critical first then by createdat

// @phoenix-canon: d87a8adb9feac0dd...
// REQUIREMENT: tasks must be filterable by status priority assignee and archived state

// @phoenix-canon: fa9e6c9a18b3b575...
// CONSTRAINT: an empty search query must return all tasks


// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-5d746ac1
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// === TYPES ===
// @phoenix-gen: types

export interface Search {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

// @phoenix-canon: 49a95edd719e1d20...
// REQUIREMENT: tasks must be searchable by title substring caseinsensitive
/**
 * 🔴 RED: process
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function process(item: Search): Search {
  // 🔴 RED: WRONG — returns input unchanged
  // Should: an empty search query must return all tasks
  return { ...item }; // ← No transformation!
}
