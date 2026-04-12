# Identity Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: Compute SHA-256 hex digest of input string.
  <!-- Source: ./src/identity.rs:13 -->
- REQUIREMENT: Compute canonical node ID from normalized requirement text. This is the content-addressed identity for requirements.
  <!-- Source: ./src/identity.rs:44 -->
- REQUIREMENT: Compute Implementation Unit ID from contract and source requirements. This ensures IUs with identical contracts+requirements get identical IDs.
  <!-- Source: ./src/identity.rs:50 -->

## Scenario

- SCENARIO: Normalize text for semantic hashing. - Lowercase - Collapse whitespace - Remove punctuation fluff
  <!-- Source: ./src/identity.rs:75 -->
- SCENARIO: Classify a change based on hash distances and signals
  <!-- Source: ./src/identity.rs:115 -->

## Definition

- DEFINITION: Change classification: A, B, C, or D
  <!-- Source: ./src/identity.rs:85 -->
- DEFINITION: Trivial (formatting only) Local semantic change Contextual semantic shift Uncertain - requires manual review Signals used for change classification
  <!-- Source: ./src/identity.rs:98 -->
- DEFINITION: Classification result with confidence
  <!-- Source: ./src/identity.rs:106 -->
- DEFINITION: D-Rate tracker as defined in PRD Section 4.1
  <!-- Source: ./src/identity.rs:151 -->
- DEFINITION: Check if D-rate alarm should trigger (per PRD: alarm at >15%)
  <!-- Source: ./src/identity.rs:230 -->
- DEFINITION: System shall define data structure 'DRateStatus' for storing related information.
  <!-- Source: ./src/identity.rs:237 -->
- DEFINITION: Bootstrap state machine from PRD Section 3.2
  <!-- Source: ./src/identity.rs:245 -->
- DEFINITION: Bootstrap state machine tracks stabilization
  <!-- Source: ./src/identity.rs:253 -->
- DEFINITION: During cold/warming, D-rate alarms are suppressed (PRD 4.1) CanonNode represents a canonical requirement node
  <!-- Source: ./src/identity.rs:303 -->
- DEFINITION: System shall define enumeration 'CanonNodeType' for categorizing values.
  <!-- Source: ./src/identity.rs:312 -->
- DEFINITION: System shall define data structure 'CanonEdge' for storing related information.
  <!-- Source: ./src/identity.rs:321 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| identity_sha256 | ./src/identity.rs | 13 | `sha256` |
| identity_canon_id | ./src/identity.rs | 44 | `canon_id` |
| identity_iu_id | ./src/identity.rs | 50 | `iu_id` |
| identity_normalize_text | ./src/identity.rs | 75 | `normalize_text` |
| identity_ChangeClass | ./src/identity.rs | 85 | `ChangeClass` |
| identity_ClassificationSignals | ./src/identity.rs | 98 | `ClassificationSignals` |
| identity_ClassificationResult | ./src/identity.rs | 106 | `ClassificationResult` |
| identity_classify_change | ./src/identity.rs | 115 | `classify_change` |
| identity_DRateTracker | ./src/identity.rs | 151 | `DRateTracker` |
| identity_DRateLevel | ./src/identity.rs | 230 | `DRateLevel` |
| identity_DRateStatus | ./src/identity.rs | 237 | `DRateStatus` |
| identity_BootstrapState | ./src/identity.rs | 245 | `BootstrapState` |
| identity_BootstrapStateMachine | ./src/identity.rs | 253 | `BootstrapStateMachine` |
| identity_CanonNode | ./src/identity.rs | 303 | `CanonNode` |
| identity_CanonNodeType | ./src/identity.rs | 312 | `CanonNodeType` |
| identity_CanonEdge | ./src/identity.rs | 321 | `CanonEdge` |
