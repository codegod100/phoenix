# Validation Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: Function cmd_invalidate accepts parameters: project_root, changed_ids and returns Result<.
  <!-- Source: ./src/cli.rs:399 -->
- REQUIREMENT: Parse a Rust file and extract functions, structs, modules
  <!-- Source: ./src/reverse.rs:159 -->
- REQUIREMENT: Validate boundary policy against extracted dependencies. Per PRD 7.1: "Post-generation: Extract dependency graph, Validate against boundary policy"
  <!-- Source: ./src/boundary.rs:224 -->

## Scenario

- SCENARIO: Verify lens laws for the pipeline
  <!-- Source: ./src/cli.rs:778 -->
- SCENARIO: Parse TypeScript file (simplified)
  <!-- Source: ./src/reverse.rs:313 -->
- SCENARIO: Parse Python file (simplified)
  <!-- Source: ./src/reverse.rs:381 -->
- SCENARIO: Lens law verification  Checks GetPut and PutGet laws on a test instance.
  <!-- Source: ./src/lens.rs:464 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| validation_cmd_invalidate | ./src/cli.rs | 399 | `cmd_invalidate` |
| validation_cmd_verify_laws | ./src/cli.rs | 778 | `cmd_verify_laws` |
| validation_parse_rust_file | ./src/reverse.rs | 159 | `parse_rust_file` |
| validation_parse_typescript_file | ./src/reverse.rs | 313 | `parse_typescript_file` |
| validation_parse_python_file | ./src/reverse.rs | 381 | `parse_python_file` |
| validation_validate_boundary | ./src/boundary.rs | 224 | `validate_boundary` |
| validation_verify_lens_laws | ./src/lens.rs | 464 | `verify_lens_laws` |
