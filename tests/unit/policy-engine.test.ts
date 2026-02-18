import { describe, it, expect } from 'vitest';
import { evaluatePolicy } from '../../src/policy-engine.js';
import { EvidenceKind, EvidenceStatus } from '../../src/models/evidence.js';
import type { EvidenceRecord } from '../../src/models/evidence.js';
import type { ImplementationUnit } from '../../src/models/iu.js';
import { defaultBoundaryPolicy, defaultEnforcement } from '../../src/models/iu.js';

function makeIU(riskTier: string, required: string[]): ImplementationUnit {
  return {
    iu_id: 'test-iu', kind: 'module', name: 'TestIU', risk_tier: riskTier as any,
    contract: { description: '', inputs: [], outputs: [], invariants: [] },
    source_canon_ids: [], dependencies: [],
    boundary_policy: defaultBoundaryPolicy(), enforcement: defaultEnforcement(),
    evidence_policy: { required }, output_files: [],
  };
}

function makeEvidence(kind: EvidenceKind, status: EvidenceStatus): EvidenceRecord {
  return {
    evidence_id: `ev-${kind}-${status}`, kind, status, iu_id: 'test-iu',
    canon_ids: [], timestamp: new Date().toISOString(),
  };
}

describe('evaluatePolicy', () => {
  it('returns PASS when all required evidence passes', () => {
    const iu = makeIU('low', ['typecheck', 'lint']);
    const evidence = [
      makeEvidence(EvidenceKind.TYPECHECK, EvidenceStatus.PASS),
      makeEvidence(EvidenceKind.LINT, EvidenceStatus.PASS),
    ];
    const result = evaluatePolicy(iu, evidence);
    expect(result.verdict).toBe('PASS');
    expect(result.satisfied).toEqual(['typecheck', 'lint']);
    expect(result.missing).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it('returns INCOMPLETE when evidence is missing', () => {
    const iu = makeIU('medium', ['typecheck', 'lint', 'unit_tests']);
    const evidence = [
      makeEvidence(EvidenceKind.TYPECHECK, EvidenceStatus.PASS),
    ];
    const result = evaluatePolicy(iu, evidence);
    expect(result.verdict).toBe('INCOMPLETE');
    expect(result.missing).toContain('lint');
    expect(result.missing).toContain('unit_tests');
  });

  it('returns FAIL when any evidence fails', () => {
    const iu = makeIU('low', ['typecheck', 'lint']);
    const evidence = [
      makeEvidence(EvidenceKind.TYPECHECK, EvidenceStatus.PASS),
      makeEvidence(EvidenceKind.LINT, EvidenceStatus.FAIL),
    ];
    const result = evaluatePolicy(iu, evidence);
    expect(result.verdict).toBe('FAIL');
    expect(result.failed).toContain('lint');
  });

  it('treats PENDING as missing', () => {
    const iu = makeIU('low', ['typecheck']);
    const evidence = [makeEvidence(EvidenceKind.TYPECHECK, EvidenceStatus.PENDING)];
    const result = evaluatePolicy(iu, evidence);
    expect(result.verdict).toBe('INCOMPLETE');
  });

  it('ignores evidence for other IUs', () => {
    const iu = makeIU('low', ['typecheck']);
    const evidence: EvidenceRecord[] = [{
      evidence_id: 'other', kind: EvidenceKind.TYPECHECK, status: EvidenceStatus.PASS,
      iu_id: 'other-iu', canon_ids: [], timestamp: new Date().toISOString(),
    }];
    const result = evaluatePolicy(iu, evidence);
    expect(result.verdict).toBe('INCOMPLETE');
  });
});
