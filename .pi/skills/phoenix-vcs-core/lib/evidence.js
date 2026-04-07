/**
 * Evidence collection and policy evaluation
 */

/**
 * Get required evidence for risk tier
 */
export function getRequiredEvidence(riskTier) {
  const base = ['typecheck', 'lint', 'boundary_validation'];
  
  switch (riskTier) {
    case 'low':
      return base;
    case 'medium':
      return [...base, 'unit_tests'];
    case 'high':
      return [...base, 'unit_tests', 'property_tests', 'threat_note'];
    case 'critical':
      return [...base, 'unit_tests', 'property_tests', 'static_analysis', 'threat_note', 'human_signoff'];
    default:
      return base;
  }
}

/**
 * Create evidence record
 */
export function createEvidenceRecord(kind, status, iuId, details = {}) {
  return {
    kind,
    status,
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    ...details
  };
}

/**
 * Run typecheck (placeholder - would integrate with actual type checker)
 */
export async function runTypecheck(projectRoot) {
  // Placeholder implementation
  // In real usage, this would spawn tsc or similar
  return createEvidenceRecord('typecheck', 'passed', null, {
    duration_ms: 1200,
    error_count: 0,
    details: 'Typecheck completed successfully'
  });
}

/**
 * Run lint (placeholder)
 */
export async function runLint(projectRoot) {
  return createEvidenceRecord('lint', 'passed', null, {
    duration_ms: 800,
    warning_count: 0,
    details: 'Linting completed successfully'
  });
}

/**
 * Run unit tests (placeholder)
 */
export async function runUnitTests(projectRoot, iuId, testPattern) {
  return createEvidenceRecord('unit_tests', 'passed', iuId, {
    duration_ms: 2500,
    test_count: 12,
    pass_count: 12,
    fail_count: 0,
    details: `Tests matching ${testPattern} passed`
  });
}

/**
 * Create threat note
 */
export function createThreatNote(iuId, threats) {
  return createEvidenceRecord('threat_note', 'documented', iuId, {
    threats,
    threat_count: threats.length
  });
}

/**
 * Create human signoff record
 */
export function createHumanSignoff(iuId, signedBy, artifactHash) {
  return createEvidenceRecord('human_signoff', 'signed', iuId, {
    signed_by: signedBy,
    artifact_hash: artifactHash,
    signed_at: new Date().toISOString()
  });
}

/**
 * Evaluate policy against collected evidence
 */
export function evaluatePolicy(iuId, riskTier, evidenceRecords) {
  const required = getRequiredEvidence(riskTier);
  const collected = new Map(evidenceRecords.map(e => [e.kind, e]));
  
  const missing = required.filter(r => !collected.has(r));
  const failed = evidenceRecords.filter(e => e.status === 'failed');
  const waived = evidenceRecords.filter(e => e.status === 'waived');
  
  // Calculate score
  let score = 100;
  score -= missing.length * 15;
  score -= failed.length * 20;
  score -= waived.length * 5;
  score = Math.max(0, score);
  
  // Determine status
  let status;
  if (missing.length > 0 || failed.length > 0) {
    status = 'REJECTED';
  } else if (waived.length > 0 || score < 90) {
    status = 'PENDING';
  } else {
    status = 'ACCEPTED';
  }
  
  return {
    iu_id: iuId,
    tier: riskTier,
    status,
    score,
    missing_evidence: missing,
    failed_evidence: failed.map(e => ({ kind: e.kind, reason: e.details })),
    waived_evidence: waived.map(e => e.kind),
    evidence_summary: {
      total: evidenceRecords.length,
      passed: evidenceRecords.filter(e => e.status === 'passed').length,
      failed: failed.length,
      waived: waived.length,
      missing: missing.length
    }
  };
}

/**
 * Format policy report
 */
export function formatPolicyReport(evaluation) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Evidence Evaluation                               ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`IU: ${evaluation.iu_id.slice(0, 16)}... (${evaluation.tier.toUpperCase()})`);
  lines.push(`Score: ${evaluation.score}/100`);
  lines.push('');
  
  const icon = evaluation.status === 'ACCEPTED' ? '✅' :
               evaluation.status === 'PENDING' ? '⚠️' : '❌';
  lines.push(`Status: ${icon} ${evaluation.status}`);
  lines.push('');
  
  if (evaluation.missing_evidence.length > 0) {
    lines.push('Missing Evidence:');
    for (const kind of evaluation.missing_evidence) {
      lines.push(`  ❌ ${kind}`);
    }
    lines.push('');
  }
  
  if (evaluation.failed_evidence.length > 0) {
    lines.push('Failed Evidence:');
    for (const { kind, reason } of evaluation.failed_evidence) {
      lines.push(`  ❌ ${kind}: ${reason}`);
    }
    lines.push('');
  }
  
  const { passed, failed, waived, missing, total } = evaluation.evidence_summary;
  lines.push(`Summary: ${passed} passed, ${failed} failed, ${waived} waived, ${missing} missing (${total} total)`);
  
  return lines.join('\n');
}
