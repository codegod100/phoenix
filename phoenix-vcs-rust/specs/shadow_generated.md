# Shadow Requirements

Generated from source code analysis.

## Scenario

- SCENARIO: Compute shadow diff metrics between old and new canonical graphs. Per PRD 5.1: Classify as SAFE, COMPACTION_EVENT, or REJECT.
  <!-- Source: ./src/shadow.rs:45 -->
- SCENARIO: Classify shadow diff per PRD thresholds: - SAFE: node_change_pct ≤3%, no orphan nodes, no risk escalations - COMPACTION_EVENT: node_change_pct ≤25%, no orphan nodes, limited risk escalations - REJECT: orphan nodes exist, excessive churn, semantic drift large
  <!-- Source: ./src/shadow.rs:132 -->
- SCENARIO: Format shadow diff for human review
  <!-- Source: ./src/shadow.rs:215 -->
- SCENARIO: Create PipelineUpgrade meta-node as specified in PRD 5.1
  <!-- Source: ./src/shadow.rs:324 -->

## Definition

- DEFINITION: Metrics from comparing two canonical graphs
  <!-- Source: ./src/shadow.rs:11 -->
- DEFINITION: Classification of shadow diff
  <!-- Source: ./src/shadow.rs:22 -->
- DEFINITION: Result of shadow pipeline comparison
  <!-- Source: ./src/shadow.rs:33 -->
- DEFINITION: Pipeline upgrade event for storage
  <!-- Source: ./src/shadow.rs:313 -->

## Requirement

- REQUIREMENT: Run shadow pipeline: compare old vs new canonicalization.
  <!-- Source: ./src/shadow.rs:164 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| shadow_ShadowDiffMetrics | ./src/shadow.rs | 11 | `ShadowDiffMetrics` |
| shadow_UpgradeClassification | ./src/shadow.rs | 22 | `UpgradeClassification` |
| shadow_ShadowResult | ./src/shadow.rs | 33 | `ShadowResult` |
| shadow_compute_shadow_diff | ./src/shadow.rs | 45 | `compute_shadow_diff` |
| shadow_classify_shadow_diff | ./src/shadow.rs | 132 | `classify_shadow_diff` |
| shadow_run_shadow_pipeline | ./src/shadow.rs | 164 | `run_shadow_pipeline` |
| shadow_format_shadow_diff | ./src/shadow.rs | 215 | `format_shadow_diff` |
| shadow_PipelineUpgradeEvent | ./src/shadow.rs | 313 | `PipelineUpgradeEvent` |
| shadow_create_pipeline_upgrade_event | ./src/shadow.rs | 324 | `create_pipeline_upgrade_event` |
