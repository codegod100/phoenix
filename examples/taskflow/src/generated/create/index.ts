// 🔄 MIGRATED: Create Domain (IU-8ae5c45f)
// Description: Implements create functionality with 2 requirements
// Risk Tier: LOW
// Migrated from: 8ae5c45f3147f2a0...
// Canonical overlap: 100%

// TDD CYCLE:
// 1. Tests are designed to FAIL with current code
// 2. Run: npm test -- iu-8ae5c45f
// 3. See 🔴 RED (tests fail)
// 4. Fix functions below to make tests 🟢 GREEN
// 5. Run evidence to validate

// @phoenix-iu: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0
// @phoenix-name: Create Domain
// @phoenix-risk: low
// @phoenix-short: IU-8ae5c45f
// @phoenix-migrated: 8ae5c45f3147f2a03b6360b590933744f6cd4d48f7ddfe1cb44c24f0461deab0

// === TYPES ===

export interface Create {
  id: string;
  name?: string;
}

// === RED IMPLEMENTATIONS (fix to make tests pass) ===

/**
 * 🔴 RED: create
 *
 * TDD: Fix this function to make tests pass
 */
export function create(id: string): Create | null {
  // 🔴 RED: WRONG — returns object with mismatched ID
  return {
    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix
    name: 'not implemented'
  };
}


