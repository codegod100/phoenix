---
name: phoenix-shadow
description: Shadow pipeline for safe canonicalization upgrades. Run old and new pipelines in parallel, classify as SAFE/COMPACTION/REJECT.
---

# Phoenix Shadow

Safe pipeline upgrades per PRD Section 5.1.

## When to Use

- When upgrading canonicalization logic
- When changing the AI model for extraction
- When modifying prompt templates
- Before any "regeneration from scratch"

## The Problem

Upgrading the pipeline that extracts requirements from specs is risky:
- New logic might drop requirements
- Different model might misinterpret
- New prompts might hallucinate

**Shadow pipeline = safety.**

## Process

### Step 1: Run both pipelines

Keep old pipeline running while testing new:

```
Spec ─┬─→ Old Pipeline ─┐
      │                 ├──→ Compare ──→ Classification
      └─→ New Pipeline ─┘
```

### Step 2: Compute shadow diff metrics

Using VCS core:

```typescript
import { computeShadowDiff, classifyShadowDiff, runShadowPipeline } from 'phoenix-vcs/vcs';

const result = runShadowPipeline(oldNodes, newNodes, 'v1.2.3', 'v1.3.0');
// → { classification, metrics, diff_report }
```

Metrics computed:
- `node_change_pct` - % of nodes changed
- `edge_change_pct` - % of edges changed
- `risk_escalations` - confidence drops
- `orphan_nodes` - nodes in old but not new
- `out_of_scope_growth` - new nodes not in old
- `semantic_stmt_drift` - text similarity change

### Step 3: Classify upgrade

| Classification | Criteria | Action |
|----------------|----------|--------|
| **SAFE** | ≤3% change, no orphans | Accept immediately |
| **COMPACTION_EVENT** | ≤25% change, no orphans | Review, then accept |
| **REJECT** | Orphans, >50% change | Tune new pipeline, retry |

Per PRD Section 5.1:
> "SAFE: node_change_pct ≤3%, no orphan nodes, no risk escalations"
> "COMPACTION_EVENT: node_change_pct ≤25%, no orphan nodes, limited risk escalations"
> "REJECT: orphan nodes exist, excessive churn, semantic drift large"

## Output Format

```
🔍 Shadow Pipeline Comparison
   Old: v1.2.3 (a1b2c3d4...)
   New: v1.3.0 (b2c3d4e5...)

Classification: ⚠️ COMPACTION_EVENT

Metrics:
  Node change: 12.5% (threshold: 3% SAFE, 25% COMPACTION)
  Edge change: 8.2%
  Risk escalations: 1
  Orphan nodes: 0 ✅
  Scope growth: 5.3%
  Semantic drift: 2.1%

Changes:
  + 3 new nodes (new requirements detected)
  ~ 5 modified nodes (cleaner wording)
  - 0 removed nodes

Recommendation:
  ⚠️ Review required: Significant but manageable changes
  Action: Run full validation, then accept new pipeline
```

## Recording Upgrade Decision

```typescript
import { createPipelineUpgradeEvent } from 'phoenix-vcs/vcs';

const event = createPipelineUpgradeEvent(shadowResult, accepted);
// → { type: 'PipelineUpgrade', accepted: true, ... }
```

Write to `.phoenix/upgrade-log.jsonl`:

```json
{"type":"PipelineUpgrade","old_pipeline_id":"a1b2c3d4...","new_pipeline_id":"b2c3d4e5...","classification":"COMPACTION_EVENT","accepted":true,"timestamp":"2026-04-07T20:00:00Z"}
```

## When to Use Shadow

Use shadow pipeline when changing:

1. **AI Model** (e.g., GPT-4 → GPT-5)
2. **Prompt Templates** (extraction rules)
3. **Normalization Logic** (text processing)
4. **Classification Thresholds** (A/B/C/D boundaries)

## When NOT to Use Shadow

Don't need shadow for:
- Regenerating from existing canonical graph
- Adding new specs (normal ingest)
- Minor bug fixes
- UI-only changes

## CLI Commands

```bash
# Run shadow comparison
npx phoenix-vcs shadow

# Or programmatically
node -e "
  import { runShadowPipeline } from 'phoenix-vcs/vcs';
  const result = runShadowPipeline(oldNodes, newNodes, 'v1.2', 'v1.3');
  console.log(result.classification);
"
```

## Upgrade Safety Checklist

- [ ] Run shadow pipeline
- [ ] Check classification (must be SAFE or COMPACTION)
- [ ] Review orphan nodes (must be 0)
- [ ] Check semantic drift (< 10%)
- [ ] Record upgrade decision
- [ ] If REJECT: tune pipeline and retry

## Per-PRD Philosophy

From PRD Section 5.1:
> "Canonicalization is versioned and explicit."
> "Upgrade produces meta-node: type: PipelineUpgrade"

Upgrades are first-class events with provenance.

## Next Step

Accept upgrade and transition to new pipeline, or reject and tune.
