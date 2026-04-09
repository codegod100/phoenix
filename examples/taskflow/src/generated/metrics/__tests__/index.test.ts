// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Metrics Domain (IU-29eaf566)
// Risk Tier: MEDIUM

// @phoenix-iu: 29eaf5668c0afbf2b769208fd17f84ced496eb6a0f13e1e54df2d3691d300624
// @phoenix-name: Metrics Domain
// @phoenix-risk: medium
// @phoenix-short: IU-29eaf566

// TDD CYCLE:
// 1. npm test -- iu-29eaf566
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { computMetrics } from '../index.js';

describe('Metrics Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*29eaf5668c0afbf2/);
  });

  // 🔴 RED: computMetrics should transform input
  it('computMetrics processes metrics', () => {
    const item: Metrics = { id: '1', name: 'test' };
    const result = computMetrics(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

});
