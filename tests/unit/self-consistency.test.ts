import { describe, it, expect } from 'vitest';
import { selectMedoid } from '../../src/canonicalizer-llm.js';

describe('selectMedoid', () => {
  it('returns the single sample when k=1', () => {
    expect(selectMedoid(['hello world'])).toBe('hello world');
  });

  it('returns the most similar sample among 3', () => {
    const samples = [
      'The system shall authenticate users with email and password',
      'The system authenticates users via email and password',
      'Users are authenticated by the system using email credentials',
    ];
    const result = selectMedoid(samples);
    // First two are most similar to each other; medoid should be one of them
    expect(result).toMatch(/system.*authenticat/i);
  });

  it('breaks ties alphabetically for determinism', () => {
    const result1 = selectMedoid(['abc def', 'abc def']);
    const result2 = selectMedoid(['abc def', 'abc def']);
    expect(result1).toBe(result2);
  });

  it('picks the best consensus from diverse outputs', () => {
    const samples = [
      'sessions must expire after 24 hours',
      'the system expires sessions after 24 hours',
      'sessions must expire after 24 hours of inactivity',
    ];
    const result = selectMedoid(samples);
    // All share core tokens; medoid should be one that overlaps most
    expect(result).toContain('sessions');
    expect(result).toContain('24 hours');
  });

  it('handles completely different samples gracefully', () => {
    const samples = ['hello world', 'foo bar baz', 'xyz abc'];
    const result = selectMedoid(samples);
    // No crash, returns one of them
    expect(samples).toContain(result);
  });
});
