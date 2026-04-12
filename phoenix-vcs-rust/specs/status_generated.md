# Status Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: Get complete VCS status for a project
  <!-- Source: ./src/status.rs:105 -->
- REQUIREMENT: Format VCS status for display
  <!-- Source: ./src/status.rs:186 -->

## Scenario

- SCENARIO: Check if project is healthy enough for operations
  <!-- Source: ./src/status.rs:308 -->
- SCENARIO: Check if project has blocking drift
  <!-- Source: ./src/status.rs:313 -->

## Definition

- DEFINITION: Overall VCS state
  <!-- Source: ./src/status.rs:13 -->
- DEFINITION: System shall define enumeration 'VCSStatus' for categorizing values.
  <!-- Source: ./src/status.rs:24 -->
- DEFINITION: Diagnostic severity levels
  <!-- Source: ./src/status.rs:35 -->
- DEFINITION: Individual diagnostic
  <!-- Source: ./src/status.rs:50 -->
- DEFINITION: System shall define enumeration 'DiagnosticCategory' for categorizing values.
  <!-- Source: ./src/status.rs:60 -->
- DEFINITION: Drift summary for status
  <!-- Source: ./src/status.rs:77 -->
- DEFINITION: Evidence summary for status
  <!-- Source: ./src/status.rs:87 -->
- DEFINITION: Dependency summary for status
  <!-- Source: ./src/status.rs:97 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| status_VCSState | ./src/status.rs | 13 | `VCSState` |
| status_VCSStatus | ./src/status.rs | 24 | `VCSStatus` |
| status_Severity | ./src/status.rs | 35 | `Severity` |
| status_Diagnostic | ./src/status.rs | 50 | `Diagnostic` |
| status_DiagnosticCategory | ./src/status.rs | 60 | `DiagnosticCategory` |
| status_DriftSummary | ./src/status.rs | 77 | `DriftSummary` |
| status_EvidenceSummary | ./src/status.rs | 87 | `EvidenceSummary` |
| status_DependencySummary | ./src/status.rs | 97 | `DependencySummary` |
| status_get_vcs_status | ./src/status.rs | 105 | `get_vcs_status` |
| status_format_vcs_status | ./src/status.rs | 186 | `format_vcs_status` |
| status_is_healthy_enough | ./src/status.rs | 308 | `is_healthy_enough` |
| status_has_blocking_drift | ./src/status.rs | 313 | `has_blocking_drift` |
