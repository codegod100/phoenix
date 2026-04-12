# Lens Requirements

Generated from source code analysis.

## Definition

- DEFINITION: Complement: Data discarded by `get`, needed by `put`  When we project from a richer theory to a simpler one, we capture the "lost" information in the complement. This enables round-trip restoration.
  <!-- Source: ./src/lens.rs:40 -->
- DEFINITION: Canon IDs from the source Source locations (line numbers, file paths) D-rate at time of projection Timestamp of lens application Additional metadata Provenance tracking for traceability
  <!-- Source: ./src/lens.rs:55 -->
- DEFINITION: Asymmetric Lens: Bidirectional transformation with complement  A lens L : Source ⇄ View provides: - `get`: Source → (View, Complement) - `put`: (View, Complement) → Source  This enables lossless round-trips between theories.
  <!-- Source: ./src/lens.rs:68 -->
- DEFINITION: Result of lens law verification
  <!-- Source: ./src/lens.rs:492 -->
- DEFINITION: Specification document (ThSpec)
  <!-- Source: ./src/lens.rs:503 -->
- DEFINITION: Clause graph (ThClause)
  <!-- Source: ./src/lens.rs:567 -->
- DEFINITION: Canonical graph (ThCanon)
  <!-- Source: ./src/lens.rs:573 -->
- DEFINITION: IU graph (ThIU)
  <!-- Source: ./src/lens.rs:579 -->
- DEFINITION: Code graph (ThCode)
  <!-- Source: ./src/lens.rs:585 -->

## Scenario

- SCENARIO: μ_canon: ThClause ⇄ ThCanon lens    Forward: Collapse duplicate clauses (quotient morphism) Backward: Expand canonical nodes with complement info  This is the critical quotient lens - it identifies clauses with identical normalized text.
  <!-- Source: ./src/lens.rs:181 -->

## Constraint

- CONSTRAINT: Function determine_risk_tier accepts parameters: nodes and returns crate::evidence::RiskTier.
  <!-- Source: ./src/lens.rs:624 -->

## Requirement

- REQUIREMENT: Forward direction: project source to view Backward direction: restore source from view Lens name for debugging Source theory name Target theory name   Lens composition: L2 ∘ L1  For L1 : A ⇄ B and L2 : B ⇄ C, the composition L2 ∘ L1 : A ⇄ C satisfies: - get(a) = get₂(get₁(a)) - put(c, (c1, c2)) = put₁(put₂(c, c2), c1)  The complement is a pair of the intermediate complements.
  <!-- Source: ./src/lens.rs:89 -->
- REQUIREMENT: μ_ingest: ThSpec ⇄ ThClause lens  Forward: Parse markdown specs into content-addressed clauses Backward: Reconstruct spec from clauses (preserving structure)
  <!-- Source: ./src/lens.rs:132 -->
- REQUIREMENT: μ_plan: ThCanon ⇄ ThIU lens  Forward: Partition canonical nodes into Implementation Units Backward: Decompose IUs back to canonical nodes  This is a partition lens - each canon node belongs to exactly one IU.
  <!-- Source: ./src/lens.rs:286 -->
- REQUIREMENT: μ_codegen: ThIU ⇄ ThCode lens  Forward: Generate code from IU contracts Backward: Extract IU info from code (via phoenix: iu_id comments)
  <!-- Source: ./src/lens.rs:377 -->
- REQUIREMENT: The complete pipeline as a composed lens  μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest  This gives us the full spec-to-code transformation with round-trip capability through the complement chain.
  <!-- Source: ./src/lens.rs:449 -->
- REQUIREMENT: Function extract_domain accepts parameters: statement and returns String.
  <!-- Source: ./src/lens.rs:603 -->
- REQUIREMENT: Function extract_section accepts parameters: path and returns String.
  <!-- Source: ./src/lens.rs:650 -->
- REQUIREMENT: Function generate_code accepts parameters: iu and returns String.
  <!-- Source: ./src/lens.rs:658 -->
- REQUIREMENT: Function generate_rust accepts parameters: iu and returns String.
  <!-- Source: ./src/lens.rs:667 -->
- REQUIREMENT: Function generate_typescript accepts parameters: iu and returns String.
  <!-- Source: ./src/lens.rs:696 -->
- REQUIREMENT: Function generate_python accepts parameters: iu and returns String.
  <!-- Source: ./src/lens.rs:709 -->
- REQUIREMENT: Function extract_iu_id_from_code accepts parameters: code and returns Option<String>.
  <!-- Source: ./src/lens.rs:722 -->
- REQUIREMENT: Function extract_canon_ids_from_code accepts parameters: code and returns Vec<String>.
  <!-- Source: ./src/lens.rs:731 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| lens_Complement | ./src/lens.rs | 40 | `Complement` |
| lens_Provenance | ./src/lens.rs | 55 | `Provenance` |
| lens_Lens | ./src/lens.rs | 68 | `Lens` |
| lens_compose | ./src/lens.rs | 89 | `compose` |
| lens_ingest_lens | ./src/lens.rs | 132 | `ingest_lens` |
| lens_canonicalize_lens | ./src/lens.rs | 181 | `canonicalize_lens` |
| lens_plan_lens | ./src/lens.rs | 286 | `plan_lens` |
| lens_codegen_lens | ./src/lens.rs | 377 | `codegen_lens` |
| lens_pipeline_lens | ./src/lens.rs | 449 | `pipeline_lens` |
| lens_LensVerification | ./src/lens.rs | 492 | `LensVerification` |
| lens_SpecDocument | ./src/lens.rs | 503 | `SpecDocument` |
| lens_ClauseGraph | ./src/lens.rs | 567 | `ClauseGraph` |
| lens_CanonGraph | ./src/lens.rs | 573 | `CanonGraph` |
| lens_IUGraph | ./src/lens.rs | 579 | `IUGraph` |
| lens_CodeGraph | ./src/lens.rs | 585 | `CodeGraph` |
| lens_extract_domain | ./src/lens.rs | 603 | `extract_domain` |
| lens_determine_risk_tier | ./src/lens.rs | 624 | `determine_risk_tier` |
| lens_extract_section | ./src/lens.rs | 650 | `extract_section` |
| lens_generate_code | ./src/lens.rs | 658 | `generate_code` |
| lens_generate_rust | ./src/lens.rs | 667 | `generate_rust` |
| lens_generate_typescript | ./src/lens.rs | 696 | `generate_typescript` |
| lens_generate_python | ./src/lens.rs | 709 | `generate_python` |
| lens_extract_iu_id_from_code | ./src/lens.rs | 722 | `extract_iu_id_from_code` |
| lens_extract_canon_ids_from_code | ./src/lens.rs | 731 | `extract_canon_ids_from_code` |
