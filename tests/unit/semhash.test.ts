import { describe, it, expect } from 'vitest';
import { sha256, clauseSemhash, contextSemhashCold, clauseId } from '../../src/semhash.js';

describe('sha256', () => {
  it('produces a 64-char hex string', () => {
    const hash = sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', () => {
    expect(sha256('test')).toBe(sha256('test'));
  });

  it('differs for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

describe('clauseSemhash', () => {
  it('returns sha256 of the normalized text', () => {
    const text = 'phoenix is a vcs';
    expect(clauseSemhash(text)).toBe(sha256(text));
  });
});

describe('contextSemhashCold', () => {
  it('includes section path in hash', () => {
    const text = 'same text';
    const h1 = contextSemhashCold(text, ['A', 'B'], '', '');
    const h2 = contextSemhashCold(text, ['A', 'C'], '', '');
    expect(h1).not.toBe(h2);
  });

  it('includes neighbor hashes', () => {
    const text = 'same text';
    const path = ['Section'];
    const h1 = contextSemhashCold(text, path, 'prev1', 'next1');
    const h2 = contextSemhashCold(text, path, 'prev2', 'next1');
    expect(h1).not.toBe(h2);
  });

  it('is deterministic', () => {
    const h1 = contextSemhashCold('text', ['A'], 'p', 'n');
    const h2 = contextSemhashCold('text', ['A'], 'p', 'n');
    expect(h1).toBe(h2);
  });
});

describe('clauseId', () => {
  it('includes doc ID in hash', () => {
    const id1 = clauseId('doc1', ['A'], 'text');
    const id2 = clauseId('doc2', ['A'], 'text');
    expect(id1).not.toBe(id2);
  });

  it('includes section path in hash', () => {
    const id1 = clauseId('doc', ['A'], 'text');
    const id2 = clauseId('doc', ['B'], 'text');
    expect(id1).not.toBe(id2);
  });
});
