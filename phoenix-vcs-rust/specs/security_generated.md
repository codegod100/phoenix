# Security Requirements

Generated from source code analysis.

## Scenario

- SCENARIO: Compute file content hash for drift detection.
  <!-- Source: ./src/identity.rs:62 -->

## Requirement

- REQUIREMENT: Function cmd_hash accepts parameters: file and returns Result<.
  <!-- Source: ./src/cli.rs:452 -->
- REQUIREMENT: Compute clause_semhash — pure content identity. Based on normalized text only (no structural context).
  <!-- Source: ./src/identity.rs:21 -->
- REQUIREMENT: Compute context_semhash — content + structural context. Includes section path and neighboring clause hashes for stability analysis.
  <!-- Source: ./src/identity.rs:27 -->
- REQUIREMENT: Compute a short 8-char prefix for human-readable display.
  <!-- Source: ./src/identity.rs:67 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| security_cmd_hash | ./src/cli.rs | 452 | `cmd_hash` |
| security_clause_semhash | ./src/identity.rs | 21 | `clause_semhash` |
| security_context_semhash | ./src/identity.rs | 27 | `context_semhash` |
| security_file_hash | ./src/identity.rs | 62 | `file_hash` |
| security_short_hash | ./src/identity.rs | 67 | `short_hash` |
