# Phoenix VCS — Rust Implementation

> Regenerative version control that compiles intent to working software.

This is a Rust implementation of the Phoenix VCS core concepts:
- Content-addressed identities (SHA-256)
- Risk-tiered evidence policies
- Graph-based cascade semantics
- Shadow pipeline upgrades
- Defensive drift detection

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phoenix VCS Core                             │
├─────────────────────────────────────────────────────────────────┤
│  identity.rs    │  SHA-256 hashing, D-rate, bootstrap states    │
│  drift.rs        │  Manifest comparison, waiver system           │
│  boundary.rs     │  Dependency extraction, architectural linting │
│  evidence.rs     │  Risk-tiered evidence, policy enforcement     │
│  cascade.rs      │  Graph operations, selective invalidation     │
│  shadow.rs       │  Pipeline upgrade safety (shadow mode)        │
│  status.rs       │  Unified diagnostics & severity model           │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Build the project
cargo build --release

# Run status check in a Phoenix project
cargo run -- status

# Detect drift
cargo run -- drift

# Validate boundaries
cargo run -- boundary src/generated/app/database.rs

# Compute cascade for a failed IU
cargo run -- cascade abc123def456

# Check what IUs need regeneration after spec changes
cargo run -- invalidate node-abc123 node-def456

# Show required evidence for a risk tier
cargo run -- evidence critical
```

## Core Concepts

### Content-Addressed Identity

Every entity has a stable SHA-256 identity:

```rust
use phoenix_vcs::{canon_id, iu_id, file_hash, short_hash, normalize_text};

// Canonical requirement ID from text
let requirement_id = canon_id(&normalize_text("system shall validate email format"));
// → 'a1b2c3d4...'

// IU ID from contract + requirements
let unit_id = iu_id("AuthModule", "Handles login", &[requirement_id.clone()]);
// → 'ec4737a7...'

// File content hash for drift detection
let content_hash = file_hash(source_code);
// → 'f8a9b0c1...'

// Short prefix for display
let display = short_hash(&unit_id);  // → 'ec4737a7'
```

### Risk-Tiered Evidence

Evidence requirements scale with risk:

| Tier | Required Evidence |
|------|-------------------|
| **Low** | typecheck, lint, boundary_validation |
| **Medium** | + unit_tests |
| **High** | + property_tests, threat_note |
| **Critical** | + static_analysis, human_signoff |

```rust
use phoenix_vcs::{get_required_evidence, evaluate_policy, RiskTier, EvidenceRecord};

let required = get_required_evidence(RiskTier::High);
// → [typecheck, lint, boundary_validation, unit_tests, property_tests, threat_note]

let evaluation = evaluate_policy(&iu_id, RiskTier::High, &evidence_records);
// → { status: ACCEPTED | REJECTED | PENDING, score: 85, ... }
```

### Defensive Drift Detection

Blocks acceptance on unlabeled manual edits:

```rust
use phoenix_vcs::{detect_drift, create_waiver, WaiverType};

let report = detect_drift(project_root, &manifest, &waivers)?;

if report.has_blocking_drift {
    println!("❌ REJECTED: Manual edits detected without waiver");
    println!("Options:");
    println!("  1. Revert to generated version");
    println!("  2. Create waiver: promote_to_requirement | temporary_patch | manual_override");
}

// Create a waiver
let waiver = create_waiver(WaiverType::TemporaryPatch, Some("2026-04-15".to_string()), Some("nandi"));
```

### Selective Invalidation

Only regenerate the subtree affected by spec changes:

```rust
use phoenix_vcs::{compute_invalidation, build_dependency_graph};

// Changed requirements from spec edit
let changed_canon_ids = vec!["node-a1b2c3d4", "node-b2c3d4e5"];

// Compute which IUs need regeneration
let invalidated_ius = compute_invalidation(&graph, &changed_canon_ids, &iu_to_canon_map);
// → ['iu-ec4737a7', 'iu-d9277914', ...] // Only affected subtree

println!("Selective regeneration: {} of {} IUs", invalidated_ius.len(), total_ius);
```

### Cascade Failure Semantics

When evidence fails, dependents are re-validated:

```rust
use phoenix_vcs::{compute_cascade, build_dependency_graph};

let event = compute_cascade(&graph, &failed_iu_id, "unit_tests", "Test failure details");

for action in &event.actions {
    match action {
        CascadeAction::Retypecheck { target_iu, reason } => {
            run_typecheck(target_iu).await?;
        }
        CascadeAction::ReboundaryCheck { target_iu, reason } => {
            validate_boundaries(target_iu)?;
        }
        CascadeAction::Retest { target_iu, test_tags, reason } => {
            run_tests(target_iu, test_tags).await?;
        }
        CascadeAction::Regenerate { target_iu, reason } => {
            if is_high_risk(target_iu) {
                regenerate(target_iu).await?;
            }
        }
        CascadeAction::Block { target_iu, reason } => {
            println!("Blocking {}", target_iu);
        }
    }
}
```

### Shadow Pipeline Upgrades

Test pipeline changes safely:

```rust
use phoenix_vcs::{run_shadow_pipeline, UpgradeClassification};

let result = run_shadow_pipeline(old_nodes, new_nodes, "v1.2.3", "v1.3.0");

match result.classification {
    UpgradeClassification::Safe => {
        println!("✅ Upgrade accepted: Changes <3%, no orphans");
    }
    UpgradeClassification::CompactionEvent => {
        println!("⚠️ Review required: Significant but manageable changes");
    }
    UpgradeClassification::Reject => {
        println!("❌ Upgrade rejected: Orphan nodes or excessive churn");
    }
}
```

## CLI Usage

```bash
# Full status check (diagnostics, drift, evidence, dependencies)
phoenix-vcs status

# Check for manual edits
phoenix-vcs drift

# Validate architectural boundaries
phoenix-vcs boundary src/generated/app/database.rs

# Compute failure cascade
phoenix-vcs cascade ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88

# Find IUs to regenerate after spec change
phoenix-vcs invalidate node-a1b2c3d4 node-b2c3d4e5 node-c3d4e5f6

# Shadow pipeline upgrade check
phoenix-vcs shadow v1.0.0 v1.1.0 --old-file old_canon.json --new-file new_canon.json

# Generate content hash
phoenix-vcs hash src/app.rs

# Compute canonical ID
phoenix-vcs canon-id "System shall validate email format"

# Show required evidence
phoenix-vcs evidence high

# Create a waiver
phoenix-vcs waiver src/app.rs temporary-patch --expires 2026-04-15 --signed-by nandi
```

## API Example

```rust
use phoenix_vcs::*;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load manifest
    let manifest = drift::GeneratedManifest::load("./my-project")?
        .expect("No manifest found");
    
    // Load waivers
    let waivers = drift::load_waivers("./my-project")?;
    
    // Detect drift
    let report = drift::detect_drift("./my-project", &manifest, &waivers)?;
    println!("{}", drift::format_drift_report(&report));
    
    // Get overall status
    let status = status::get_vcs_status("./my-project").await?;
    println!("{}", status::format_vcs_status(&status));
    
    // Check health
    if status::is_healthy_enough(&status) {
        println!("Project is healthy enough for operations");
    }
    
    Ok(())
}
```

## Project Structure

```
phoenix-vcs-rust/
├── Cargo.toml
├── src/
│   ├── main.rs           # Binary entry point
│   ├── lib.rs            # Library exports
│   ├── identity.rs       # SHA-256, D-rate, bootstrap
│   ├── drift.rs          # Drift detection & waivers
│   ├── boundary.rs       # Dependency extraction
│   ├── evidence.rs       # Risk-tiered policies
│   ├── cascade.rs        # Dependency graph & invalidation
│   ├── shadow.rs         # Pipeline upgrade safety
│   ├── status.rs         # Unified diagnostics
│   └── cli.rs            # Command-line interface
└── tests/
    └── integration_test.rs
```

## Running Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_drift_detection -- --nocapture
```

## Metrics to Track

Per PRD Section 13:

- **D-rate**: Target ≤5%, Alarm at >15%
- **Average policy score**: Target >90/100
- **Drift incidents**: Should be 0 (all edits labeled)
- **Boundary violations**: Should decrease over time
- **Cascade events**: Indicator of dependency graph health

## Trust Surface

Per PRD Section 0: **"Trust > cleverness"**

This implementation is designed to be:

1. **Conservative**: When in doubt, block (REJECT > silent acceptance)
2. **Explainable**: Every status item has severity, category, and recommended actions
3. **Correct-enough**: D-rate tracking ensures classification quality
4. **Defensive**: Drift detection prevents unlabeled manual edits

## License

MIT
