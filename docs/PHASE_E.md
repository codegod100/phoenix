# Phase E — Shadow Pipeline & Compaction

## Overview

Phase E enables safe canonicalization pipeline upgrades and storage compaction.

## Components

### 1. Shadow Pipeline (`src/shadow-pipeline.ts`)

Runs old and new canonicalization pipelines in parallel, compares output,
and classifies the upgrade as SAFE / COMPACTION_EVENT / REJECT.

### 2. Compaction Engine (`src/compaction.ts`)

Moves cold data to archives while preserving:
- Node headers, provenance edges, approvals, signatures

Storage tiers: Hot Graph → Ancestry Index → Cold Packs
