import { describe, it, expect } from 'vitest';
import { extractDependencies } from '../../src/dep-extractor.js';

describe('extractDependencies', () => {
  it('extracts ES module imports', () => {
    const source = `import { foo } from 'bar';
import baz from '@scope/pkg';`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.imports).toHaveLength(2);
    expect(graph.imports[0].source).toBe('bar');
    expect(graph.imports[1].source).toBe('@scope/pkg');
  });

  it('extracts relative imports', () => {
    const source = `import { helper } from './utils/helper.js';`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.imports[0].is_relative).toBe(true);
    expect(graph.imports[0].source).toBe('./utils/helper.js');
  });

  it('extracts require() calls', () => {
    const source = `const fs = require('fs');`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0].source).toBe('fs');
  });

  it('detects process.env access', () => {
    const source = `const key = process.env.API_KEY;
const url = process.env['DATABASE_URL'];`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.side_channels).toHaveLength(2);
    expect(graph.side_channels[0].kind).toBe('config');
    expect(graph.side_channels[0].identifier).toBe('API_KEY');
    expect(graph.side_channels[1].identifier).toBe('DATABASE_URL');
  });

  it('detects fetch calls as external_api', () => {
    const source = `const resp = fetch('https://api.example.com/data');`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.side_channels).toHaveLength(1);
    expect(graph.side_channels[0].kind).toBe('external_api');
    expect(graph.side_channels[0].identifier).toBe('https://api.example.com/data');
  });

  it('detects database connections', () => {
    const source = `const pool = new Pool({ connectionString: url });`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.side_channels).toHaveLength(1);
    expect(graph.side_channels[0].kind).toBe('database');
  });

  it('detects fs operations', () => {
    const source = `fs.readFile('/tmp/data.json', cb);`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.side_channels).toHaveLength(1);
    expect(graph.side_channels[0].kind).toBe('file');
  });

  it('detects Redis connections', () => {
    const source = `const client = new Redis();`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.side_channels).toHaveLength(1);
    expect(graph.side_channels[0].kind).toBe('cache');
  });

  it('records source line numbers', () => {
    const source = `line1
import { foo } from 'bar';
line3
const key = process.env.SECRET;`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.imports[0].source_line).toBe(2);
    expect(graph.side_channels[0].source_line).toBe(4);
  });

  it('returns empty for clean code', () => {
    const source = `export function add(a: number, b: number) { return a + b; }`;
    const graph = extractDependencies(source, 'test.ts');
    expect(graph.imports).toHaveLength(0);
    expect(graph.side_channels).toHaveLength(0);
  });
});
