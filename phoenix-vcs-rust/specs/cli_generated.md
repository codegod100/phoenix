# Cli Requirements

Generated from source code analysis.

## Definition

- DEFINITION: Phoenix VCS — Regenerative version control
  <!-- Source: ./src/cli.rs:35 -->
- DEFINITION: Optional project root directory Enable verbose output
  <!-- Source: ./src/cli.rs:49 -->
- DEFINITION: Show complete VCS state (diagnostics, drift, evidence) Detect drift between manifest and working tree Output as JSON Validate boundary policy for a file File to validate Output as JSON Compute cascade actions for a failed IU IU ID that failed Kind of failure Failure details Compute selective invalidation for spec changes Changed canonical IDs Shadow pipeline upgrade safety check Old pipeline version New pipeline version Old nodes JSON file New nodes JSON file Generate content hash for a file File to hash Compute canonical ID from text Text to canonize Show required evidence for a risk tier Risk tier Create a waiver for manual edits File path Waiver type Expiration date (YYYY-MM-DD) Signer name Initialize a new Phoenix project Project name Skip creating example files Run the spec-to-code generation pipeline Target language for generated code Skip ingest phase Skip canonicalize phase Skip plan phase Skip codegen phase (preserves implementations) Verify lens laws after each phase Verify lens laws for the pipeline Target language Reverse engineer specs from existing code Source language to parse Output directory for specs Include private functions Don't extract doc comments
  <!-- Source: ./src/cli.rs:210 -->
- DEFINITION: System shall define enumeration 'WaiverTypeArg' for categorizing values.
  <!-- Source: ./src/cli.rs:218 -->

## Requirement

- REQUIREMENT: Run the CLI
  <!-- Source: ./src/cli.rs:246 -->
- REQUIREMENT: Function cmd_status accepts parameters: project_root and returns Result<.
  <!-- Source: ./src/cli.rs:290 -->
- REQUIREMENT: Function cmd_drift accepts parameters: project_root, json and returns Result<.
  <!-- Source: ./src/cli.rs:304 -->
- REQUIREMENT: Function cmd_boundary accepts parameters: project_root, file, json and returns Result<.
  <!-- Source: ./src/cli.rs:326 -->
- REQUIREMENT: Function cmd_cascade accepts no parameters.
  <!-- Source: ./src/cli.rs:372 -->
- REQUIREMENT: Function cmd_shadow accepts no parameters.
  <!-- Source: ./src/cli.rs:427 -->
- REQUIREMENT: Function cmd_canon_id accepts parameters: text and returns Result<.
  <!-- Source: ./src/cli.rs:463 -->
- REQUIREMENT: Function cmd_evidence accepts parameters: tier and returns Result<.
  <!-- Source: ./src/cli.rs:475 -->
- REQUIREMENT: Function cmd_waiver accepts no parameters.
  <!-- Source: ./src/cli.rs:486 -->
- REQUIREMENT: Function extract_iu_id_from_source accepts parameters: source and returns Option<String>.
  <!-- Source: ./src/cli.rs:622 -->
- REQUIREMENT: Main entry point for the binary
  <!-- Source: ./src/cli.rs:647 -->
- REQUIREMENT: Function cmd_pipeline accepts no parameters.
  <!-- Source: ./src/cli.rs:651 -->
- REQUIREMENT: Reverse engineer specs from existing code
  <!-- Source: ./src/cli.rs:892 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| cli_Cli | ./src/cli.rs | 35 | `Cli` |
| cli_Commands | ./src/cli.rs | 49 | `Commands` |
| cli_RiskTierArg | ./src/cli.rs | 210 | `RiskTierArg` |
| cli_WaiverTypeArg | ./src/cli.rs | 218 | `WaiverTypeArg` |
| cli_run | ./src/cli.rs | 246 | `run` |
| cli_cmd_status | ./src/cli.rs | 290 | `cmd_status` |
| cli_cmd_drift | ./src/cli.rs | 304 | `cmd_drift` |
| cli_cmd_boundary | ./src/cli.rs | 326 | `cmd_boundary` |
| cli_cmd_cascade | ./src/cli.rs | 372 | `cmd_cascade` |
| cli_cmd_shadow | ./src/cli.rs | 427 | `cmd_shadow` |
| cli_cmd_canon_id | ./src/cli.rs | 463 | `cmd_canon_id` |
| cli_cmd_evidence | ./src/cli.rs | 475 | `cmd_evidence` |
| cli_cmd_waiver | ./src/cli.rs | 486 | `cmd_waiver` |
| cli_extract_iu_id_from_source | ./src/cli.rs | 622 | `extract_iu_id_from_source` |
| cli_main | ./src/cli.rs | 647 | `main` |
| cli_cmd_pipeline | ./src/cli.rs | 651 | `cmd_pipeline` |
| cli_cmd_reverse | ./src/cli.rs | 892 | `cmd_reverse` |
