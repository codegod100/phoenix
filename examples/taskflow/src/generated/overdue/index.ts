// 🔴 RED: Overdue Domain (IU-2ff32cc9)
// Description: Implements overdue functionality with 1 requirements
// Risk Tier: LOW

// @phoenix-iu: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: true
// @phoenix-migrated: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
// @phoenix-migrated: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
// @phoenix-migrated: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
// @phoenix-name: Overdue Domain
// @phoenix-risk: low
// @phoenix-short: IU-2ff32cc9

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: a38b112678258c10...
// REQUIREMENT: overdue tasks must have a red border and an overdue indicator


// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-2ff32cc9
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// === TYPES ===
// @phoenix-gen: types

export interface Overdue {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

// @phoenix-canon: a38b112678258c10...
// REQUIREMENT: overdue tasks must have a red border and an overdue indicator
/**
 * 🔴 RED: getOverdueTasks
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function getOverdueTasks(id: string): Overdue | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}
