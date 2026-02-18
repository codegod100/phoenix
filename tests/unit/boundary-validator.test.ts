import { describe, it, expect } from 'vitest';
import { validateBoundary, detectBoundaryChanges } from '../../src/boundary-validator.js';
import { extractDependencies } from '../../src/dep-extractor.js';
import type { ImplementationUnit } from '../../src/models/iu.js';
import { defaultBoundaryPolicy, defaultEnforcement } from '../../src/models/iu.js';

function makeIU(overrides?: Partial<ImplementationUnit>): ImplementationUnit {
  return {
    iu_id: 'test-iu',
    kind: 'module',
    name: 'TestIU',
    risk_tier: 'medium',
    contract: { description: 'test', inputs: [], outputs: [], invariants: [] },
    source_canon_ids: [],
    dependencies: [],
    boundary_policy: defaultBoundaryPolicy(),
    enforcement: defaultEnforcement(),
    evidence_policy: { required: ['typecheck'] },
    output_files: [],
    ...overrides,
  };
}

describe('validateBoundary', () => {
  it('returns no diagnostics for clean code', () => {
    const source = `export function foo() { return 42; }`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU();
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(0);
  });

  it('catches forbidden packages', () => {
    const source = `import axios from 'axios';`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, forbidden_packages: ['axios'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(1);
    expect(diags[0].category).toBe('dependency_violation');
    expect(diags[0].subject).toBe('axios');
    expect(diags[0].severity).toBe('error');
  });

  it('catches packages not in allowlist', () => {
    const source = `import lodash from 'lodash';`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, allowed_packages: ['express'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(1);
    expect(diags[0].subject).toBe('lodash');
  });

  it('allows packages in allowlist', () => {
    const source = `import express from 'express';`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, allowed_packages: ['express'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(0);
  });

  it('catches forbidden paths', () => {
    const source = `import { secret } from './internal/admin.js';`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, forbidden_paths: ['./internal/**'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(1);
    expect(diags[0].category).toBe('dependency_violation');
  });

  it('catches undeclared side channels', () => {
    const source = `const key = process.env.SECRET_KEY;`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU();
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(1);
    expect(diags[0].category).toBe('side_channel_violation');
    expect(diags[0].severity).toBe('warning'); // default enforcement
  });

  it('allows declared side channels', () => {
    const source = `const key = process.env.SECRET_KEY;`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        side_channels: { ...defaultBoundaryPolicy().side_channels, config: ['SECRET_KEY'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags).toHaveLength(0);
  });

  it('uses enforcement config for severity', () => {
    const source = `const key = process.env.UNDECLARED;`;
    const graph = extractDependencies(source, 'test.ts');
    const iu = makeIU({
      enforcement: {
        dependency_violation: { severity: 'error' },
        side_channel_violation: { severity: 'error' },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags[0].severity).toBe('error');
  });

  it('includes source file and line in diagnostics', () => {
    const source = `line1\nimport bad from 'bad-pkg';`;
    const graph = extractDependencies(source, 'src/auth.ts');
    const iu = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, forbidden_packages: ['bad-pkg'] },
      },
    });
    const diags = validateBoundary(graph, iu);
    expect(diags[0].source_file).toBe('src/auth.ts');
    expect(diags[0].source_line).toBe(2);
  });
});

describe('detectBoundaryChanges', () => {
  it('returns null when policies are identical', () => {
    const iu1 = makeIU();
    const iu2 = makeIU();
    expect(detectBoundaryChanges(iu1, iu2)).toBeNull();
  });

  it('detects code policy changes', () => {
    const iu1 = makeIU();
    const iu2 = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        code: { ...defaultBoundaryPolicy().code, forbidden_packages: ['axios'] },
      },
    });
    const change = detectBoundaryChanges(iu1, iu2);
    expect(change).not.toBeNull();
    expect(change!.changes).toContain('code.forbidden_packages changed');
  });

  it('detects side channel policy changes', () => {
    const iu1 = makeIU();
    const iu2 = makeIU({
      boundary_policy: {
        ...defaultBoundaryPolicy(),
        side_channels: { ...defaultBoundaryPolicy().side_channels, databases: ['postgres'] },
      },
    });
    const change = detectBoundaryChanges(iu1, iu2);
    expect(change).not.toBeNull();
    expect(change!.changes).toContain('side_channels.databases changed');
  });
});
