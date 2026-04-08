// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Priority Domain (IU-7cce149b)
// Risk Tier: LOW

// @phoenix-iu: 7cce149b135824bc8b6f060046f0731ce1f983a325ed1d93b2271e736127e143
// @phoenix-name: Priority Domain
// @phoenix-risk: low
// @phoenix-short: IU-7cce149b

// TDD CYCLE:
// 1. npm test -- iu-7cce149b
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { process } from '../index.js';

describe('Priority Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const impl = fs.readFileSync('./index.ts', 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*7cce149b135824bc/);
  });

  // 🔴 RED: process should transform input
  it('process processes priority', () => {
    const item: Priority = { id: '1', name: 'test' };
    const result = process(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

});
