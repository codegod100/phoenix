# Phoenix VCS — Product Requirements Document (v1.0)

Status: Build-Ready Specification  
Core Thesis: Version control should operate on **intent and causality**, not file diffs.  
Primary Trust Surface: `phoenix status` must always be explainable, conservative, and correct-enough to rely on.

---

# 0. Executive Summary

Phoenix is a regenerative version control system.

It compiles:

Spec Line  
→ Clause  
→ Canonical Requirement Graph  
→ Implementation Units  
→ Generated Code  
→ Evidence  
→ Policy Decision  

Every transformation emits provenance edges.

Selective invalidation is the defining capability:

> Changing one spec line invalidates only the dependent subtree — not the entire repository.

Phoenix is not “AI that writes code.”

Phoenix is a **causal compiler for intent.**

---

# 1. Adoption Scope

## v1 Scope (Build Target)
- Greenfield-first (new services or modules)
- Progressive wrapping for brownfield systems
- Module-level Implementation Units (function-level optional later)
- TypeScript-first reference implementation

## Explicit Non-Goals (v1)
- Automatic reverse engineering of arbitrary legacy code
- Perfect semantic determinism
- Fully decentralized CRDT replication
- Multi-language parity beyond reference language

---

# 2. Core System Model

Phoenix maintains five interconnected graphs:

1. Spec Graph (Clauses)
2. Canonical Graph (Requirements, Constraints, Invariants, Definitions)
3. Implementation Graph (Implementation Units)
4. Evidence Graph (Tests, Analysis, Reviews)
5. Provenance Graph (All transformation edges + meta-events)

Everything is content-addressed and versioned.

---

# 3. Spec Ingestion & Semantic Hashing

## 3.1 Clause Extraction

Each spec document is parsed into:

```yaml
clause_id:
source_doc_id:
source_line_range:
raw_text:
normalized_text:
section_path:

3.2 Two-Pass Semantic Hashing (Bootstrapped)

Cold start exists. It is explicit.

Pass 1 — Cold
	•	Compute clause_semhash
	•	Compute context_semhash_cold using local context only
	•	Classifier operates conservatively
	•	System marked BOOTSTRAP_COLD

Canonicalization runs

Pass 2 — Warm
	•	Compute context_semhash_warm including extracted canonical graph context
	•	Re-run classifier
	•	System transitions to BOOTSTRAP_WARMING

After stabilization:
	•	System transitions to STEADY_STATE

Bootstrap state controls:
	•	D-rate alarms suppressed during cold
	•	Severity downgraded during warming

⸻

4. Change Classification (A/B/C/D)

Phoenix does not use a single embedding threshold.

Every change is classified:

Class	Meaning
A	Trivial (formatting)
B	Local semantic change
C	Contextual semantic shift
D	Uncertain

Signals used:
	•	normalized diff heuristics
	•	clause_semhash distance
	•	context_semhash distance
	•	term-reference deltas
	•	section structure deltas

4.1 D-Rate Trust Loop

Target: ≤5%
Acceptable: ≤10%
Alarm: >15% (rolling window)

If alarm:
	•	classifier tuning required
	•	override friction increases
	•	PolicyBot surfaces trust degradation warning

Metric: D-rate is first-class.

⸻

5. Canonicalization Pipelines

Canonicalization is versioned and explicit.

canon_pipeline_id:
model_id:
promptpack_version:
extraction_rules_version:
diff_policy_version:

5.1 Shadow Canonicalization (Upgrade Mode)

Upgrade runs old and new pipelines in parallel.

Diff metrics:
	•	node_change_pct
	•	edge_change_pct
	•	risk_escalations
	•	orphan_nodes
	•	out_of_scope_growth
	•	semantic_stmt_drift

Classification:

SAFE:
	•	node_change_pct ≤3%
	•	no orphan nodes
	•	no risk escalations

COMPACTION EVENT:
	•	node_change_pct ≤25%
	•	no orphan nodes
	•	limited risk escalations

REJECT:
	•	orphan nodes exist
	•	excessive churn
	•	semantic drift large

Upgrade produces meta-node:

type: PipelineUpgrade


⸻

6. Implementation Units (IUs)

Implementation Units are stable compilation boundaries.

iu_id:
kind: module | function
risk_tier:
contract:
dependencies:
boundary_policy:
impact:
evidence_policy:

Bots propose.
Humans or policy accept.

⸻

7. Boundary Policy Schema (Enforced)

Each IU declares:

dependencies:
  code:
    allowed_ius:
    allowed_packages:
    forbidden_ius:
    forbidden_packages:
    forbidden_paths:
  side_channels:
    databases:
    queues:
    caches:
    config:
    external_apis:
    files:

7.1 Architectural Linter (Required)

Post-generation:
	•	Extract dependency graph
	•	Validate against boundary policy
	•	Emit diagnostics

Violation severity controlled by:

enforcement:
  dependency_violation:
    severity: error|warning
  side_channel_violation:
    severity: warning|error

Side-channel dependencies create graph edges for invalidation.

⸻

8. Regeneration Engine

Regeneration operates at IU granularity.

Records:
	•	model_id
	•	promptpack hash
	•	toolchain version
	•	normalization steps

Generated artifacts produce:

.phoenix/generated_manifest

Per-file and per-IU hashes.

⸻

9. Drift Detection

On status:
	•	Compare working tree vs generated_manifest
	•	If mismatch and no waiver:
	•	Emit ERROR
	•	Block acceptance

Manual edits must be labeled:
	•	promote_to_requirement
	•	waiver (signed)
	•	temporary_patch (expires)

⸻

10. Evidence & Policy Engine

Risk-tiered enforcement.

Low tier:
	•	typecheck
	•	lint
	•	boundary validation

Medium:
	•	unit tests required

High:
	•	unit + property tests
	•	threat note
	•	static analysis

Critical:
	•	human signoff or formal/simulation evidence

Evidence binds to:
	•	canonical nodes
	•	IU IDs
	•	generated artifact hashes

⸻

11. Cascading Failure Semantics

If IU-X evidence fails:
	•	IU-X blocked
	•	Dependent IU-Y:
	•	re-run typecheck
	•	re-run boundary checks
	•	re-run relevant tests (tagged)

Failure propagation is explicit and graph-based.

⸻

12. Compaction

12.1 Storage Tiers

Hot Graph (last 30 days default)
Ancestry Index (forever metadata)
Cold Packs (heavy blobs)

Compaction never deletes:
	•	node headers
	•	provenance edges
	•	approvals
	•	signatures

12.2 Triggers
	•	Size threshold exceeded
	•	Pipeline upgrade accepted
	•	Time-based fallback

Compaction produces:

type: CompactionEvent

PolicyBot announces compaction.

⸻

13. Diagnostics & Severity Model

Every status item is:

severity: error|warning|info
category:
subject:
message:
recommended_actions:

Grouped by severity.

This is Phoenix’s primary UX.

⸻

14. Freeq Bot Integration

Bots behave as normal users.

Command style:

SpecBot: ingest spec/auth.md
ImplBot: regen iu=AuthIU
PolicyBot: status

14.1 Confirmation Model

Mutating commands:
	•	Bot echoes parsed intent
	•	User replies ok or phx confirm <id>

Read-only commands:
	•	execute immediately

14.2 Command Grammar

Each bot exposes:

BotName: help
BotName: commands
BotName: version

No fuzzy NLU in v1.

⸻

15. Bootstrap Flow

phoenix bootstrap
	•	Runs cold pass
	•	Runs canonicalization
	•	Runs warm pass
	•	Generates first Trust Dashboard
	•	Sets system state to WARMING

D-rate alarms disabled until STEADY_STATE.

⸻

16. Trust Dashboard (Status Example)

Severity	Category	Subject	Why	Action
ERROR	boundary	AuthIU	Imports InternalAdminIU (forbidden)	Refactor or update policy
WARN	d-rate	Global	D-rate 12% (>10%)	Tune classifier
WARN	drift	AuthIU	Working tree differs from manifest	Label or reconcile
INFO	canon	spec/auth.md:L42	Warm context hash applied	None


⸻

17. Brownfield Progressive Wrapping

Step 1: Wrap Module
	•	Define IU boundary around existing module
	•	Write minimal spec
	•	Enforce boundary + evidence without full regeneration

Step 2: Annotate Provenance
	•	Map functions to requirement IDs manually
	•	Gradually increase regen surface

⸻

18. Build Phases

Phase A: Clause extraction + clause_semhash
Phase B: Canonicalization + warm context hashing + classifier
Phase C1: IU module-level + regen + manifest
Phase C2: Boundary validator + UnitBoundaryChange
Phase D: Evidence + policy + cascade
Phase E: Shadow pipeline + compaction
Phase F: Freeq bots

Parallel where feasible.

⸻

19. Success Criteria (Alpha)
	•	Delete generated code → full regen succeeds
	•	Clause change invalidates only dependent IU subtree
	•	Boundary linter catches undeclared coupling
	•	Drift detection blocks unlabeled edits
	•	D-rate within acceptable bounds
	•	Shadow pipeline upgrade produces classified diff
	•	Compaction preserves ancestry
	•	Freeq bots perform ingest/canon/plan/regen/status safely

⸻

20. Metrics
	•	D-rate
	•	Override rate
	•	Canonical stability rate
	•	Upgrade-induced churn
	•	Boundary violation rate
	•	Drift incidents
	•	Status resolution time

⸻

21. The Bet

If phoenix status is trusted, Phoenix becomes the coordination substrate.

If status is noisy or wrong, the system dies.

Trust > cleverness.

⸻

End of PRD v1.0

