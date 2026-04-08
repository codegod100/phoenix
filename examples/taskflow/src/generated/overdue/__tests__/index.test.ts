// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Overdue Domain (IU-2ff32cc9)
// Risk Tier: LOW

// TDD CYCLE:
// 1. npm test -- iu-2ff32cc9
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { _phoenix, process } from '../index.js';

describe('Overdue Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has traceability export', () => {
    expect(_phoenix).toBeDefined();
    expect(_phoenix.iu_id).toBe('2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7');
  });

  // 🔴 RED: This test will FAIL until you fix process()
  it('process transforms the input', () => {
    const input: Overdue = { id: '123', name: 'In' };
    const result = process(input);
    // 🔴 This FAILS because process returns input unchanged
    expect(result).not.toBe(input); // Should be new object
    // FIX: Actually transform/process the input
    // Then add: expect(result.name).toBe('Expected Output')
  });

});
