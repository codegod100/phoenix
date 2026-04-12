# Boundary Requirements

Generated from source code analysis.

## Definition

- DEFINITION: Boundary policy defines what dependencies are allowed
  <!-- Source: ./src/boundary.rs:12 -->
- DEFINITION: System shall define data structure 'DependencyPolicy' for storing related information.
  <!-- Source: ./src/boundary.rs:17 -->
- DEFINITION: System shall define data structure 'CodeDependencies' for storing related information.
  <!-- Source: ./src/boundary.rs:24 -->
- DEFINITION: System shall define data structure 'SideChannels' for storing related information.
  <!-- Source: ./src/boundary.rs:38 -->
- DEFINITION: System shall define enumeration 'ViolationSeverity' for categorizing values.
  <!-- Source: ./src/boundary.rs:61 -->
- DEFINITION: Extracted dependency from source code
  <!-- Source: ./src/boundary.rs:70 -->
- DEFINITION: System shall define enumeration 'DependencyType' for categorizing values.
  <!-- Source: ./src/boundary.rs:79 -->
- DEFINITION: Validation diagnostic for boundary issues
  <!-- Source: ./src/boundary.rs:90 -->
- DEFINITION: System shall define enumeration 'DiagnosticCategory' for categorizing values.
  <!-- Source: ./src/boundary.rs:99 -->
- DEFINITION: Result of boundary validation for a single file/IU
  <!-- Source: ./src/boundary.rs:110 -->
- DEFINITION: Change severity for boundary changes
  <!-- Source: ./src/boundary.rs:318 -->
- DEFINITION: Detected boundary change between two versions
  <!-- Source: ./src/boundary.rs:326 -->

## Requirement

- REQUIREMENT: Default boundary policy per PRD
  <!-- Source: ./src/boundary.rs:120 -->
- REQUIREMENT: Detect boundary changes between two versions of an IU. Per PRD: Changes to dependencies trigger cascade re-validation.
  <!-- Source: ./src/boundary.rs:335 -->
- REQUIREMENT: Format boundary validation results for display
  <!-- Source: ./src/boundary.rs:372 -->

## Scenario

- SCENARIO: Extract dependencies from source code. This is a simplified parser - a real implementation would use AST parsing.
  <!-- Source: ./src/boundary.rs:131 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| boundary_BoundaryPolicy | ./src/boundary.rs | 12 | `BoundaryPolicy` |
| boundary_DependencyPolicy | ./src/boundary.rs | 17 | `DependencyPolicy` |
| boundary_CodeDependencies | ./src/boundary.rs | 24 | `CodeDependencies` |
| boundary_SideChannels | ./src/boundary.rs | 38 | `SideChannels` |
| boundary_ViolationSeverity | ./src/boundary.rs | 61 | `ViolationSeverity` |
| boundary_ExtractedDependency | ./src/boundary.rs | 70 | `ExtractedDependency` |
| boundary_DependencyType | ./src/boundary.rs | 79 | `DependencyType` |
| boundary_ValidationDiagnostic | ./src/boundary.rs | 90 | `ValidationDiagnostic` |
| boundary_DiagnosticCategory | ./src/boundary.rs | 99 | `DiagnosticCategory` |
| boundary_BoundaryValidationResult | ./src/boundary.rs | 110 | `BoundaryValidationResult` |
| boundary_default_boundary_policy | ./src/boundary.rs | 120 | `default_boundary_policy` |
| boundary_extract_dependencies | ./src/boundary.rs | 131 | `extract_dependencies` |
| boundary_BoundaryChangeSeverity | ./src/boundary.rs | 318 | `BoundaryChangeSeverity` |
| boundary_UnitBoundaryChange | ./src/boundary.rs | 326 | `UnitBoundaryChange` |
| boundary_detect_boundary_changes | ./src/boundary.rs | 335 | `detect_boundary_changes` |
| boundary_format_boundary_report | ./src/boundary.rs | 372 | `format_boundary_report` |
