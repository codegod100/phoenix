// 🔴 RED: Tab Domain (IU-cf6962ca)
// Description: Implements tab functionality with 9 requirements
// Risk Tier: MEDIUM

// @phoenix-iu: cf6962caff7e397d251009ef1c4f815369b02a37c0e7837de1b323120d3a6d1b
// @phoenix-name: Tab Domain
// @phoenix-risk: medium
// @phoenix-short: IU-cf6962ca

// === IMPLEMENTED REQUIREMENTS ===

// @phoenix-canon: 196bfc916d3f0b76...
// DEFINITION: the tab highlight must animate with a 200ms transition when switching between...

// @phoenix-canon: 2bc7e5e88ba5e0b8...
// CONSTRAINT: the highlight line must not use any boxshadow or gradient effects that could ...

// @phoenix-canon: 45293a7b83061cdd...
// REQUIREMENT: inactive tabs must show no underline or highlight

// @phoenix-canon: 8f5ee864ccd9e7ef...
// REQUIREMENT: the active tab must use a straight horizontal highlight line underneath the t...

// @phoenix-canon: 909445f046403c1f...
// REQUIREMENT: the tab container must have a subtle bottom border separator line using surfa...

// @phoenix-canon: 91f627e610b4794b...
// DEFINITION: the highlight line must have no rounded corners or curved edges

// @phoenix-canon: b2e88a7f1128cf4c...
// CONSTRAINT: the tab button must use borderradius 0 to ensure perfectly straight edges

// @phoenix-canon: b3e81cef6081f47a...
// DEFINITION: the highlight line must span the full width of the tab button

// @phoenix-canon: be8721be55cfdeda...
// DEFINITION: the highlight line must be a 3px solid line using the primary accent color 89...


// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-cf6962ca
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// === TYPES ===
// @phoenix-gen: types

export interface Tab {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

// @phoenix-canon: 196bfc916d3f0b76...
// DEFINITION: the tab highlight must animate with a 200ms transition when switching between...
/**
 * 🔴 RED: create
 *
 * TDD: Fix this function to make tests pass
 * @phoenix-gen: function
 */
export function create(id: string): Tab | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}
