import { describe, it, expect } from 'vitest';
import { computeCascade, getTransitiveDependents } from '../../src/cascade.js';
import type { PolicyEvaluation } from '../../src/models/evidence.js';
import type { ImplementationUnit } from '../../src/models/iu.js';
import { defaultBoundaryPolicy, defaultEnforcement } from '../../src/models/iu.js';

function makeIU(id: string, name: string, deps: string[] = []): ImplementationUnit {
  return {
    iu_id: id, kind: 'module', name, risk_tier: 'low',
    contract: { description: '', inputs: [], outputs: [], invariants: [] },
    source_canon_ids: [], dependencies: deps,
    boundary_policy: defaultBoundaryPolicy(), enforcement: defaultEnforcement(),
    evidence_policy: { required: ['typecheck'] }, output_files: [],
  };
}

describe('computeCascade', () => {
  it('produces no events when all pass', () => {
    const evals: PolicyEvaluation[] = [
      { iu_id: 'a', iu_name: 'A', risk_tier: 'low', required: ['typecheck'], satisfied: ['typecheck'], missing: [], failed: [], verdict: 'PASS' },
    ];
    const events = computeCascade(evals, [makeIU('a', 'A')]);
    expect(events).toHaveLength(0);
  });

  it('blocks failed IU', () => {
    const evals: PolicyEvaluation[] = [
      { iu_id: 'a', iu_name: 'A', risk_tier: 'low', required: ['typecheck'], satisfied: [], missing: [], failed: ['typecheck'], verdict: 'FAIL' },
    ];
    const events = computeCascade(evals, [makeIU('a', 'A')]);
    expect(events).toHaveLength(1);
    expect(events[0].actions[0].action).toBe('BLOCK');
  });

  it('propagates to dependents', () => {
    const ius = [makeIU('a', 'A'), makeIU('b', 'B', ['a'])];
    const evals: PolicyEvaluation[] = [
      { iu_id: 'a', iu_name: 'A', risk_tier: 'low', required: ['typecheck'], satisfied: [], missing: [], failed: ['typecheck'], verdict: 'FAIL' },
    ];
    const events = computeCascade(evals, ius);
    const actions = events[0].actions;
    expect(actions.some(a => a.iu_id === 'a' && a.action === 'BLOCK')).toBe(true);
    expect(actions.some(a => a.iu_id === 'b' && a.action === 'RE_VALIDATE')).toBe(true);
  });

  it('does not propagate from PASS', () => {
    const ius = [makeIU('a', 'A'), makeIU('b', 'B', ['a'])];
    const evals: PolicyEvaluation[] = [
      { iu_id: 'a', iu_name: 'A', risk_tier: 'low', required: ['typecheck'], satisfied: ['typecheck'], missing: [], failed: [], verdict: 'PASS' },
    ];
    const events = computeCascade(evals, ius);
    expect(events).toHaveLength(0);
  });
});

describe('getTransitiveDependents', () => {
  it('finds direct dependents', () => {
    const ius = [makeIU('a', 'A'), makeIU('b', 'B', ['a']), makeIU('c', 'C')];
    const deps = getTransitiveDependents('a', ius);
    expect(deps).toContain('b');
    expect(deps).not.toContain('c');
  });

  it('finds transitive dependents', () => {
    const ius = [makeIU('a', 'A'), makeIU('b', 'B', ['a']), makeIU('c', 'C', ['b'])];
    const deps = getTransitiveDependents('a', ius);
    expect(deps).toContain('b');
    expect(deps).toContain('c');
  });

  it('returns empty for no dependents', () => {
    const ius = [makeIU('a', 'A'), makeIU('b', 'B')];
    expect(getTransitiveDependents('a', ius)).toEqual([]);
  });
});
