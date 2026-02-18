# Phoenix: Version Control for Intent, Not Diffs

**TL;DR:** We built a version control system that operates on *what you mean*, not *what changed in the file*. Change one line in your spec and Phoenix knows exactly which requirements are affected, which code needs regeneration, and which downstream modules need re-validation — without touching anything else.

[GitHub](https://github.com/phoenix-vcs/phoenix) | [Demo](#running-the-demo) | [Docs](docs/MANUAL.md)

---

## The Problem

Every version control system since diff was invented in 1974 operates on the same primitive: **line-level text changes**. Git is brilliant at tracking *what* changed. It has no idea *why* it matters.

When you change "bcrypt" to "argon2id" on line 10 of your auth spec, git sees one modified line. But that one line:

- Changes a **security requirement** (passwords must be hashed with argon2id)
- Affects the **auth module** (which implements that requirement)
- Invalidates the **generated code** (which uses bcrypt)
- Breaks a **boundary policy** (if argon2id isn't in the allowed packages list)
- Requires new **evidence** (unit tests, security review)
- Potentially **cascades** to every module that depends on the auth module

Git knows none of this. Your team discovers it through code review, broken builds, and production incidents.

## The Idea

What if version control understood **intent**?

Not "line 10 changed" — but "the password hashing requirement changed, which affects AuthIU, which needs new evidence, and SessionIU depends on it so re-validate that too."

Phoenix is a **causal compiler for intent**. It compiles:

```
Spec Line → Clause → Canonical Requirement → Implementation Unit → Generated Code → Evidence → Policy Decision
```

Every arrow is a traceable provenance edge. Every transformation is content-addressed and deterministic.

## How It Works (5 Minutes)

### 1. You write a Markdown spec

```markdown
## Requirements

- Users must authenticate with email and password
- Sessions expire after 24 hours
- Passwords must be hashed with bcrypt (cost factor 12)

## Security Constraints

- All endpoints must use HTTPS
- Tokens must be signed with RS256
```

### 2. Phoenix parses it into clauses

Each heading + body becomes a **clause** — the atomic unit of your spec. Clauses are normalized (lowercased, list items sorted, formatting stripped) and SHA-256 hashed. This means:

- Reordering bullet points doesn't change the hash
- Adding bold markers doesn't change the hash
- Actual semantic changes always change the hash

### 3. Phoenix extracts canonical requirements

Pattern matching identifies structured requirements:

```
REQUIREMENT: "users must authenticate with email and password"
REQUIREMENT: "passwords must be hashed with bcrypt (cost factor 12)"
CONSTRAINT:  "all endpoints must use HTTPS"
```

Nodes are linked by shared terms. "Passwords must be hashed" links to "Password reset tokens expire" through the shared term "password."

### 4. Phoenix maps requirements to code

Canonical nodes are grouped into **Implementation Units** — stable compilation boundaries with contracts, boundary policies, and evidence requirements.

```
RequirementsIU (high risk)
  → 8 canonical nodes
  → output: src/generated/requirementsiu.ts
  → evidence required: typecheck, lint, boundary, unit tests, property tests, static analysis
```

### 5. Phoenix generates code and tracks it

The regeneration engine produces code stubs (or, in production, invokes an LLM). Every generated file is content-hashed into a **manifest**.

Edit a generated file without permission? **Drift detected.** Phoenix blocks acceptance until you label the edit as a promoted requirement, a signed waiver, or a temporary patch.

### 6. Phoenix enforces boundaries

Each IU declares what it's allowed to import and what side channels (databases, APIs, env vars) it may use:

```
import axios from 'axios';        → ERROR: forbidden package
process.env.UNDECLARED_SECRET;     → WARNING: undeclared config
```

### 7. Phoenix propagates failures

When the auth module fails its type check, Phoenix doesn't just flag the auth module. It walks the dependency graph and marks every dependent module for re-validation:

```
AuthIU [FAIL: typecheck] → BLOCK
  └─ SessionIU → RE_VALIDATE
      └─ ApiIU → RE_VALIDATE
```

## The Key Insight: Selective Invalidation

Change "bcrypt" to "argon2id" on one line. Phoenix:

1. Detects the **Requirements clause** was modified
2. Identifies **4 canonical nodes** affected
3. Classifies this as a **C — Contextual Shift** (90% confidence, 9 canon nodes impacted)
4. Marks the **RequirementsIU** for regeneration
5. Checks the **boundary policy** (is argon2id in allowed_packages?)
6. Invalidates **evidence** (tests need re-running)
7. Cascades to **dependent IUs**

Everything not in that subtree? Untouched. The login endpoint clause is UNCHANGED (class A). The logout clause is UNCHANGED. Only the affected subtree is reprocessed.

This is the difference between "rebuild the world" and "rebuild what matters."

## What We Built

Phoenix is implemented in TypeScript with zero runtime dependencies beyond Node.js crypto. The codebase is ~3,000 lines of source across 30 modules, covered by 200+ tests.

### Architecture

| Phase | What it does |
|-------|-------------|
| **A** | Clause extraction + semantic hashing |
| **B** | Canonicalization + warm hashing + A/B/C/D classifier |
| **C1** | IU planning + code generation + manifest + drift detection |
| **C2** | Boundary validation (architectural linter) |
| **D** | Evidence + policy engine + cascading failures |
| **E** | Shadow pipeline upgrades + storage compaction |
| **F** | Bot interface (SpecBot, ImplBot, PolicyBot) |

### The Trust Dashboard

Everything feeds into `phoenix status`:

```
phoenix status  STEADY_STATE  |  spec/auth.md v1 → v2

Classification Summary   A:3  B:1  C:4  D:0  │  D-Rate: 0.0% TARGET

Canonical Graph  8 → 10 nodes  │  +6 new  -4 removed  4 kept

Implementation Units  1 IU  │  1 generated files

Drift  1 DRIFTED  │  0 clean  1 drifted

Boundary  2 errors  2 warnings

Actions Required:
  ERROR   drift     requirementsiu.ts   Drifted → label or reconcile
  ERROR   boundary  axios               Forbidden package → remove import
  WARN    boundary  STRIPE_API_KEY      Undeclared config → declare or remove
```

If this dashboard is trusted, Phoenix becomes the coordination substrate for your entire development process.

If it's noisy or wrong, the system dies.

**Trust > Cleverness.**

## Running the Demo

```bash
git clone https://github.com/phoenix-vcs/phoenix
cd phoenix
npm install
npx tsx demo.ts
```

The demo is a 23-step walkthrough that shows every file, every data structure, and every transformation. You'll see:

- Your spec file color-coded by clause
- Raw vs normalized text with proof that formatting doesn't affect hashes
- Full JSON clause objects with content-addressed IDs
- Canonical requirement extraction with provenance chains
- Cold vs warm hash comparison
- Bootstrap state machine transitions
- Side-by-side spec v1 → v2 with clause-level diffs
- A/B/C/D classification with signal breakdowns
- Generated TypeScript code with manifest entries
- Drift detection catching a simulated manual edit
- Boundary validation catching forbidden imports and undeclared side channels
- Evidence evaluation lifecycle (INCOMPLETE → PASS → FAIL)
- Cascading failures through a dependency graph
- Shadow pipeline upgrade classification
- Storage compaction preserving critical data
- Bot command parsing with confirmation model

## What's Next

Phoenix is alpha. The canonicalization engine uses rule-based pattern matching. In production, this would be a versioned LLM pipeline — which is why the shadow pipeline upgrade mechanism exists from day one.

The code generator produces stubs. In production, this would invoke an LLM with structured promptpacks, using the IU contract, canonical requirements, and boundary policy as context.

We're looking for:
- **Early adopters** willing to try Phoenix on greenfield TypeScript projects
- **Contributors** interested in the canonicalization pipeline, boundary validation, and evidence engine
- **Feedback** on the trust model — does `phoenix status` give you the confidence to rely on it?

## FAQ

**Q: Is this "AI that writes code"?**
No. Phoenix is a *causal compiler for intent*. The code generation is one step in a pipeline that starts with structured specs and ends with provenance-tracked, boundary-validated, evidence-certified modules. The AI is a tool; the system is the value.

**Q: Does it work with existing codebases?**
v1 is greenfield-first. Brownfield progressive wrapping is designed (wrap existing module → define boundary → write minimal spec → enforce without full regen) but not the primary path.

**Q: How is this different from Copilot/Cursor/etc?**
Those tools help you write code faster. Phoenix ensures the code you write (or generate) is **traceable to requirements, boundary-validated, evidence-certified, and selectively invalidated when specs change.** They're complementary — you could use Copilot inside Phoenix's regeneration engine.

**Q: What if the classifier is wrong?**
That's what the D-rate is for. If uncertain classifications exceed 15%, Phoenix raises an alarm, increases override friction, and surfaces the issue in status. The system is designed to degrade gracefully, not silently.

**Q: Why TypeScript?**
It's the reference implementation. The architecture is language-agnostic — the spec graph, canonical graph, and provenance graph don't care what language the generated code is in.

---

*Phoenix VCS — Regenerative Version Control*
*[GitHub](https://github.com/phoenix-vcs/phoenix) | [Manual](docs/MANUAL.md) | [Demo: `npx tsx demo.ts`]*
