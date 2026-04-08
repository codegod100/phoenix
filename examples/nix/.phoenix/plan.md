# Implementation Units

Planned from canonical requirements. Each IU groups related requirements by feature area.

---

## IU-517684c6: Requirements Domain (LOW)

**Description:** Implements requirements functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 03ef4d2524aa...
- 09daab1c07a9...
- 1f540d2c172a...
- 8330b04e652d...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: must not exceed limitation

**Output Files:**
- `src/generated/requirements/index.ts`
- `src/generated/requirements/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-c40ae8a5: Definitions Domain (LOW)

**Description:** Implements definitions functionality with 1 requirements

**Risk Tier:** low (1 requirements)

**Canonical Requirements:**
- 6ab64ae1c2a1...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/definitions/index.ts`
- `src/generated/definitions/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-e0da5f51: Flake Domain (LOW)

**Description:** Implements flake functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 2a2b90577d3b...
- 2fc52ba455b2...
- 342049e6c4cb...
- c1123e72b6db...

**Contract:**
- Inputs: the flake shall define a standard flakenix with inputs and outputs sections, the flake inputs shall include nixpkgs as a dependency
- Outputs: the flake shall define a standard flakenix with inputs and outputs sections
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/flake/index.ts`
- `src/generated/flake/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-7b004332: Development Domain (MEDIUM)

**Description:** Implements development functionality with 5 requirements

**Risk Tier:** medium (5 requirements)

**Canonical Requirements:**
- 33b032348e11...
- 33de83aa20aa...
- 92b1e5e63f30...
- bb7163e6f87f...
- ce6ed488aec0...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: Processed results, Side effects
- Invariants: the devshell must not install global npm packages

**Output Files:**
- `src/generated/development/index.ts`
- `src/generated/development/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation
- unit_tests

---

## IU-65b885bf: Package Domain (LOW)

**Description:** Implements package functionality with 4 requirements

**Risk Tier:** low (4 requirements)

**Canonical Requirements:**
- 124c208c8767...
- 39063fa4d32f...
- ddbd5e96d10a...
- ed51bc960373...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the flake shall expose a packages output with a default package, the default package shall be a shell script that outputs hello from phoenix nix flake
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/package/index.ts`
- `src/generated/package/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-ec50084a: Formatter Domain (LOW)

**Description:** Implements formatter functionality with 2 requirements

**Risk Tier:** low (2 requirements)

**Canonical Requirements:**
- 2009136d096b...
- 683f970ec9c8...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the flake shall expose a formatter output using nixpkgsfmt
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/formatter/index.ts`
- `src/generated/formatter/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-b14bf89e: Checks Domain (LOW)

**Description:** Implements checks functionality with 3 requirements

**Risk Tier:** low (3 requirements)

**Canonical Requirements:**
- 277e10458992...
- 4c3b2fc2e64b...
- b3060bef1d70...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the checks shall run the package and verify output contains hello
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/checks/index.ts`
- `src/generated/checks/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## IU-be607492: Overlays Domain (LOW)

**Description:** Implements overlays functionality with 2 requirements

**Risk Tier:** low (2 requirements)

**Canonical Requirements:**
- a7765cb4293f...
- ac69ec293d6e...

**Contract:**
- Inputs: Configuration, Data inputs
- Outputs: the flake shall provide an overlay output for extending nixpkgs
- Invariants: Valid state transitions only, Type safety maintained

**Output Files:**
- `src/generated/overlays/index.ts`
- `src/generated/overlays/__tests__/index.test.ts`

**Evidence Required:**
- typecheck
- lint
- boundary_validation

---

## Coverage Summary

- Total canonical nodes: 25
- Covered: 25
- Orphans: 0
