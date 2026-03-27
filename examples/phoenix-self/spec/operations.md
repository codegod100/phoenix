# Operations: Compaction, Diagnostics & Bootstrap

The operations subsystem manages storage lifecycle, system diagnostics, and the bootstrap initialization flow.

## Compaction

- The system must maintain three storage tiers: Hot Graph (last 30 days), Ancestry Index (forever metadata), and Cold Packs (heavy blobs)
- Compaction must never delete: node headers, provenance edges, approvals, or signatures
- Compaction must be triggered by: size threshold exceeded, pipeline upgrade accepted, or time-based fallback
- Each compaction must produce a CompactionEvent meta-node in the provenance graph
- PolicyBot must announce every compaction event

## Diagnostics & Severity Model

- Every status item must include: severity (error, warning, or info), category, subject, message, and recommended_actions
- Status items must be grouped by severity in display output
- The diagnostics system is the primary user experience surface for Phoenix
- phoenix status must always be explainable, conservative, and correct-enough to rely on
- Diagnostic messages must never be ambiguous about what action the developer should take

## Bootstrap Flow

- The bootstrap command must execute in order: cold pass, canonicalization, warm pass, generate Trust Dashboard, set system state to WARMING
- D-rate alarms must be suppressed during the BOOTSTRAP_COLD phase
- Severity must be downgraded during the BOOTSTRAP_WARMING phase
- After stabilization, the system must transition to STEADY_STATE
- Bootstrap must be resumable: if interrupted, it must pick up from the last completed phase
- The system must never transition to STEADY_STATE until the D-rate is within acceptable bounds
