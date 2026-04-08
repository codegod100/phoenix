// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Task Domain (IU-e4caab5e)
// Risk Tier: HIGH

// TDD CYCLE:
// 1. npm test -- iu-e4caab5e
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { _phoenix, process } from '../index.js';

describe('Task Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has traceability export', () => {
    expect(_phoenix).toBeDefined();
    expect(_phoenix.iu_id).toBe('e4caab5ead2d175caf9cf1deacf957c9f2429599664946e7317838fcf36347c3');
  });

  // 🔴 RED: This test will FAIL until you fix process()
  it('process transforms the input', () => {
    const input: Task = { id: '123', name: 'In' };
    const result = process(input);
    // 🔴 This FAILS because process returns input unchanged
    expect(result).not.toBe(input); // Should be new object
    // FIX: Actually transform/process the input
    // Then add: expect(result.name).toBe('Expected Output')
  });

});
