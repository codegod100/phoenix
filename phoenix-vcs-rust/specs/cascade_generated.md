# Cascade Requirements

Generated from source code analysis.

## Constraint

- CONSTRAINT: Get all transitive dependencies of an IU (upstream dependencies). Used when regenerating - all dependencies must be valid first.
  <!-- Source: ./src/cascade.rs:153 -->
- CONSTRAINT: Topological sort of IUs for regeneration order. Dependencies must be regenerated before dependents.
  <!-- Source: ./src/cascade.rs:321 -->

## Scenario

- SCENARIO: Get all transitive dependents of an IU (downstream dependencies). Used when an IU fails - all dependents need re-validation.
  <!-- Source: ./src/cascade.rs:128 -->
- SCENARIO: Compute cascade actions when an IU's evidence fails. Per PRD Section 11: "Failure propagation is explicit and graph-based"
  <!-- Source: ./src/cascade.rs:178 -->
- SCENARIO: Compute selective invalidation when a spec changes. Per PRD Section 0: "Changing one spec line invalidates only the dependent subtree"
  <!-- Source: ./src/cascade.rs:249 -->

## Requirement

- REQUIREMENT: Build IU dependency graph from IU definitions. Per PRD: Side-channel dependencies create graph edges for invalidation.
  <!-- Source: ./src/cascade.rs:73 -->
- REQUIREMENT: Detect circular dependencies in the IU graph
  <!-- Source: ./src/cascade.rs:275 -->
- REQUIREMENT: Format cascade event for display
  <!-- Source: ./src/cascade.rs:365 -->
- REQUIREMENT: Format invalidation report
  <!-- Source: ./src/cascade.rs:410 -->
- REQUIREMENT: Build petgraph graph for advanced graph operations
  <!-- Source: ./src/cascade.rs:440 -->

## Definition

- DEFINITION: Implementation Unit node in the dependency graph
  <!-- Source: ./src/cascade.rs:12 -->
- DEFINITION: System shall define enumeration 'RiskTier' for categorizing values.
  <!-- Source: ./src/cascade.rs:21 -->
- DEFINITION: Dependency graph of IUs
  <!-- Source: ./src/cascade.rs:34 -->
- DEFINITION: System shall define data structure 'IUEdge' for storing related information.
  <!-- Source: ./src/cascade.rs:40 -->
- DEFINITION: Actions triggered by cascade events
  <!-- Source: ./src/cascade.rs:48 -->
- DEFINITION: A cascade event triggered by evidence failure
  <!-- Source: ./src/cascade.rs:63 -->
- DEFINITION: IU definition for graph construction
  <!-- Source: ./src/cascade.rs:116 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| cascade_IUNode | ./src/cascade.rs | 12 | `IUNode` |
| cascade_RiskTier | ./src/cascade.rs | 21 | `RiskTier` |
| cascade_IUGraph | ./src/cascade.rs | 34 | `IUGraph` |
| cascade_IUEdge | ./src/cascade.rs | 40 | `IUEdge` |
| cascade_CascadeAction | ./src/cascade.rs | 48 | `CascadeAction` |
| cascade_CascadeEvent | ./src/cascade.rs | 63 | `CascadeEvent` |
| cascade_build_dependency_graph | ./src/cascade.rs | 73 | `build_dependency_graph` |
| cascade_IUDef | ./src/cascade.rs | 116 | `IUDef` |
| cascade_get_transitive_dependents | ./src/cascade.rs | 128 | `get_transitive_dependents` |
| cascade_get_transitive_dependencies | ./src/cascade.rs | 153 | `get_transitive_dependencies` |
| cascade_compute_cascade | ./src/cascade.rs | 178 | `compute_cascade` |
| cascade_compute_invalidation | ./src/cascade.rs | 249 | `compute_invalidation` |
| cascade_detect_circular_dependencies | ./src/cascade.rs | 275 | `detect_circular_dependencies` |
| cascade_topological_sort | ./src/cascade.rs | 321 | `topological_sort` |
| cascade_format_cascade_event | ./src/cascade.rs | 365 | `format_cascade_event` |
| cascade_format_invalidation_report | ./src/cascade.rs | 410 | `format_invalidation_report` |
| cascade_build_petgraph | ./src/cascade.rs | 440 | `build_petgraph` |
