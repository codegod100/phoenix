# Drift Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: Create a waiver for manual edits (PRD Section 9)
  <!-- Source: ./src/drift.rs:215 -->

## Definition

- DEFINITION: File entry in the generated manifest
  <!-- Source: ./src/drift.rs:17 -->
- DEFINITION: Generated manifest tracks what was generated
  <!-- Source: ./src/drift.rs:26 -->
- DEFINITION: Load manifest from .phoenix/manifests/generated_manifest.json Save manifest to .phoenix/manifests/generated_manifest.json Waiver types for manual edits
  <!-- Source: ./src/drift.rs:72 -->
- DEFINITION: Waiver for manual edits
  <!-- Source: ./src/drift.rs:83 -->
- DEFINITION: Drift status for a file
  <!-- Source: ./src/drift.rs:91 -->
- DEFINITION: Single drift entry for a file
  <!-- Source: ./src/drift.rs:101 -->
- DEFINITION: Complete drift report
  <!-- Source: ./src/drift.rs:112 -->
- DEFINITION: System shall define data structure 'DriftSummary' for storing related information.
  <!-- Source: ./src/drift.rs:121 -->

## Constraint

- CONSTRAINT: Detect drift between manifest and working tree. Per PRD Section 9: Manual edits must be labeled or they block acceptance.
  <!-- Source: ./src/drift.rs:131 -->

## Scenario

- SCENARIO: Format drift report for display
  <!-- Source: ./src/drift.rs:228 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| drift_FileEntry | ./src/drift.rs | 17 | `FileEntry` |
| drift_GeneratedManifest | ./src/drift.rs | 26 | `GeneratedManifest` |
| drift_WaiverType | ./src/drift.rs | 72 | `WaiverType` |
| drift_Waiver | ./src/drift.rs | 83 | `Waiver` |
| drift_DriftStatus | ./src/drift.rs | 91 | `DriftStatus` |
| drift_DriftEntry | ./src/drift.rs | 101 | `DriftEntry` |
| drift_DriftReport | ./src/drift.rs | 112 | `DriftReport` |
| drift_DriftSummary | ./src/drift.rs | 121 | `DriftSummary` |
| drift_detect_drift | ./src/drift.rs | 131 | `detect_drift` |
| drift_create_waiver | ./src/drift.rs | 215 | `create_waiver` |
| drift_format_drift_report | ./src/drift.rs | 228 | `format_drift_report` |
