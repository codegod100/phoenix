# Phoenix VCS Provenance Graph: examples/taskflow

## Visual Representation (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROVENANCE GRAPH: examples/taskflow                │
│                  Content-Addressed Transformations with Traceability        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ SPEC LAYER (Source Documents)                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐     │
│   │ tasks.md    │    │ analytics.md    │    │ web-dashboard-*.md      │     │
│   │ 9 clauses   │    │ 11 clauses      │    │ 27 clauses              │     │
│   └──────┬──────┘    └────────┬────────┘    └────────────┬────────────┘     │
│          │                     │                          │                   │
│          └─────────────────────┴──────────────────────────┘                   │
│                     │  (47 total clauses extracted)                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼ parse & canonicalize
┌─────────────────────────────────────────────────────────────────────────────┐
│ CANONICAL LAYER (Requirements - Content-Addressed)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │ a3f7c8d9... │    │ b4e8d9f0... │    │ c5f9e0a1... │    │ d60af1b2... │   │
│   │ REQUIREMENT │    │ REQUIREMENT │    │ REQUIREMENT │    │ CONSTRAINT  │   │
│   │ Dashboard   │    │ Compact     │    │ Create task │    │ Title       │   │
│   │ render HTML │    │ header      │    │ form        │    │ validation  │   │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│          │                  │                  │                  │          │
│          └──────────────────┴──────────────────┴──────────────────┘          │
│                              │                                               │
│                              │  (43 more canonical nodes...)                  │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
                               ▼ group into IUs
┌─────────────────────────────────────────────────────────────────────────────┐
│ IMPLEMENTATION UNIT LAYER (Content-Addressed Contracts)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │  ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88  │    │
│   │                                                                     │    │
│   │  Dashboard Page                                                     │    │
│   │  RISK TIER: HIGH                                                    │    │
│   │  34 source requirements                                             │    │
│   │                                                                     │    │
│   │  Contract: Complete HTML dashboard with inline CSS/JS               │    │
│   │  Invariants: Catppuccin Mocha only, localStorage persistence,      │    │
│   │              inline edit panels, responsive layout                   │    │
│   │                                                                     │    │
│   └────────────────────────────────┬────────────────────────────────────┘    │
│                                    │                                         │
│   ┌──────────────────────────┐     │     ┌─────────────────────────────────┐  │
│   │  59d32939d50083b6...     │◄────┘     │  a6550cdc3ef254c135...        │  │
│   │                          │           │                                 │  │
│   │  Analytics Panel         │           │  Task List Display            │  │
│   │  RISK TIER: LOW          │           │  RISK TIER: MEDIUM            │  │
│   │  5 source requirements   │           │  5 source requirements        │  │
│   │                          │           │                                 │  │
│   └──────────────────────────┘           └─────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │  91cdb7e04a917c132c5de2e90731694b755d911d82ab03eb8b67e2232d3aa0b4  │    │
│   │                                                                     │    │
│   │  Analytics Metrics                                                  │    │
│   │  (server-side metrics calculation)                                  │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬────────────────────────────────────────────┘
                                   │
                                   ▼ generate code
┌─────────────────────────────────────────────────────────────────────────────┐
│ GENERATED CODE LAYER (Content-Addressed with SHA-256 Hashes)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Dashboard Page (ec4737a7...)  ──────►  dashboard-page.ts                  │
│   ┌────────────────────┐                 ┌────────────────────────────┐        │
│   │ _phoenix = {       │                 │ Hash: a1b2c3d4e5f6...       │        │
│   │   iu_id: "ec47...",│                 │ Size: 12,453 bytes         │        │
│   │   name: "...",     │                 │ Generated: 2026-04-07      │        │
│   │   risk_tier: "high"│                 └────────────────────────────┘        │
│   │ }                │                                                      │
│   └────────────────────┘                                                      │
│                                                                             │
│   Analytics Panel (59d329...)  ───────►  analytics-panel.ts                 │
│                                          Hash: e5f678901234...              │
│                                          Size: 3,192 bytes                  │
│                                                                             │
│   Task List Display (a6550c...)  ─────►  task-list-display.ts               │
│                                                                             │
│   ... and 29 more generated files                                           │
│                                                                             │
│   Tests: __tests__/web-dashboard.test.ts                                    │
│          __tests__/analytics.test.ts                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼ validate
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVIDENCE LAYER (Quality Gates)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Dashboard Page (HIGH tier requires):                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│   │ typecheck   │  │ lint        │  │ unit_tests  │  │ property_tests  │   │
│   │   ✅ PASS   │  │   ✅ PASS   │  │   ✅ PASS   │  │    N/A          │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                                                                             │
│   Policy Evaluation: ✅ ACCEPTED (score: 85/100)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│ TRACEABILITY CHAIN                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   CODE FILE          ──► IU                ──► CANON IDs    ──► SPEC        │
│   ─────────          ──► ───               ──► ─────────    ──► ─────       │
│                                                                             │
│   dashboard-page.ts  ──► ec4737a7671a...   ──► a3f7c8d9...  ──► web-dash    │
│                        │                   │   b4e8d9f0...  ──► web-dash    │
│                        │                   │   c5f9e0a1...  ──► web-dash    │
│                        │                   │   ... (34 total)                  │
│                        │                   │                                 │
│                        │                   └── hashes linked to clauses      │
│                        │                                                     │
│                        └── stored in _phoenix export in generated code      │
│                                                                             │
│   Query: Given a code file, we can trace:                                   │
│     1. Extract iu_id from _phoenix export                                   │
│     2. Look up IU in ius.json                                               │
│     3. Get source_canon_ids from IU                                         │
│     4. Look up each canon_id in canonical.json                              │
│     5. Get source_file for each canonical node                              │
│     6. Result: "dashboard-page.ts came from web-dashboard.md clause 12"     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTENT ADDRESSES (SHA-256 Hashes)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Entity          │  Content Address (truncated)                             │
│   ────────────────┼────────────────────────────────────────                  │
│   Dashboard IU    │  ec4737a7671a24d2c859604470556a65e34e7a7...              │
│   Analytics IU    │  59d32939d50083b6ecf70e500f215a179f42a5ea...              │
│   TaskList IU     │  a6550cdc3ef254c13571c1134a3f1ad230c942e0...              │
│   Metrics IU      │  91cdb7e04a917c132c5de2e90731694b755d911d...              │
│                                                                             │
│   Code file hash  │  a1b2c3d4e5f6789012345678abcdef9012345678... (dashboard)│
│   Code file hash  │  e5f6789012345678abcdef9012345678901234567... (analytics)│
│                                                                             │
│   Note: Changing any requirement changes its canon_id, which changes the    │
│         IU's iu_id (derived from canon_ids), which invalidates the IU       │
│         for regeneration.                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│ PROVENANCE GRAPH STATISTICS                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Layer          │  Count                                                   │
│   ───────────────┼─────────                                                │
│   Spec Files     │  9 files (tasks.md, analytics.md, web-dashboard-*.md)    │
│   Clauses        │  47 clauses extracted                                     │
│   Canonical      │  47 canonical nodes (content-addressed)                  │
│   IUs            │  4 Implementation Units                                   │
│   Generated      │  32 TypeScript files                                      │
│   Tests          │  2 test files                                             │
│   Edges          │  47 (canonical→IU) + 32 (IU→code) = 79 total             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


## Key Insight: This is a CAUSAL GRAPH

Not a version history (time-based), but a **transformation graph** (content-based):

```
Input Content ──[Transform]──► Output Content
     │                              │
  SHA-256                        SHA-256
 (stable ID)                   (stable ID)
     │                              │
     └──────── Provenance ──────────┘
```

Each edge represents a **lossless transformation** with traceability.
