// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Tab Domain (IU-cf6962ca)
// Risk Tier: MEDIUM

// @phoenix-iu: cf6962caff7e397d251009ef1c4f815369b02a37c0e7837de1b323120d3a6d1b
// @phoenix-name: Tab Domain
// @phoenix-risk: medium
// @phoenix-short: IU-cf6962ca

// TDD CYCLE:
// 1. npm test -- iu-cf6962ca
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { create } from '../index.js';

describe('Tab Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*cf6962caff7e397d/);
  });

  // 🔴 RED: create should return correct data
  it('create returns tab by id', () => {
    const result = create('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

});
