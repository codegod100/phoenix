# Phoenix Provenance Graph — Nix Flake Example

**Generated**: 2026-04-08  
**Traceability**: spec/nix-flake.md → flake.nix  
**Pipeline**: ingest → canonicalize → plan → regen (nix-flake)

---

## Provenance Chain

```
spec/nix-flake.md
    │
    ├── [clause-c1123e72] "The flake shall define a standard flake.nix..."
    │       ↓ canonId()
    ├── [node-c1123e72] canonical requirement
    │       ↓ iuId()
    │
    ├── [clause-2fc52ba4] "The flake inputs shall include nixpkgs..."
    │       ↓ canonId()
    ├── [node-2fc52ba4] canonical requirement  
    │       ↓ iuId()
    │
    ├── [clause-342049e6] "The flake shall support both x86_64-linux..."
    │       ↓ canonId()
    ├── [node-342049e6] canonical requirement
    │       ↓ iuId()
    │
    ├── [clause-2a2b9057] "A devShell is a Nix shell environment..."
    │       ↓ canonId()
    ├── [node-2a2b9057] canonical requirement
    │       ↓ iuId()
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-e0da5f51: Flake Domain (LOW)          ║
        ║ source_canon_ids: [                      ║
        ║   c1123e72...,  2fc52ba4...,             ║
        ║   342049e6...,  2a2b9057...              ║
        ║ ]                                        ║
        ║ contract: {                              ║
        ║   description: "Flake structure"           ║
        ║   inputs: ["flake inputs", "outputs"]    ║
        ║ }                                        ║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
              flake.nix (GENERATED)


spec/nix-flake.md (continued)
    │
    ├── [clause-bb7163e6] "The devShell shall provide Node.js 20..."
    │       ↓ canonId()
    ├── [node-bb7163e6] canonical requirement
    │
    ├── [clause-92b1e5e6] "The devShell shall include git..."
    │       ↓ canonId()
    ├── [node-92b1e5e6] canonical requirement
    │
    ├── [clause-33b03234] "The devShell shall provide a welcome message..."
    │       ↓ canonId()
    ├── [node-33b03234] canonical requirement
    │
    ├── [clause-ce6ed488] "The devShell shall set PHOENIX_EXAMPLE..."
    │       ↓ canonId()
    ├── [node-ce6ed488] canonical requirement
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-7b004332: Development Domain (MEDIUM) ║
        ║ source_canon_ids: [                      ║
        ║   bb7163e6..., 92b1e5e6...,               ║
        ║   33b03234..., ce6ed488...                ║
        ║ ]                                        ║
        ║ contract: {                              ║
        ║   description: "Development environment"   ║
        ║   inputs: ["Node.js 20+", "git"]          ║
        ║ }                                        ║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
         devShells.default (in flake.nix)


spec/nix-flake.md (continued)
    │
    ├── [clause-ed51bc96] "The flake shall expose a packages output..."
    │       ↓ canonId()
    ├── [node-ed51bc96] canonical requirement
    │
    ├── [clause-39063fa4] "The default package shall output 'Hello...'"
    │       ↓ canonId()
    ├── [node-39063fa4] canonical requirement
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-65b885bf: Package Domain (LOW)        ║
        ║ source_canon_ids: [ed51bc96..., 39063fa4]║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
         packages.default (in flake.nix)


spec/nix-flake.md (continued)
    │
    ├── [clause-2009136d] "The flake shall expose a formatter output..."
    │       ↓ canonId()
    ├── [node-2009136d] canonical requirement
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-ec50084a: Formatter Domain (LOW)      ║
        ║ source_canon_ids: [2009136d...]            ║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
         formatter = pkgs.nixpkgs-fmt (in flake.nix)


spec/nix-flake.md (continued)
    │
    ├── [clause-4c3b2fc2] "The flake shall define checks..."
    │       ↓ canonId()
    ├── [node-4c3b2fc2] canonical requirement
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-b14bf89e: Checks Domain (LOW)         ║
        ║ source_canon_ids: [4c3b2fc2...]            ║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
         checks.build-test (in flake.nix)


spec/nix-flake.md (continued)
    │
    ├── [clause-a7765cb4] "The flake shall provide an overlay output..."
    │       ↓ canonId()
    ├── [node-a7765cb4] canonical requirement
    │
    │   ╔══════════════════════════════════════════╗
    └──→║ IU-be607492: Overlays Domain (LOW)       ║
        ║ source_canon_ids: [a7765cb4...]            ║
        ╚══════════════════════════════════════════╝
                         ↓
            [nix-flake generator]
                         ↓
         overlay = final: prev: { } (in flake.nix)
```

---

## Identity Chain (Content-Addressed)

| Artifact | ID | Content Hash |
|----------|-----|--------------|
| spec/nix-flake.md | file | `sha256(nix-flake.md content)` |
| clause (flake structure) | `clause-c1123e72` | `sha256("The flake shall define...")` |
| canonical (flake structure) | `node-c1123e72` | `sha256("the flake shall define...")` |
| IU (Flake Domain) | `IU-e0da5f51` | `sha256(name + contract + canon_ids)` |
| flake.nix | file | `sha256(flake.nix content)` |

---

## Manifest Entry

```json
{
  "files": {
    "517684c6f05097edc7c4ef9e689240220d2158d6694d618dc1d53589029e1b81": {
      "impl": {
        "path": "/home/nandi/code/phoenix/examples/nix/flake.nix",
        "hash": "a1b2c3d4...",
        "generated_at": "2026-04-08T01:20:00Z",
        "language": "nix-flake"
      },
      "test": {
        "path": "/home/nandi/code/phoenix/examples/nix/test-flake.nix",
        "hash": "e5f6g7h8...",
        "language": "nix-flake"
      }
    }
  }
}
```

---

## Traceability Verification

```bash
# Verify spec → canonical
node .pi/skills/phoenix-ingest/ingest.js examples/nix
# → 25 clauses extracted

# Verify canonical → IUs
node .pi/skills/phoenix-plan/plan.js examples/nix
# → 8 IUs planned

# Verify IUs → flake.nix
node .pi/skills/phoenix-regen/regen.js examples/nix --lang=nix-flake
# → flake.nix generated

# Verify no drift
node .pi/skills/phoenix-drift/drift.js examples/nix
# → No unlabeled manual edits detected
```

---

## Selective Invalidation

If `spec/nix-flake.md` line 15 changes:

```
node .pi/skills/phoenix-cascade/cascade.js invalidate node-c1123e72

→ Cascade Analysis:
  Changed: node-c1123e72 (flake structure requirement)
  Affected IU: IU-e0da5f51 (Flake Domain)
  Action: Regenerate flake.nix
  Unaffected: 7 other IUs (preserved)
```

---

## Boundary Policy

| IU | Allowed | Forbidden |
|-----|---------|-----------|
| Flake Domain | nixpkgs, flake-utils | External npm packages |
| Development Domain | nodejs, git, nixpkgs-fmt | Undeclared binaries |
| Package Domain | pkgs.writeShellScriptBin | External fetchers |

---

## Evidence Required

| IU | Tier | Required Evidence |
|-----|------|-------------------|
| Flake Domain | LOW | `nix flake check` passes |
| Development Domain | MEDIUM | + shellHook executes |
| Package Domain | LOW | `nix build` succeeds |
| Formatter Domain | LOW | `nix fmt` runs |
| Checks Domain | LOW | `nix flake check` passes |
| Overlays Domain | LOW | Overlay applies to nixpkgs |

---

## End-to-End Traceability

```
SPEC LINE (user intent)
    │
    ▼
CLAUSE (content-addressed: sha256(text))
    │
    ▼
CANONICAL NODE (normalized, semantically hashed)
    │
    ▼
IU (content-addressed: sha256(name+contract+canon_ids))
    │
    ▼
GENERATED ARTIFACT (flake.nix)
    │
    ▼
EVIDENCE (nix flake check)
    │
    ▼
POLICY DECISION (accept/reject)

Every step has a content hash.
Every edge is recorded in the provenance graph.
```

---

*Generated by Phoenix VCS — Causal Version Control for Intent*