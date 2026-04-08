// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Priority Domain (IU-7cce149b)
// Risk Tier: LOW

// TDD CYCLE:
// 1. npm test -- iu-7cce149b
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { _phoenix, process } from '../index.js';

describe('Priority Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has traceability export', () => {
    expect(_phoenix).toBeDefined();
    expect(_phoenix.iu_id).toBe('7cce149b135824bc8b6f060046f0731ce1f983a325ed1d93b2271e736127e143');
  });

  // 🔴 RED: This test will FAIL until you fix process()
  it('process transforms the input', () => {
    const input: Priority = { id: '123', name: 'In' };
    const result = process(input);
    // 🔴 This FAILS because process returns input unchanged
    expect(result).not.toBe(input); // Should be new object
    // FIX: Actually transform/process the input
    // Then add: expect(result.name).toBe('Expected Output')
  });

});
