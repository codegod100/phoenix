# Phase D — Evidence, Policy & Cascading Failure

## Overview

Phase D enforces risk-tiered evidence requirements for each IU and propagates
failures through the dependency graph. When evidence fails for an IU, its
dependents are re-validated.

## Components

### 1. Evidence Model (`src/models/evidence.ts`)

```typescript
enum EvidenceKind { TYPECHECK, LINT, BOUNDARY, UNIT_TEST, PROPERTY_TEST, STATIC_ANALYSIS, THREAT_NOTE, HUMAN_SIGNOFF }
enum EvidenceStatus { PASS, FAIL, PENDING, SKIPPED }

interface EvidenceRecord {
  evidence_id: string;
  kind: EvidenceKind;
  status: EvidenceStatus;
  iu_id: string;
  canon_ids: string[];
  artifact_hash?: string;
  message?: string;
  timestamp: string;
}
```

### 2. Policy Engine (`src/policy-engine.ts`)

Evaluates whether an IU has sufficient evidence for its risk tier.

### 3. Cascade Engine (`src/cascade.ts`)

When IU-X fails, propagates to dependents:
- Dependent IU-Y: re-run typecheck, boundary, relevant tests
- Failure propagation is explicit and graph-based

### 4. Evidence Store (`src/store/evidence-store.ts`)

Persists evidence records bound to IU IDs and canonical nodes.
