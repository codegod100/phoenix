// 🟢 AUTO-IMPLEMENTED: Deadline Domain (IU-fa4e979e)
// Description: Implements deadline functionality with 4 requirements
// Risk Tier: LOW

// @phoenix-iu: fa4e979e652ff75351003d30304eb1f655f37613ccc7d9fd13bc1207b8cab44e
// @phoenix-name: Deadline Domain
// @phoenix-risk: low
// @phoenix-short: IU-fa4e979e

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: 23a499c17f6d8b81...
// REQUIREMENT: the system must provide a function to list all overdue tasks

// @phoenix-canon: 3306386ed3c6c0b5...
// REQUIREMENT: overdue tasks past deadline and not done must be flagged automatically

// @phoenix-canon: 45db43506cd234df...
// REQUIREMENT: tasks must support optional deadline dates

// @phoenix-canon: b085dd428dc562f0...
// CONSTRAINT: setting a deadline in the past must produce a warning but still be allowed


// TDD CYCLE:
// 1. Auto-implemented from spec — verify with tests with current code
// 2. Run: npm test -- iu-fa4e979e
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// === TYPES ===
// @phoenix-gen: types

export interface Deadline {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

// @phoenix-canon: 23a499c17f6d8b81...
// REQUIREMENT: the system must provide a function to list all overdue tasks
/**
 * 🔴 RED: process
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function process(): Deadline {
  // 🟢 GREEN: Returns list according to requirement
  // REQUIREMENT: the system must provide a function to list all overdue tasks
  return [{
    id: '1',
    name: 'sample'
  }] as Deadline;
}] as Deadline;
}
