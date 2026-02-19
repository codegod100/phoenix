# Phoenix VCS — Data Model & Taxonomy

**Version:** 1.0  
**Status:** Reference document for research review  
**Audience:** Research team, systems architects, PL/SE researchers

---

## 1. What Phoenix Is

Phoenix is a **causal compiler for intent**. It transforms human-written specification documents into generated code through a deterministic, content-addressed pipeline where every transformation is traceable.

The core thesis: version control should operate on **intent and causality**, not file diffs. Changing one sentence in a spec should invalidate only the dependent subtree of generated code — not the entire repository.

Phoenix is not "AI that writes code." It is a system that maintains a **provenance graph** from English sentences to TypeScript files, with formal policies governing trust, drift, and evidence at every stage.

---

## 2. The Pipeline (Five Stages)

Every project flows through five transformation stages. Each stage produces content-addressed nodes linked by provenance edges to the stages before and after it.

```
  ┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────────┐
  │ Spec     │     │          │     │  Canonical    │     │ Implemen-│     │  Generated   │
  │ Files    │────▶│ Clauses  │────▶│  Nodes        │────▶│ tation   │────▶│  Files       │
  │ (.md)    │     │          │     │              │     │ Units    │     │  (.ts)       │
  └──────────┘     └──────────┘     └──────────────┘     └──────────┘     └──────────────┘
                                          ▲    │
                                          └────┘
                                     cross-references

   ingest           canonicalize          plan               regen
```

| Stage | Count (TaskFlow example) | Description |
|-------|--------------------------|-------------|
| Spec Files | 3 | Markdown documents written by humans |
| Clauses | 14 | Atomic text blocks extracted from specs |
| Canonical Nodes | 54 | Structured requirements, constraints, definitions |
| Implementation Units | 11 | Compilation boundaries mapping requirements → code |
| Generated Files | 11 | TypeScript source files |

The pipeline produces **283 provenance edges** for the TaskFlow example — every connection from spec sentence to generated file is recorded and queryable.

---

## 3. Stage 1: Spec Files

**What:** Markdown documents written by humans. These are the source of truth.

**Example:** `spec/tasks.md`, `spec/analytics.md`, `spec/web-dashboard.md`

Spec files are not parsed by Phoenix beyond clause extraction. They are the raw input. Phoenix never modifies spec files.

---

## 4. Stage 2: Clauses

**What:** The atomic unit of specification. Every spec document is decomposed into an ordered list of clauses — contiguous blocks of text that express one or more requirements.

```typescript
interface Clause {
  clause_id: string;              // SHA-256(doc_id + section_path + normalized_text)
  source_doc_id: string;          // e.g. "spec/tasks.md"
  source_line_range: [number, number]; // [3, 10] — 1-indexed, inclusive
  raw_text: string;               // Original text as written
  normalized_text: string;        // Whitespace-normalized for stable hashing
  section_path: string[];         // Heading hierarchy: ["Task Lifecycle", "Status Transitions"]
  clause_semhash: string;         // SHA-256(normalized_text) — pure content identity
  context_semhash_cold: string;   // SHA-256(text + section + neighbor hashes)
}
```

### Identity Model

Clauses are **content-addressed**: the ID is derived from the content itself. If you change the text, the clause gets a new ID. If you revert the text, it gets the original ID back. This is the foundation of Phoenix's selective invalidation — identity tracks meaning, not location.

### Two Hash Layers

| Hash | What it captures | Use |
|------|-----------------|-----|
| `clause_semhash` | Pure content (the words) | Detect textual changes |
| `context_semhash_cold` | Content + structural position + neighbors | Detect contextual shifts (same words, different meaning due to surrounding changes) |

The "cold" suffix indicates this hash is computed without canonical graph context. A "warm" pass (after canonicalization) can incorporate graph-level context for higher fidelity, but the cold hash is always available as a baseline.

### Clause Diffing

When a spec file changes, Phoenix computes a clause-level diff:

| Diff Type | Meaning |
|-----------|---------|
| `ADDED` | New clause appeared |
| `REMOVED` | Clause no longer present |
| `MODIFIED` | Same position, different content |
| `MOVED` | Same content, different section path |
| `UNCHANGED` | Identical |

---

## 5. Stage 3: Canonical Nodes

**What:** Structured, typed requirements extracted from clauses. This is where raw English becomes a formal graph.

```typescript
interface CanonicalNode {
  canon_id: string;               // Content-addressed
  type: CanonicalType;            // REQUIREMENT | CONSTRAINT | INVARIANT | DEFINITION
  statement: string;              // Normalized canonical statement
  source_clause_ids: string[];    // Provenance: which clauses produced this node
  linked_canon_ids: string[];     // Cross-references to related nodes
  tags: string[];                 // Extracted keywords for linking and search
}
```

### Node Types

| Type | Meaning | Example |
|------|---------|---------|
| **REQUIREMENT** | Something the system must do | "Tasks must support status transitions: open → in_progress → review → done" |
| **CONSTRAINT** | A limitation or boundary | "Task titles must not exceed 200 characters" |
| **INVARIANT** | A property that must always hold | "Every task must have exactly one assignee at all times" |
| **DEFINITION** | A term or concept definition | "A 'task' is a unit of work with a title, description, status, and assignee" |

### Canonicalization Methods

Phoenix supports two canonicalization paths:

1. **Rule-based** (default): Pattern matching, keyword extraction, section-aware heuristics. Deterministic, fast, zero external dependencies.

2. **LLM-enhanced** (optional): Sends clause text to an LLM (Anthropic Claude or OpenAI) for structured JSON extraction. Falls back to rule-based if the LLM is unavailable or returns invalid results. The LLM path typically extracts more fine-grained nodes and better type classification.

The canonicalization pipeline is **versioned** — the model, prompt pack, and extraction rules all have explicit version identifiers:

```typescript
interface PipelineConfig {
  pipeline_id: string;
  model_id: string;
  promptpack_version: string;
  extraction_rules_version: string;
  diff_policy_version: string;
}
```

### The Canonical Graph

Canonical nodes form a graph through `linked_canon_ids`. These cross-references capture semantic relationships: a CONSTRAINT may reference the REQUIREMENT it constrains, a DEFINITION may be linked to every REQUIREMENT that uses the defined term.

This graph is the **core data structure** of Phoenix — it is what enables selective invalidation. When a clause changes, only the canonical nodes derived from that clause are invalidated, and only the implementation units that depend on those canonical nodes need regeneration.

---

## 6. Stage 4: Implementation Units (IUs)

**What:** Stable compilation boundaries that map groups of canonical requirements to generated code modules. This is where the "what" (requirements) meets the "how" (code structure).

```typescript
interface ImplementationUnit {
  iu_id: string;                  // Content-addressed
  kind: 'module' | 'function';   // Granularity level
  name: string;                   // Human-readable: "Task Lifecycle"
  risk_tier: RiskTier;            // low | medium | high | critical
  contract: IUContract;           // What this unit does
  source_canon_ids: string[];     // Which requirements this implements
  dependencies: string[];         // Other IU IDs this depends on
  boundary_policy: BoundaryPolicy; // What this unit is allowed to touch
  enforcement: EnforcementConfig; // How violations are treated
  evidence_policy: EvidencePolicy; // What proof is required
  output_files: string[];         // Generated file paths
}
```

### Contracts

Every IU has an explicit contract describing its purpose, inputs, outputs, and invariants:

```typescript
interface IUContract {
  description: string;    // "Manages task status transitions and lifecycle events"
  inputs: string[];       // ["taskId: string", "newStatus: TaskStatus"]
  outputs: string[];      // ["TaskTransitionResult"]
  invariants: string[];   // ["Status transitions must follow the allowed graph"]
}
```

### Risk Tiers

Risk tiers determine how much evidence is required before Phoenix considers an IU trustworthy:

| Tier | Evidence Required | Typical Use |
|------|------------------|-------------|
| **low** | typecheck, lint, boundary validation | Simple data types, utilities |
| **medium** | + unit tests | Business logic, CRUD |
| **high** | + property tests, threat note, static analysis | Auth, payments, data integrity |
| **critical** | + human signoff or formal verification | Security boundaries, compliance |

### Boundary Policies

Each IU declares what it is and isn't allowed to depend on:

```typescript
interface BoundaryPolicy {
  code: {
    allowed_ius: string[];        // IUs this can import from
    allowed_packages: string[];   // npm packages allowed
    forbidden_ius: string[];      // Explicit denials
    forbidden_packages: string[];
    forbidden_paths: string[];    // File system paths forbidden
  };
  side_channels: {
    databases: string[];          // DB connections allowed
    queues: string[];             // Message queues
    caches: string[];             // Cache systems
    config: string[];             // Config sources
    external_apis: string[];      // External HTTP APIs
    files: string[];              // File system access
  };
}
```

This is **architectural enforcement as data**. After code generation, Phoenix validates that the generated code respects its declared boundaries. Violations become diagnostics in `phoenix status`.

---

## 7. Stage 5: Generated Files & Manifest

**What:** The actual TypeScript files produced by the regeneration engine, tracked by a manifest for drift detection.

```typescript
interface GeneratedManifest {
  iu_manifests: Record<string, IUManifest>;
  generated_at: string;
}

interface IUManifest {
  iu_id: string;
  iu_name: string;
  files: Record<string, FileManifestEntry>;  // path → {content_hash, size}
  regen_metadata: RegenMetadata;
}

interface RegenMetadata {
  model_id: string;           // Which LLM generated the code
  promptpack_hash: string;    // Hash of the prompt template used
  toolchain_version: string;  // Phoenix version
  generated_at: string;       // Timestamp
}
```

The manifest records the **content hash** of every generated file at generation time. This is the basis for drift detection.

---

## 8. Cross-Cutting Systems

These systems operate across the pipeline rather than belonging to a single stage.

### 8.1 Change Classification (A/B/C/D)

When a spec changes, Phoenix classifies every clause-level change:

| Class | Meaning | Action |
|-------|---------|--------|
| **A** | Trivial (whitespace, formatting) | No invalidation |
| **B** | Local semantic change | Invalidate dependent canon nodes |
| **C** | Contextual semantic shift (same words, different meaning due to surrounding changes) | Invalidate dependent canon nodes + neighbors |
| **D** | Uncertain — classifier can't determine impact | Escalate to LLM or human |

Classification uses multiple signals, not a single threshold:

```typescript
interface ClassificationSignals {
  norm_diff: number;               // 0–1 edit distance on normalized text
  semhash_delta: boolean;          // Did the content hash change?
  context_cold_delta: boolean;     // Did the context hash change?
  term_ref_delta: number;          // 0–1 Jaccard distance on extracted terms
  section_structure_delta: boolean; // Did the heading hierarchy change?
  canon_impact: number;            // How many canon nodes are affected?
}
```

### D-Rate: The Trust Metric

The **D-rate** is the percentage of changes classified as D (uncertain) in a rolling window. It is a first-class system health metric:

| Level | D-Rate | Meaning |
|-------|--------|---------|
| TARGET | ≤ 5% | System understands your specs well |
| ACCEPTABLE | ≤ 10% | Normal operation |
| WARNING | ≤ 15% | Classifier needs tuning |
| ALARM | > 15% | System cannot reliably interpret changes — trust degrades |

**This is the key insight:** if Phoenix can't classify changes, it can't selectively invalidate. D-rate measures whether the system's understanding of your specs is keeping up with reality.

### LLM Escalation for D-Class

When a change is classified as D, Phoenix can optionally escalate to an LLM:

1. Send the before/after clause text and classification signals to Claude or GPT-4
2. LLM returns a reclassification (A, B, or C) with reasoning
3. If the LLM is confident, the D is resolved; if not, it remains D

This reduces D-rate without sacrificing correctness — the LLM is a second opinion, not an override.

### 8.2 Drift Detection

After code generation, the manifest records content hashes. On every `phoenix status`, Phoenix compares the actual files on disk to the manifest:

| Status | Meaning |
|--------|---------|
| **CLEAN** | File matches manifest hash exactly |
| **DRIFTED** | File has been modified since generation (no waiver) |
| **WAIVED** | File has been modified, but a waiver exists |
| **MISSING** | Manifest entry exists, but file is gone from disk |
| **UNTRACKED** | File exists on disk but isn't in the manifest |

**Drifted files are errors.** If someone hand-edits a generated file without labeling the change, `phoenix status` blocks further operations until the drift is resolved.

### Drift Waivers

Manual edits to generated code must be labeled:

| Waiver Kind | Meaning |
|-------------|---------|
| `promote_to_requirement` | This edit should become a spec requirement (feeds back into the pipeline) |
| `waiver` | Acknowledged deviation, signed by a responsible party |
| `temporary_patch` | Hotfix with an expiration date |

### 8.3 Evidence & Policy

Evidence records prove that an IU meets its risk-tier requirements:

```typescript
interface EvidenceRecord {
  evidence_id: string;
  kind: EvidenceKind;       // typecheck | lint | boundary_validation | unit_tests |
                            // property_tests | static_analysis | threat_note | human_signoff
  status: EvidenceStatus;   // PASS | FAIL | PENDING | SKIPPED
  iu_id: string;
  canon_ids: string[];      // Which requirements this evidence covers
  artifact_hash?: string;   // Hash of the code version this was run against
  timestamp: string;
}
```

Evidence binds to **both** the IU and the specific canon nodes it covers, and to the artifact hash of the generated code it was run against. This means evidence is invalidated if the code changes — you can't pass tests on version N and claim they apply to version N+1.

### Policy Evaluation

```typescript
interface PolicyEvaluation {
  iu_id: string;
  risk_tier: string;
  required: string[];     // What evidence kinds are needed
  satisfied: string[];    // What's been provided and passed
  missing: string[];      // What hasn't been provided yet
  failed: string[];       // What was provided but failed
  verdict: 'PASS' | 'FAIL' | 'INCOMPLETE';
}
```

### 8.4 Cascading Failures

If evidence fails for one IU, Phoenix propagates the failure through the dependency graph:

```typescript
interface CascadeEvent {
  source_iu_id: string;           // The IU that failed
  failure_kind: string;           // What failed (e.g. "unit_tests")
  affected_iu_ids: string[];      // All downstream IUs
  actions: CascadeAction[];       // What Phoenix will do about it
}

interface CascadeAction {
  iu_id: string;
  action: string;       // "re-run typecheck", "re-run boundary checks", etc.
  reason: string;       // "Depends on AuthIU which failed unit tests"
}
```

### 8.5 Bootstrap State Machine

Phoenix tracks its own confidence level:

```
BOOTSTRAP_COLD ──▶ BOOTSTRAP_WARMING ──▶ STEADY_STATE
```

| State | Meaning | D-Rate Handling |
|-------|---------|-----------------|
| `BOOTSTRAP_COLD` | First ingestion, no canonical graph yet | D-rate alarms suppressed |
| `BOOTSTRAP_WARMING` | Canonical graph exists, running warm hashing pass | D-rate severity downgraded |
| `STEADY_STATE` | System is calibrated and operational | Full enforcement |

This is explicit: cold start exists, and Phoenix names it rather than hiding it.

### 8.6 Diagnostics

Every issue Phoenix reports follows a uniform schema:

```typescript
interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  category: 'dependency_violation' | 'side_channel_violation' | 'drift' |
            'boundary' | 'd-rate' | 'canon' | 'evidence' | 'regen';
  subject: string;             // What has the problem
  message: string;             // Human-readable explanation
  iu_id?: string;
  recommended_actions: string[];
}
```

`phoenix status` groups diagnostics by severity and presents them as a trust dashboard. This is the **primary UX surface** — if `phoenix status` is trusted, Phoenix works. If it's noisy or wrong, the system dies.

---

## 9. The Provenance Graph

All five pipeline stages are connected by typed, directed edges:

| Edge Type | From | To | Cardinality |
|-----------|------|-----|-------------|
| `spec→clause` | Spec File | Clause | 1:N |
| `clause→canon` | Clause | Canonical Node | N:M |
| `canon→canon` | Canonical Node | Canonical Node | N:M |
| `canon→iu` | Canonical Node | Implementation Unit | N:M |
| `iu→file` | Implementation Unit | Generated File | 1:N |

The provenance graph enables two critical queries:

1. **Forward:** "If I change this spec sentence, what generated files are affected?" (selective invalidation)
2. **Backward:** "Why does this generated file exist? What spec sentences caused it?" (explainability)

Every edge is stored explicitly. There is no inference — if a connection exists, it was recorded at the transformation step that created it.

---

## 10. Content Addressing & Identity

All primary entities use content-addressed IDs:

| Entity | ID Formula |
|--------|-----------|
| Clause | `SHA-256(source_doc_id + section_path + normalized_text)` |
| Canonical Node | `SHA-256(statement + type + source_clause_ids)` |
| Implementation Unit | `SHA-256(kind + contract + boundary_policy)` |
| Generated File | `SHA-256(file_content)` |

This means:

- **Same content = same ID**, always, across time and machines
- **Changed content = new ID**, which propagates invalidation through the graph
- **Reverting content = original ID restored**, which is a no-op for the pipeline
- **No mutable state** — you can't "update" a node, you replace it with a new content-addressed node

---

## 11. Storage & Compaction

### Storage Tiers

| Tier | Contents | Retention |
|------|----------|-----------|
| **Hot** | Full graph (last 30 days default) | Active working set |
| **Ancestry** | Node headers + provenance edges + approvals | Forever |
| **Cold** | Heavy blobs (full node bodies, old generations) | Archival |

### Compaction Rules

Compaction **never deletes**:
- Node headers (identity + type + provenance pointers)
- Provenance edges
- Approvals and signatures

Compaction is triggered by:
- Size threshold exceeded
- Pipeline upgrade accepted
- Time-based fallback

---

## 12. Shadow Pipelines (Upgrade Safety)

When upgrading the canonicalization model (e.g., new LLM, new prompt pack), Phoenix runs old and new pipelines in parallel and computes a diff:

```typescript
interface ShadowDiffMetrics {
  node_change_pct: number;        // How many canon nodes changed
  edge_change_pct: number;        // How many edges changed
  risk_escalations: number;       // How many IUs got riskier
  orphan_nodes: number;           // Canon nodes with no clause provenance
  out_of_scope_growth: number;    // New nodes that don't map to existing specs
  semantic_stmt_drift: number;    // How much statement text changed
}
```

Classification:

| Result | Criteria | Action |
|--------|----------|--------|
| **SAFE** | ≤3% node change, no orphans, no risk escalations | Auto-accept |
| **COMPACTION_EVENT** | ≤25% node change, no orphans, limited escalations | Accept with compaction record |
| **REJECT** | Orphans exist, excessive churn, or large semantic drift | Block upgrade |

---

## 13. Bot Interface (Freeq)

Phoenix exposes three bots for programmatic and conversational interaction:

| Bot | Role |
|-----|------|
| **SpecBot** | Ingest and manage spec documents |
| **ImplBot** | Regenerate code, manage IUs |
| **PolicyBot** | Query status, evidence, policy evaluations |

Mutating commands require confirmation:

```
SpecBot: ingest spec/auth.md
→ "Will extract clauses from spec/auth.md. Confirm? [ok / phx confirm abc123]"
ok
→ "Ingested 5 clauses from spec/auth.md"
```

Read-only commands execute immediately. No fuzzy NLP — command grammar is explicit and documented.

---

## 14. The Full Entity-Relationship Diagram

```
┌─────────────┐
│  Spec File  │ ── path, clause_count
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐     ┌────────────────────┐
│   Clause    │────▶│ ClauseDiff         │
│             │     │ (ADDED/REMOVED/    │
│ clause_id   │     │  MODIFIED/MOVED/   │
│ semhash     │     │  UNCHANGED)        │
│ context_hash│     └────────┬───────────┘
│ section_path│              │
│ line_range  │              ▼
└──────┬──────┘     ┌────────────────────┐
       │ N:M        │ ChangeClassification│
       ▼            │ (A/B/C/D)          │
┌─────────────┐     │ signals, confidence│
│  Canonical  │     │ llm_resolved?      │
│  Node       │     └────────────────────┘
│             │              │
│ canon_id    │              ▼
│ type (RCID) │     ┌────────────────────┐
│ statement   │     │ DRateStatus        │
│ tags        │     │ rate, level, window│
│             │◀───▶│                    │
│ linked_ids  │     └────────────────────┘
└──────┬──────┘
       │ N:M
       ▼
┌─────────────┐     ┌────────────────────┐
│    IU       │────▶│ BoundaryPolicy     │
│             │     │ allowed/forbidden  │
│ iu_id       │     │ code + side_channels│
│ name        │     └────────────────────┘
│ kind        │
│ risk_tier   │     ┌────────────────────┐
│ contract    │────▶│ EvidenceRecord     │
│ dependencies│     │ kind, status       │
│ output_files│     │ artifact_hash      │
└──────┬──────┘     └────────┬───────────┘
       │ 1:N                 │
       ▼                     ▼
┌─────────────┐     ┌────────────────────┐
│  Generated  │     │ PolicyEvaluation   │
│  File       │     │ required/satisfied │
│             │     │ missing/failed     │
│ path        │     │ verdict            │
│ content_hash│     └────────────────────┘
│ size        │
│ drift_status│     ┌────────────────────┐
│ waiver?     │     │ Diagnostic         │
└─────────────┘     │ severity, category │
                    │ subject, message   │
                    │ recommended_actions│
                    └────────────────────┘
```

---

## 15. Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Trust > cleverness** | `phoenix status` must be explainable and correct — conservative by default |
| **Content-addressed identity** | Same content = same ID, always. Identity tracks meaning, not location |
| **Provenance is never lost** | Every edge is explicit and stored. Compaction preserves provenance |
| **Risk-proportional enforcement** | Low-risk IUs need a typecheck; critical IUs need human signoff |
| **Cold start is named, not hidden** | Bootstrap state machine makes system confidence explicit |
| **Selective invalidation** | One spec change → only the dependent subtree is invalidated |
| **Drift is an error** | Unlabeled manual edits to generated code block the pipeline |
| **D-rate is health** | If the system can't classify changes, it can't selectively invalidate |
| **Boundaries are data** | Architectural constraints are declared, enforced, and versioned |
| **Determinism where possible, LLM where needed** | Rule-based by default, LLM for canonicalization and D-class resolution |

---

## 16. Open Research Questions

1. **Semantic hash fidelity:** How well do two-pass hashes (cold + warm) capture meaning stability vs. structural changes? What's the false positive/negative rate for contextual shifts?

2. **D-rate dynamics:** Does D-rate converge naturally as a project matures, or does it require active classifier tuning? What's the relationship between spec writing style and D-rate?

3. **Canonicalization stability:** When using LLM-enhanced canonicalization, how stable are the extracted nodes across model versions? What shadow pipeline rejection rates should we expect?

4. **Boundary policy expressiveness:** Is the current boundary schema sufficient for real-world microservice architectures? What patterns require extension?

5. **Evidence binding granularity:** Evidence binds to IU + canon_ids + artifact_hash. Is this the right granularity, or do we need finer-grained binding (e.g., function-level)?

6. **Compaction safety:** Can we prove that compaction preserves all queries that matter? What's the formal definition of "lossless" for provenance graphs?

7. **Scale characteristics:** How does the provenance graph grow relative to spec size? At what point does the canonical graph need partitioning?

---

## Appendix A: CLI Commands

| Command | Pipeline Stage |
|---------|---------------|
| `phoenix init` | Initialize `.phoenix/` directory |
| `phoenix bootstrap` | Run full cold → warm → steady pipeline |
| `phoenix ingest <file>` | Spec → Clauses |
| `phoenix canonicalize` | Clauses → Canonical Nodes |
| `phoenix plan` | Canonical Nodes → Implementation Units |
| `phoenix regen --iu=<Name>` | IU → Generated Files |
| `phoenix status` | Drift detection + diagnostics dashboard |
| `phoenix diff <file>` | Clause-level diff with A/B/C/D classification |
| `phoenix inspect` | Interactive provenance visualization (web UI) |
| `phoenix graph` | Provenance graph summary |

---

## Appendix B: Directory Layout

```
project/
├── spec/                          # Human-written specifications
│   ├── tasks.md
│   ├── analytics.md
│   └── web-dashboard.md
├── src/generated/                 # Phoenix-generated code (do not hand-edit)
│   ├── tasks/
│   │   ├── task-lifecycle.ts
│   │   └── assignment.ts
│   ├── analytics/
│   │   └── metrics.ts
│   └── web-dashboard/
│       ├── dashboard-page.ts
│       └── server.ts
└── .phoenix/                      # Phoenix metadata (content-addressed store)
    ├── store/objects/             # All graph nodes as JSON
    ├── graphs/
    │   ├── spec.json              # Clause index
    │   ├── canonical.json         # Canon graph
    │   ├── implementation.json    # IU graph
    │   └── evidence.json          # Evidence records
    ├── manifests/
    │   └── generated_manifest.json
    └── state.json                 # Bootstrap state + pipeline config
```

---

*Document generated from Phoenix VCS v0.1.0 codebase. See PRD.md for the full product requirements and ARCHITECTURE.md for system layer details.*
