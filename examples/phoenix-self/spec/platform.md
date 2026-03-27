# Platform: Core Graphs, Bot Integration & Brownfield Wrapping

The platform layer provides the foundational graph data model, bot command interface, and progressive integration strategy for existing codebases.

## Core Graph Model

- Phoenix must maintain five interconnected graphs: Spec Graph (clauses), Canonical Graph (requirements, constraints, invariants, definitions), Implementation Graph (IUs), Evidence Graph (tests, analysis, reviews), and Provenance Graph (all transformation edges and meta-events)
- Everything in Phoenix must be content-addressed and versioned
- Every transformation between graphs must emit provenance edges
- Selective invalidation is the defining capability: changing one spec line must invalidate only the dependent subtree, not the entire repository
- The Provenance Graph must never lose edges: all transformations are append-only

## Bot Integration

- Bots must behave as normal users with no elevated privileges
- Mutating commands must follow the confirmation model: the bot echoes parsed intent, the user replies with ok or phx confirm
- Read-only commands must execute immediately without confirmation
- Each bot must expose help, commands, and version subcommands
- Phoenix must not use fuzzy NLU for command parsing in v1; commands must be explicit and deterministic
- Three core bots must be supported: SpecBot (ingest), ImplBot (regen), and PolicyBot (status)

## Brownfield Progressive Wrapping

- Step 1 (Wrap Module): the system must support defining an IU boundary around an existing module, writing a minimal spec, and enforcing boundary and evidence policies without full regeneration
- Step 2 (Annotate Provenance): the system must support manually mapping functions to requirement IDs and gradually increasing the regeneration surface
- Brownfield wrapping must never require full codebase regeneration to start providing value
- The system must track which IUs are fully regenerated vs boundary-only wrapped
