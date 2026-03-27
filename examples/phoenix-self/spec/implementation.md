# Implementation Units & Boundary Policies

Implementation Units (IUs) are stable compilation boundaries that map canonical requirements to generated code. Boundary policies enforce architectural constraints.

## Implementation Unit Structure

- An Implementation Unit is defined by: iu_id, kind (module or function), risk_tier, contract, dependencies, boundary_policy, impact, and evidence_policy
- IU IDs must be content-addressed and deterministic
- IUs must declare their risk tier: low, medium, high, or critical
- Bots must propose IU changes; humans or policy must accept them
- Each IU must declare its contract: the set of canonical nodes it implements

## Boundary Policy Schema

- Each IU must declare its allowed and forbidden code dependencies: allowed_ius, allowed_packages, forbidden_ius, forbidden_packages, and forbidden_paths
- Each IU must declare its side-channel dependencies: databases, queues, caches, config, external_apis, and files
- Side-channel dependencies must create edges in the invalidation graph
- Boundary policies must be enforced post-generation by the architectural linter

## Architectural Linter

- After code generation, the linter must extract the dependency graph from generated code
- The linter must validate all dependencies against the IU's boundary policy
- Dependency violations must be emitted as diagnostics with configurable severity (error or warning)
- Side-channel violations must be emitted as diagnostics with configurable severity
- The linter must never silently ignore a boundary violation

## Regeneration Engine

- Regeneration must operate at IU granularity: only invalidated IUs are regenerated
- Each regeneration must record: model_id, promptpack hash, toolchain version, and normalization steps
- Generated artifacts must produce a generated_manifest with per-file and per-IU hashes
- The manifest must be stored at .phoenix/generated_manifest
- Regeneration must be reproducible: same inputs must produce semantically equivalent outputs
