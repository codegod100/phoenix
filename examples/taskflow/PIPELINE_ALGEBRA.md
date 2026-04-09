# Phoenix VCS Pipeline — Categorical Diagram

## Pipeline as Category 𝒫

```
                    Φ (pipeline functor)
    Spec ──────────────────────────────────► Code
      │                                         │
      │  σ₁        σ₂        σ₃        σ₄      │
      ▼                                         ▼
   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
   │ INGEST │──►│ CANON  │──►│  PLAN  │──►│ CODEGEN│
   │        │   │        │   │        │   │        │
   │  parse │   │  norm  │   │  bound │   │  gen   │
   │ SHA256 │   │  hash  │   │  risk  │   │  lift  │
   └────────┘   └────────┘   └────────┘   └────────┘
      │ σ₁              │ σ₂         │ σ₃         │ σ₄
      │                 │            │            │
      ▼                 ▼            ▼            ▼
   Clauses ─────────► Canon ────►   IUs   ───►  Impl
   (Spec*)            (Canon*)     (IU*)       (Code*)

   Objects: Clauses, Canonicals, IUs, Implementations
   Morphisms: σ₁, σ₂, σ₃, σ₄ (phase transformations)
```

## Phase Objects with Structure

### INGEST: Spec → Clauses
```
Spec ──► Clause₁, Clause₂, ... Clauseₙ
         │
         └── Content-addressed by SHA-256
         └── C : Set of clauses
         └── ingest : Spec → 𝒫(C)  (power set functor)
```

### CANONICALIZE: Clauses → Canonicals
```
Clauses ──► Canon₁, Canon₂, ... Canonₘ
            │
            └── Semantic deduplication (D-rate optimization)
            └── canon : C → C/∼  (quotient by equivalence)
            └── overlap : Canonᵢ × Canonⱼ → [0,1]
```

### PLAN: Canonicals → IUs
```
Canonicals ──► IU₁, IU₂, ... IUₖ
               │
               └── Risk tier assignment: r : Canon → {Critical, High, Medium, Low}
               └── Boundary policy: ∂IU = (imports, exports, invariants)
               └── plan : Canon → IU  (compilation boundary functor)
```

### PROTOLENS: Theory Morphism (Migration)
```
Th_old ──────► Th_new
    │              │
    │ μ (migration plan)
    │
    └── overlap(Th_old, Th_new) ≥ 0.8 ? lift : regenerate
    └── protolens : IU_old × IU_new → MigrationPlan
    └── Migration = {unchanged, migrate, regenerate}
```

### CODEGEN: IUs → Code (Colimit)
```
                ┌─────────┐
   IU₁ ────────►│         │
   IU₂ ────────►│ Colimit │──► Implementation
   IU₃ ────────►│  pushout│      (deliverable)
                └─────────┘
                    │
                    └── ιᵢ : IUᵢ → ∐ IUᵢ  (cocone injections)
                    └── [impl₁, impl₂, ...] : ∐ IUᵢ → Code
                    └── Universal property: ∀ fᵢ : IUᵢ → X, ∃! f : ∐ IUᵢ → X
```

## Pipeline Composition (Endofunctor)

```
𝒫 : Phoenix → Phoenix

𝒫 = codegen ∘ protolens ∘ plan ∘ canonicalize ∘ ingest

𝒫(Spec) = Code

Properties:
  - Idempotent on Code: 𝒫(Code) = Code  (no-op)
  - Content-addressed: hash(Spec) = hash(Spec') ⟹ 𝒫(Spec) = 𝒫(Spec')
  - Incremental: 𝒫(Spec + Δ) = 𝒫(Spec) + 𝒫(Δ|context)
```

## Evidence as Natural Transformation

```
       𝒫 (pipeline)
  Spec ─────────────► Code
    │                   │
  ε │                   │ ε'
    ▼                   ▼
  𝔼(Spec) ─────────► 𝔼(Code)
       𝔼(𝒫) (evidence functor)

ε : Object → Evidence  (evidence collection)
η : Evidence → {ACCEPTED, REJECTED}  (policy decision)

Commutative diagram:
  η ∘ ε' ∘ 𝒫 = η ∘ 𝔼(𝒫) ∘ ε
```

## Audit as Constraint Satisfaction

```
∀ iu ∈ IUs:
  trace(iu) : Canonᵢ → iu  (traceability exists)
  ∀ c ∈ boundary(iu):
    check(c) ≡ ⊤  (invariants hold)

Audit = ∏ᵢ verify(trace(iuᵢ), boundary(iuᵢ))
      = ⨅ᵢ (traceᵢ ∧ boundaryᵢ)  (meet of all constraints)
```

## Drift Detection (Difference Functor)

```
      Manifest ──────► WorkingTree
           │              │
           │ δ (drift)   │
           ▼              ▼
        Δ = Manifest Δ WorkingTree
           │
           └── ∅ (no drift) → continue
           └── non-∅ → regeneration required
           
drift : (Manifest, WorkingTree) → Δ
regenerate : Δ → Manifest'  (manifest update)
```

## Category Summary

| Object | Morphisms | Structure |
|--------|-----------|-----------|
| Spec | ingest | Free monoid on clauses |
| Clauses | canonicalize | Equivalence relation ∼ |
| Canonicals | plan | Risk-weighted boundary |
| IUs | protolens | Theory morphism (lift) |
| Code | audit/evidence | Subobject classifier |

| Functor | Domain → Codomain | Property |
|---------|-------------------|----------|
| ingest | Spec → Clauses | Content-addressing |
| canon | Clauses → Canonicals | D-rate optimization |
| plan | Canonicals → IUs | Risk stratification |
| protolens | IUs → MigrationPlan | Theory morphism |
| codegen | IUs → Code | Colimit (pushout) |
| evidence | Code → Evidence | Policy validation |

## TaskFlow Instance

```
┌─────────────────────────────────────────────────────────┐
│                    TASKFLOW PIPELINE                     │
├─────────────────────────────────────────────────────────┤
│ Spec                                                     │
│   ├── tasks.md ──► [Clause₁, Clause₂, ... Clause₁₂]     │
│   ├── assignment.md ──► [Clause₁₃, ... Clause₁₆]        │
│   └── ...                                                │
│                    ↓ σ₁ (ingest)                         │
│ Clauses = {c₁, c₂, ..., cₙ}  (content-addressed)        │
│                    ↓ σ₂ (canonicalize)                    │
│ Canonicals = {k₁, k₂, ..., kₘ}  (m < n, D-rate)        │
│                    ↓ σ₃ (plan)                           │
│ IUs = {IU_archive, IU_task, IU_priority, ...}            │
│   └── Boundary(archive) = ({}, {archiveTask, restore}, {})│
│   └── Boundary(task) = ({}, {create, update, delete}, {}) │
│                    ↓ σ₄ (protolens)                      │
│ MigrationPlan = {regenerate: ∅, migrate: ∅, unchanged: all}│
│                    ↓ σ₅ (codegen)                        │
│ Code = ∐ IUs  (colimit of all implementations)          │
│   ├── src/generated/archive/index.ts                    │
│   ├── src/generated/task/index.ts                       │
│   └── src/generated/app/server.ts  (deliverable)        │
│                    ↓ σ₆ (evidence)                      │
│ Evidence = {test_results, coverage, typecheck, lint}       │
│                    ↓ σ₇ (audit)                         │
│ Status = {ACCEPTED | REJECTED}                         │
└─────────────────────────────────────────────────────────┘
```

## Key Categorical Properties

1. **Compositionality**: 𝒫(Spec₁ + Spec₂) = 𝒫(Spec₁) ∐ 𝒫(Spec₂)
2. **Idempotence**: 𝒫 ∘ 𝒫 = 𝒫 (on stabilized states)
3. **Traceability**: ∀ code ∈ Code, ∃ canon ∈ Canon, spec ∈ Spec : trace(code) = canon ∧ source(canon) = spec
4. **Determinism**: hash(spec) = hash(spec') ⟹ 𝒫(spec) ≅ 𝒫(spec') (isomorphic outputs)
5. **Partiality**: plan(spec) is partial function (not all specs yield valid plans)