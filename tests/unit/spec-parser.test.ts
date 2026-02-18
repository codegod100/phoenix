import { describe, it, expect } from 'vitest';
import { parseSpec } from '../../src/spec-parser.js';

describe('parseSpec', () => {
  it('returns empty array for empty content', () => {
    expect(parseSpec('', 'test.md')).toEqual([]);
  });

  it('returns empty array for whitespace-only content', () => {
    expect(parseSpec('   \n  \n  ', 'test.md')).toEqual([]);
  });

  it('treats headingless content as single clause', () => {
    const content = 'Just some text\nwith multiple lines';
    const clauses = parseSpec(content, 'test.md');
    expect(clauses).toHaveLength(1);
    expect(clauses[0].section_path).toEqual([]);
    expect(clauses[0].source_doc_id).toBe('test.md');
  });

  it('splits on headings', () => {
    const content = `# First

Content one.

# Second

Content two.`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses).toHaveLength(2);
    expect(clauses[0].section_path).toEqual(['First']);
    expect(clauses[1].section_path).toEqual(['Second']);
  });

  it('tracks nested section paths', () => {
    const content = `# Parent

## Child A

Text A

## Child B

Text B`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses).toHaveLength(3);
    expect(clauses[0].section_path).toEqual(['Parent']);
    expect(clauses[1].section_path).toEqual(['Parent', 'Child A']);
    expect(clauses[2].section_path).toEqual(['Parent', 'Child B']);
  });

  it('computes correct line ranges', () => {
    const content = `# First

Line 2

# Second

Line 6`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses[0].source_line_range[0]).toBe(1);
    expect(clauses[1].source_line_range[0]).toBe(5);
  });

  it('computes clause_semhash deterministically', () => {
    const content = '# Test\n\nSome content here.';
    const c1 = parseSpec(content, 'doc')[0];
    const c2 = parseSpec(content, 'doc')[0];
    expect(c1.clause_semhash).toBe(c2.clause_semhash);
  });

  it('computes unique clause IDs', () => {
    const content = `# A

Text A

# B

Text B`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses[0].clause_id).not.toBe(clauses[1].clause_id);
  });

  it('context hash differs based on neighbors', () => {
    const content = `# A

Text A

# B

Text B

# C

Text C`;
    const clauses = parseSpec(content, 'test.md');
    // B has neighbors A and C; A only has neighbor B
    expect(clauses[0].context_semhash_cold).not.toBe(clauses[1].context_semhash_cold);
  });

  it('handles deeply nested headings', () => {
    const content = `# L1

## L2

### L3

#### L4

Content`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses).toHaveLength(4);
    expect(clauses[3].section_path).toEqual(['L1', 'L2', 'L3', 'L4']);
  });

  it('resets section path on same-level heading', () => {
    const content = `# A

## B

# C

## D`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses[2].section_path).toEqual(['C']);
    expect(clauses[3].section_path).toEqual(['C', 'D']);
  });

  it('captures pre-heading content as preamble', () => {
    const content = `This is a preamble before any heading.

# First Section

Content here.`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses.length).toBe(2);
    expect(clauses[0].section_path).toEqual(['(preamble)']);
    expect(clauses[0].normalized_text).toContain('preamble');
    expect(clauses[1].section_path).toEqual(['First Section']);
  });

  it('skips empty pre-heading whitespace', () => {
    const content = `

# First Section

Content here.`;
    const clauses = parseSpec(content, 'test.md');
    expect(clauses.length).toBe(1);
    expect(clauses[0].section_path).toEqual(['First Section']);
  });
});
