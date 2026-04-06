---
name: code-quality
description: Analyze code quality, identify anti-patterns, and suggest refactoring opportunities. Use when reviewing code or before submitting PRs.
---

# Code Quality Review Skill

## Overview

Analyze code for quality issues, anti-patterns, and improvement opportunities.

## Steps

1. Identify files to review (ask user or look at recent changes)
2. Check for common issues:
   - Code duplication
   - Long functions/methods
   - Missing error handling
   - Hardcoded values
   - Commented-out code
   - TODO/FIXME markers

3. Look for TypeScript/JavaScript specific issues:
   - Any types
   - Non-null assertions
   - Missing return types
   - Unused imports/variables

4. Provide specific recommendations with examples

## Output Format

For each issue found:
- **Location**: File and line number
- **Issue**: Brief description
- **Severity**: 🔴 High / 🟡 Medium / 🟢 Low
- **Suggestion**: Concrete fix with code example

## Summary Format

```
Code Quality Report
==================
Files analyzed: N
Issues found: N (🔴 H / 🟡 M / 🟢 L)

Top priorities:
1. ...
2. ...
3. ...
```
