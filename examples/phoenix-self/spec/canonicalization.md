# Canonicalization Pipelines

Canonicalization transforms extracted clauses into a structured canonical requirement graph. The pipeline is versioned and explicitly tracked.

## Pipeline Identity

- Each canonicalization pipeline must be identified by: canon_pipeline_id, model_id, promptpack_version, extraction_rules_version, and diff_policy_version
- Pipeline upgrades must produce a meta-node of type PipelineUpgrade in the provenance graph
- Pipeline versions must never be silently changed; every upgrade must be explicit and auditable

## Canonical Node Extraction

- The pipeline must extract canonical nodes of five types: REQUIREMENT, CONSTRAINT, INVARIANT, DEFINITION, and CONTEXT
- Each canonical node must have a content-addressed canon_id, a type, a normalized statement, confidence score, source clause IDs, tags, and linked canon IDs
- Extraction must assign a confidence score between 0.0 and 1.0 to each node
- Nodes with no actionable keywords must default to type CONTEXT
- The extraction pipeline must track coverage: the percentage of source sentences that produced canonical nodes

## Shadow Canonicalization

- When upgrading pipelines, the system must run old and new pipelines in parallel (shadow mode)
- Shadow mode must compute diff metrics: node_change_pct, edge_change_pct, risk_escalations, orphan_nodes, out_of_scope_growth, and semantic_stmt_drift
- An upgrade is classified as SAFE when node_change_pct is at most 3%, there are no orphan nodes, and no risk escalations
- An upgrade is classified as COMPACTION EVENT when node_change_pct is at most 25%, no orphan nodes, and limited risk escalations
- An upgrade must be classified as REJECT when orphan nodes exist, churn is excessive, or semantic drift is large
- Shadow canonicalization results must never be applied to the live graph without explicit acceptance
