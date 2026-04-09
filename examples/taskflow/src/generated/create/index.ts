// 🔴 RED: Create Domain (IU-a7184071)
// Description: Implements create functionality with 3 requirements
// Risk Tier: LOW

// @phoenix-iu: a71840711883fbadc80665b28f2172f7a65a116dee522018b85b0f88d9b9c527
// @phoenix-name: Create Domain
// @phoenix-risk: low
// @phoenix-short: IU-a7184071

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: 2cbb70950a51c496...
// CONSTRAINT: create form inputs must use autocompleteoff attribute to disable browser auto...

// @phoenix-canon: 2e61381676836dee...
// REQUIREMENT: the page must include a form to create new tasks with fields for title descri...

// @phoenix-canon: 65cf841d09b215ab...
// CONSTRAINT: the create form must validate that title is nonempty before submission


// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-a7184071
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

// @phoenix-canon: 2cbb70950a51c496...
// CONSTRAINT: create form inputs must use autocompleteoff attribute to disable browser auto...
/**
 * 🔴 RED: create
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function create(id: string): Create | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}
