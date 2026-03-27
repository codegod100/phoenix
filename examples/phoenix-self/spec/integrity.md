# Integrity: Drift Detection, Evidence & Cascading Failures

The integrity subsystem ensures generated code stays consistent with specifications through drift detection, risk-tiered evidence requirements, and explicit failure propagation.

## Drift Detection

- On status, the system must compare the working tree against the generated_manifest
- If a mismatch exists and no waiver is present, the system must emit an ERROR diagnostic
- Unlabeled manual edits must block acceptance of the affected IU
- Manual edits must be labeled as one of: promote_to_requirement, waiver (signed), or temporary_patch (expires)
- Temporary patches must have an expiration date and must trigger a warning when expired

## Evidence & Policy Engine

- Evidence requirements must be tiered by IU risk level
- Low-tier IUs require: typecheck, lint, and boundary validation
- Medium-tier IUs require: unit tests in addition to low-tier evidence
- High-tier IUs require: unit tests, property tests, threat note, and static analysis
- Critical-tier IUs require: human signoff or formal verification / simulation evidence
- Evidence must bind to canonical nodes, IU IDs, and generated artifact hashes
- Evidence bindings must always be traceable: given any evidence artifact, the system must identify which canonical nodes and IUs it covers

## Cascading Failure Semantics

- If evidence for IU-X fails, IU-X must be blocked from acceptance
- When IU-X is blocked, all dependent IUs must re-run: typecheck, boundary checks, and relevant tagged tests
- Failure propagation must be explicit and graph-based: the system must traverse the IU dependency graph
- Cascade depth must be bounded to prevent infinite propagation loops
- The system must report the full cascade chain in diagnostics so developers can trace the root cause
