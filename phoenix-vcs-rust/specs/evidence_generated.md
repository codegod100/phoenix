# Evidence Requirements

Generated from source code analysis.

## Scenario

- SCENARIO: Evaluate evidence policy for an IU. Per PRD: "Evidence binds to canonical nodes, IU IDs, generated artifact hashes"
  <!-- Source: ./src/evidence.rs:169 -->

## Definition

- DEFINITION: Risk tier for Implementation Units
  <!-- Source: ./src/evidence.rs:11 -->
- DEFINITION: Types of evidence that can be collected
  <!-- Source: ./src/evidence.rs:24 -->
- DEFINITION: Status of evidence collection
  <!-- Source: ./src/evidence.rs:64 -->
- DEFINITION: A record of collected evidence
  <!-- Source: ./src/evidence.rs:77 -->
- DEFINITION: Evidence policy for a risk tier
  <!-- Source: ./src/evidence.rs:101 -->
- DEFINITION: Result of policy evaluation
  <!-- Source: ./src/evidence.rs:110 -->
- DEFINITION: System shall define enumeration 'PolicyStatus' for categorizing values.
  <!-- Source: ./src/evidence.rs:121 -->

## Requirement

- REQUIREMENT: Risk-tiered evidence requirements from PRD Section 10
  <!-- Source: ./src/evidence.rs:133 -->
- REQUIREMENT: Create a human signoff record
  <!-- Source: ./src/evidence.rs:226 -->
- REQUIREMENT: Create a threat note (required for high/critical tier)
  <!-- Source: ./src/evidence.rs:248 -->
- REQUIREMENT: Format policy evaluation for display
  <!-- Source: ./src/evidence.rs:266 -->
- REQUIREMENT: Format multi-IU policy report
  <!-- Source: ./src/evidence.rs:327 -->
- REQUIREMENT: Mock evidence runners (would integrate with actual tools)
  <!-- Source: ./src/evidence.rs:382 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| evidence_RiskTier | ./src/evidence.rs | 11 | `RiskTier` |
| evidence_EvidenceKind | ./src/evidence.rs | 24 | `EvidenceKind` |
| evidence_EvidenceStatus | ./src/evidence.rs | 64 | `EvidenceStatus` |
| evidence_EvidenceRecord | ./src/evidence.rs | 77 | `EvidenceRecord` |
| evidence_EvidencePolicy | ./src/evidence.rs | 101 | `EvidencePolicy` |
| evidence_PolicyEvaluation | ./src/evidence.rs | 110 | `PolicyEvaluation` |
| evidence_PolicyStatus | ./src/evidence.rs | 121 | `PolicyStatus` |
| evidence_get_required_evidence | ./src/evidence.rs | 133 | `get_required_evidence` |
| evidence_evaluate_policy | ./src/evidence.rs | 169 | `evaluate_policy` |
| evidence_create_human_signoff | ./src/evidence.rs | 226 | `create_human_signoff` |
| evidence_create_threat_note | ./src/evidence.rs | 248 | `create_threat_note` |
| evidence_format_policy_evaluation | ./src/evidence.rs | 266 | `format_policy_evaluation` |
| evidence_format_policy_report | ./src/evidence.rs | 327 | `format_policy_report` |
| evidence_runners | ./src/evidence.rs | 382 | `runners` |
