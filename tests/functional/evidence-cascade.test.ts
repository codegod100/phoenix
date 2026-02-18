import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSpec } from '../../src/spec-parser.js';
import { extractCanonicalNodes } from '../../src/canonicalizer.js';
import { planIUs } from '../../src/iu-planner.js';
import { evaluatePolicy, evaluateAllPolicies } from '../../src/policy-engine.js';
import { computeCascade } from '../../src/cascade.js';
import { EvidenceKind, EvidenceStatus } from '../../src/models/evidence.js';
import type { EvidenceRecord } from '../../src/models/evidence.js';
import { EvidenceStore } from '../../src/store/evidence-store.js';
import { runShadowPipeline } from '../../src/shadow-pipeline.js';
import { runCompaction } from '../../src/compaction.js';
import { parseCommand, routeCommand } from '../../src/bot-router.js';
import type { BotCommand } from '../../src/models/bot.js';

const SPEC = `# Auth Service

Users must authenticate with email and password.
Passwords must be hashed with bcrypt.

## Security Constraints

All endpoints must use HTTPS.
Tokens must be signed with RS256.`;

describe('Functional: Evidence, Policy, Cascade (Phase D)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'phoenix-evd-'));
  });

  it('full evidence lifecycle: submit → evaluate → cascade', () => {
    const clauses = parseSpec(SPEC, 'spec/auth.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);
    expect(ius.length).toBeGreaterThan(0);

    const iu = ius[0];

    // No evidence yet → INCOMPLETE
    const eval1 = evaluatePolicy(iu, []);
    expect(eval1.verdict).toBe('INCOMPLETE');
    expect(eval1.missing.length).toBeGreaterThan(0);

    // Submit passing evidence for each required kind
    const store = new EvidenceStore(tempDir);
    const records: EvidenceRecord[] = iu.evidence_policy.required.map(kind => ({
      evidence_id: `ev-${kind}`,
      kind: kind as EvidenceKind,
      status: EvidenceStatus.PASS,
      iu_id: iu.iu_id,
      canon_ids: iu.source_canon_ids,
      timestamp: new Date().toISOString(),
    }));
    store.addRecords(records);

    // Now should PASS
    const eval2 = evaluatePolicy(iu, store.getAll());
    expect(eval2.verdict).toBe('PASS');

    // Simulate a failure
    store.addRecord({
      evidence_id: 'ev-fail',
      kind: EvidenceKind.TYPECHECK,
      status: EvidenceStatus.FAIL,
      iu_id: iu.iu_id,
      canon_ids: [],
      message: 'Type error in auth module',
      timestamp: new Date(Date.now() + 1000).toISOString(),
    });

    const eval3 = evaluatePolicy(iu, store.getAll());
    expect(eval3.verdict).toBe('FAIL');

    // Cascade should block this IU
    const cascadeEvents = computeCascade([eval3], ius);
    expect(cascadeEvents.length).toBeGreaterThan(0);
    expect(cascadeEvents[0].actions.some(a => a.action === 'BLOCK')).toBe(true);
  });
});

describe('Functional: Shadow Pipeline + Compaction (Phase E)', () => {
  it('shadow pipeline classifies identical graphs as SAFE', () => {
    const clauses = parseSpec(SPEC, 'spec/auth.md');
    const canon = extractCanonicalNodes(clauses);
    const oldP = { pipeline_id: 'v1', model_id: 'm1', promptpack_version: '1', extraction_rules_version: '1', diff_policy_version: '1' };
    const newP = { pipeline_id: 'v2', model_id: 'm2', promptpack_version: '2', extraction_rules_version: '2', diff_policy_version: '2' };
    const result = runShadowPipeline(oldP, newP, canon, canon);
    expect(result.classification).toBe('SAFE');
  });

  it('compaction preserves critical data', () => {
    const objects = [
      { object_id: '1', object_type: 'clause_body', age_days: 60, size_bytes: 5000, preserve: false },
      { object_id: '2', object_type: 'node_header', age_days: 60, size_bytes: 100, preserve: true },
      { object_id: '3', object_type: 'provenance_edge', age_days: 60, size_bytes: 50, preserve: true },
      { object_id: '4', object_type: 'approval', age_days: 60, size_bytes: 200, preserve: true },
      { object_id: '5', object_type: 'signature', age_days: 60, size_bytes: 300, preserve: true },
      { object_id: '6', object_type: 'clause_body', age_days: 15, size_bytes: 3000, preserve: false },
    ];
    const event = runCompaction(objects, 'size_threshold', 30);
    expect(event.nodes_compacted).toBe(1); // only object '1' (old, non-preserved)
    expect(event.bytes_freed).toBe(5000);
    expect(event.preserved.node_headers).toBe(1);
    expect(event.preserved.provenance_edges).toBe(1);
    expect(event.preserved.approvals).toBe(1);
    expect(event.preserved.signatures).toBe(1);
  });
});

describe('Functional: Bot Integration (Phase F)', () => {
  it('SpecBot ingest flow: parse → confirm → result', () => {
    const parsed = parseCommand('SpecBot: ingest spec/auth.md');
    expect('error' in parsed).toBe(false);
    const cmd = parsed as BotCommand;
    const resp = routeCommand(cmd);
    expect(resp.mutating).toBe(true);
    expect(resp.confirm_id).toBeTruthy();
    expect(resp.intent).toContain('spec/auth.md');
  });

  it('PolicyBot status is read-only', () => {
    const parsed = parseCommand('PolicyBot: status');
    const cmd = parsed as BotCommand;
    const resp = routeCommand(cmd);
    expect(resp.mutating).toBe(false);
    expect(resp.message.toLowerCase()).toContain('trust dashboard');
  });

  it('ImplBot regen requires confirmation', () => {
    const parsed = parseCommand('ImplBot: regen iu=AuthIU');
    const cmd = parsed as BotCommand;
    const resp = routeCommand(cmd);
    expect(resp.mutating).toBe(true);
    expect(resp.intent).toContain('AuthIU');
  });

  it('all bots respond to help', () => {
    for (const bot of ['SpecBot', 'ImplBot', 'PolicyBot']) {
      const resp = routeCommand({ bot: bot as any, action: 'help', args: {}, raw: `${bot}: help` });
      expect(resp.message).toContain('commands');
    }
  });
});
