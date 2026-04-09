# Panproto Protocol Specification for Phoenix VCS
# Version: 2.0 (Formal GAT Enforcement)
# 
# This defines the mathematical foundation of the Phoenix VCS pipeline using
# Generalized Algebraic Theories (GATs). Every transformation is a structure-
# preserving morphism between theories.

## Mathematical Foundation

### Category Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHOENIX PIPELINE CATEGORY C_PHOENIX                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ThSpec ──[μ_ingest]──► ThClause ──[μ_canon]──► ThCanon ──[μ_plan]──►  │
│     │                    │                      │                       │
│     │ α_spec            │ α_clause           │ α_canon               │
│     ▼                    ▼                      ▼                       │
│  ThSpec' ──[μ_ingest']► ThClause' ──[μ_canon']► ThCanon' ──[μ_plan']►  │
│                                                                         │
│  [μ_codegen]                                                            │
│     ▲                                                                   │
│     │                                                                   │
│  ThCode ◄──[μ_codegen]── ThIU ◄──[μ_plan]── ThCanon                     │
│                                                                         │
│  Composition: μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest = μ_total        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Theory Definitions

### ThSpec — Raw Specification Theory

```GAT
sorts:
  SpecDocument, SpecSection, SpecClause, ClauseType, RawText

operations:
  clauses: SpecDocument → List(SpecClause)
  sectionOf: SpecClause → SpecSection
  rawText: SpecClause → RawText
  clauseType: SpecClause → ClauseType

axioms:
  ∀d: SpecDocument, ∀c: clauses(d) 
    ⟹ sectionOf(c) ∈ sections(d)

  ∀c: SpecClause 
    ⟹ rawText(c) ≠ ε (non-empty)

  ∀c1, c2: SpecClause 
    where rawText(c1) = rawText(c2) ∧ sectionOf(c1) = sectionOf(c2)
    ⟹ c1 = c2 (uniqueness in section)
```

### ThClause — Content-Addressed Theory

```GAT
sorts:
  ClauseId, NormalizedText, SemanticHash, LineNumber

operations:
  clauseId: SpecClause → ClauseId
  normalize: RawText → NormalizedText
  hash: NormalizedText → SemanticHash
  sourceLine: ClauseId → LineNumber

axioms:
  ∀c: SpecClause 
    ⟹ clauseId(c) = hash(normalize(rawText(c)))

  ∀c1, c2: SpecClause
    where normalize(rawText(c1)) = normalize(rawText(c2))
    ⟹ clauseId(c1) = clauseId(c2)  (determinism)

  ∀c: SpecClause, ∃! id: ClauseId
    ⟹ clauseId(c) = id  (totality)
```

### ThCanon — Canonical Requirements Theory

```GAT
sorts:
  CanonId, CanonNode, NodeType, CleanStatement, Provenance, DRate

operations:
  canonize: ClauseId → CanonId
  hasNodeType: CanonNode → NodeType
  hasStatement: CanonNode → CleanStatement
  derivedFrom: CanonId → List(ClauseId)
  dependsOn: CanonId → List(CanonId)
  dRate: CanonId → DRate

axioms:
  ∀cid: ClauseId
    ⟹ canonize(cid) = canonId(normalize(cid))

  ∀c: CanonId
    ⟹ dRate(c) ≥ 0 ∧ dRate(c) ≤ 1

  ∀c: CanonId
    ⟹ |derivedFrom(c)| ≥ 1

  ∀c1, c2: CanonId
    where dependsOn(c1, c2)
    ⟹ ¬dependsOn(c2, c1)

  ∀c: CanonId
    ⟹ c ∉ dependsOn(c)
```

### ThIU — Implementation Unit Theory

```GAT
sorts:
  IUId, IUBoundary, IUContract, RiskTier, Evidence

operations:
  iuId: IUBoundary → IUId
  hasRiskTier: IUId → RiskTier
  hasContract: IUId → IUContract
  containsCanon: IUId → List(CanonId)
  iuDependsOn: IUId → List(IUId)
  hasEvidence: IUId → Evidence

axioms:
  ∀iu: IUId
    ⟹ |containsCanon(iu)| ≥ 1

  ∀c: CanonId
    ⟹ ∃iu: IUId where c ∈ containsCanon(iu)

  ∀iu: IUId
    where hasRiskTier(iu) = critical
    ⟹ hasEvidence(iu) ∈ {test, audit, formal}

  ∀iu1, iu2: IUId
    where iuDependsOn(iu1, iu2)
    ⟹ ¬iuDependsOn(iu2, iu1)

  ∀iu: IUId
    ⟹ |containsCanon(iu)| ≤ 50
```

### ThCode — Generated Code Theory

```GAT
sorts:
  CodeFile, CodeModule, CodeFunction, CodeType, TraceRef, CodeLocation

operations:
  inFile: CodeModule → CodeFile
  implementsIU: CodeModule → IUId
  exportsFunction: CodeModule → List(CodeFunction)
  exportsType: CodeModule → List(CodeType)
  tracesTo: CodeFunction → List(CanonId)
  codeLocation: CodeFunction → CodeLocation

axioms:
  ∀m: CodeModule, ∃f: CodeFile
    ⟹ inFile(m, f)

  ∀m: CodeModule, ∃iu: IUId
    ⟹ implementsIU(m, iu)

  ∀fn: CodeFunction, ∃m: CodeModule
    ⟹ fn ∈ exportsFunction(m)

  ∀fn: CodeFunction
    ⟹ |tracesTo(fn)| ≥ 1

  ∀iu: IUId, ∃m: CodeModule
    where implementsIU(m, iu)
    ⟹ ∀c ∈ containsCanon(iu), ∃fn ∈ exportsFunction(m)
       where c ∈ tracesTo(fn)
```

## Morphism Definitions

### μ_ingest : ThSpec → ThClause

**Type:** Structure-preserving homomorphism

```GAT
μ_ingest := {
  SpecDocument ↦ ClauseId,
  SpecClause ↦ ClauseId,
  clauses ↦ clauses,
  sectionOf ↦ sourceLine,
  rawText ↦ normalize,
  clauseType ↦ clauseType
}

∀d: SpecDocument
  ⟹ μ_ingest(clauses(d)) = clauses(μ_ingest(d))

∀c: SpecClause
  ⟹ μ_ingest(clauseId(c)) = hash(normalize(rawText(c)))
```

### μ_canon : ThClause → ThCanon

**Type:** Quotient morphism (collapses duplicates)

```GAT
μ_canon := {
  ClauseId ↦ CanonId,
  NormalizedText ↦ CleanStatement,
  sourceLine ↦ derivedFrom,
  clauseType ↦ hasNodeType
}

∀c: ClauseId
  ⟹ μ_canon(c) = c

∀c1, c2: ClauseId
  where c1 ≠ c2 ∧ normalize(c1) = normalize(c2)
  ⟹ μ_canon(c1) = μ_canon(c2)
  ⟹ dRate(μ_canon(c1)) > 0
```

### μ_plan : ThCanon → ThIU

**Type:** Aggregation morphism (groups nodes into boundaries)

```GAT
μ_plan := {
  CanonId ↦ IUBoundary,
  hasNodeType ↦ hasRiskTier,
  dependsOn ↦ iuDependsOn,
  derivedFrom ↦ containsCanon
}

partition(CanonId) = {containsCanon(iu) | iu ∈ IUId}

∀iu: IUId
  ⟹ |containsCanon(iu)| > 0

∀c: CanonId
  ⟹ ∃! iu: IUId where c ∈ containsCanon(iu)
```

### μ_codegen : ThIU → ThCode

**Type:** Generative morphism (constructs code from contract)

```GAT
μ_codegen := {
  IUId ↦ CodeModule,
  hasContract ↦ exportsFunction,
  containsCanon ↦ tracesTo,
  hasRiskTier ↦ codeAttributes
}

∀iu: IUId
  ⟹ implementsIU(μ_codegen(iu), iu)

∀iu: IUId, ∀c ∈ containsCanon(iu)
  ⟹ ∃fn ∈ exportsFunction(μ_codegen(iu))
     where c ∈ tracesTo(fn)

∀fn: CodeFunction, ∀c ∈ tracesTo(fn)
  ⟹ ∃iu: IUId where c ∈ containsCanon(iu)
     ∧ implementsIU(module(fn), iu)
```

## Protolenses (Bidirectional Transformations)

### Lens: ThCanon ⇄ ThCode

```GAT
get : ThCanon → ThCode × Complement
put : ThCode × Complement → ThCanon

laws:
  get(put(c, cmp)) = (c', cmp)  where c' ≈ c
  put(get(c), cmp) = c

complement := {
  canonIds: List(CanonId),
  codeLocations: List(CodeLocation),
  timestamps: List(Timestamp)
}
```

## Axiom Enforcement

### Protocol Compliance Checklist

```yaml
ThSpec Axioms:
  - clause_nonempty: ∀c, rawText(c) ≠ ε
  - clause_unique_in_section: ∀c1,c2, c1≠c2 ⟹ rawText(c1)≠rawText(c2) ∨ sectionOf(c1)≠sectionOf(c2)

ThClause Axioms:
  - clauseId_deterministic: Same text → Same ID
  - clauseId_total: Every clause has ID
  - hash_sha256: clauseId(c) = SHA-256(normalize(rawText(c)))

ThCanon Axioms:
  - drate_bounded: ∀c, dRate(c) ∈ [0, 1]
  - provenance_total: ∀c, |derivedFrom(c)| ≥ 1
  - dag_acyclic: dependsOn is acyclic
  - irreflexive: ∀c, c ∉ dependsOn(c)

ThIU Axioms:
  - iu_nonempty: ∀iu, |containsCanon(iu)| ≥ 1
  - iu_covering: ∀c, ∃iu, c ∈ containsCanon(iu)
  - iu_unique: ∀c, ∃! iu, c ∈ containsCanon(iu)
  - dag_acyclic: iuDependsOn is acyclic
  - risk_evidence: Critical IUs have test evidence
  - bounded_complexity: |containsCanon(iu)| ≤ 50

ThCode Axioms:
  - module_in_file: ∀m, ∃f, inFile(m, f)
  - module_implements_iu: ∀m, ∃iu, implementsIU(m, iu)
  - function_in_module: ∀fn, ∃m, fn ∈ exportsFunction(m)
  - traceability_total: ∀fn, |tracesTo(fn)| ≥ 1
  - coverage_complete: ∀iu, ∀c∈containsCanon(iu), ∃fn, c∈tracesTo(fn)

Morphism Laws:
  - μ_ingest_preserves: Preserves document structure
  - μ_canon_quotient: Collapses duplicates
  - μ_plan_partition: Complete, unique assignment
  - μ_codegen_generative: Constructs from contract

Protolens Laws:
  - round_trip: get(put(c, cmp)) ≈ c
  - exact_restore: put(get(c), cmp) = c
```

## Integration with Phoenix Pipeline

The Phoenix pipeline enforces GAT compliance automatically:

1. **Ingest** (`phoenix-ingest`): Validates ThSpec → ThClause morphism
2. **Canonicalize** (`phoenix-canonicalize`): Validates ThClause → ThCanon morphism
3. **Plan** (`phoenix-plan`): Validates ThCanon → ThIU morphism
4. **Codegen** (`phoenix-codegen`): Validates ThIU → ThCode morphism

Each step validates axioms and fails if violations are detected.

## Usage

```javascript
// Run with strict GAT validation
node .pi/skills/phoenix-pipeline/pipeline.js . --strict-gat

// Validate existing artifacts
node .pi/skills/phoenix-pipeline/validate.js .

// Check migration safety
node .pi/skills/phoenix-pipeline/migrate.js --from v1 --to v2
```

## References

- [Panproto Core](/home/nandi/code/phoenix/.pi/skills/panproto/)
- [GAT Specification](https://ncatlab.org/nlab/show/generalized+algebraic+theory)
- [Category Theory for Programmers](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers/)
