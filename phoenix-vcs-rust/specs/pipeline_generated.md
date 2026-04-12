# Pipeline Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: μ_canon: Collapse duplicate clauses into canonical requirements  Input: Clauses from ingest Output: Canonical requirement nodes with provenance tracking
  <!-- Source: ./src/pipeline.rs:178 -->
- REQUIREMENT: μ_plan: Group canonical nodes into Implementation Units  Input: Canonical nodes Output: IU boundaries with dependency graphs
  <!-- Source: ./src/pipeline.rs:278 -->
- REQUIREMENT: μ_codegen: Generate code from Implementation Units  Input: IUs with contracts Output: Generated code files
  <!-- Source: ./src/pipeline.rs:409 -->
- REQUIREMENT: Run the complete pipeline
  <!-- Source: ./src/pipeline.rs:565 -->

## Scenario

- SCENARIO: μ_ingest: Parse specifications into content-addressed clauses  Input: Markdown files in `specs/` directory Output: Clauses with canon IDs (semantic hashes)
  <!-- Source: ./src/pipeline.rs:38 -->

## Definition

- DEFINITION: Pipeline state tracking
  <!-- Source: ./src/pipeline.rs:20 -->
- DEFINITION: System shall define data structure 'StageStatus' for storing related information.
  <!-- Source: ./src/pipeline.rs:27 -->
- DEFINITION: Output of ingest phase
  <!-- Source: ./src/pipeline.rs:141 -->
- DEFINITION: A parsed clause from specification
  <!-- Source: ./src/pipeline.rs:148 -->
- DEFINITION: System shall define enumeration 'ClauseType' for categorizing values.
  <!-- Source: ./src/pipeline.rs:161 -->
- DEFINITION: Output of canonicalize phase
  <!-- Source: ./src/pipeline.rs:241 -->
- DEFINITION: Canonical requirement node
  <!-- Source: ./src/pipeline.rs:248 -->
- DEFINITION: System shall define enumeration 'CanonNodeType' for categorizing values.
  <!-- Source: ./src/pipeline.rs:259 -->
- DEFINITION: Output of plan phase
  <!-- Source: ./src/pipeline.rs:389 -->
- DEFINITION: Implementation Unit
  <!-- Source: ./src/pipeline.rs:395 -->
- DEFINITION: Output of codegen phase
  <!-- Source: ./src/pipeline.rs:551 -->
- DEFINITION: Generated code file
  <!-- Source: ./src/pipeline.rs:557 -->
- DEFINITION: Pipeline execution result
  <!-- Source: ./src/pipeline.rs:656 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| pipeline_PipelineState | ./src/pipeline.rs | 20 | `PipelineState` |
| pipeline_StageStatus | ./src/pipeline.rs | 27 | `StageStatus` |
| pipeline_ingest_specs | ./src/pipeline.rs | 38 | `ingest_specs` |
| pipeline_IngestOutput | ./src/pipeline.rs | 141 | `IngestOutput` |
| pipeline_Clause | ./src/pipeline.rs | 148 | `Clause` |
| pipeline_ClauseType | ./src/pipeline.rs | 161 | `ClauseType` |
| pipeline_canonicalize_clauses | ./src/pipeline.rs | 178 | `canonicalize_clauses` |
| pipeline_CanonicalOutput | ./src/pipeline.rs | 241 | `CanonicalOutput` |
| pipeline_CanonNode | ./src/pipeline.rs | 248 | `CanonNode` |
| pipeline_CanonNodeType | ./src/pipeline.rs | 259 | `CanonNodeType` |
| pipeline_plan_implementation_units | ./src/pipeline.rs | 278 | `plan_implementation_units` |
| pipeline_PlanOutput | ./src/pipeline.rs | 389 | `PlanOutput` |
| pipeline_ImplementationUnit | ./src/pipeline.rs | 395 | `ImplementationUnit` |
| pipeline_generate_code | ./src/pipeline.rs | 409 | `generate_code` |
| pipeline_CodegenOutput | ./src/pipeline.rs | 551 | `CodegenOutput` |
| pipeline_GeneratedFile | ./src/pipeline.rs | 557 | `GeneratedFile` |
| pipeline_run_pipeline | ./src/pipeline.rs | 565 | `run_pipeline` |
| pipeline_PipelineResult | ./src/pipeline.rs | 656 | `PipelineResult` |
