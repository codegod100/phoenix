// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Overdue Domain (IU-2ff32cc9)
// Risk Tier: LOW

// @phoenix-iu: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
// @phoenix-name: Overdue Domain
// @phoenix-risk: low
// @phoenix-short: IU-2ff32cc9

// TDD CYCLE:
// 1. npm test -- iu-2ff32cc9
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { process } from '../index.js';

describe('Overdue Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*2ff32cc95412bbeb/);
  });

  // 🔴 RED: process should transform input
  it('process processes overdue', () => {
    const item: Overdue = { id: '1', name: 'test' };
    const result = process(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

});
