---
name: docs-check
description: Check documentation completeness and consistency. Use when preparing releases or when documentation seems out of sync with code.
---

# Documentation Check Skill

## Overview

Verify that documentation is complete, accurate, and consistent with the codebase.

## Steps

1. Check README.md:
   - Accurate description
   - Correct installation steps
   - Working examples
   - Up-to-date badges

2. Check API documentation:
   - Function signatures match implementation
   - Parameters documented
   - Return types specified
   - Examples are correct

3. Check for missing docs:
   - New features without docs
   - Changed behavior not documented
   - Breaking changes not noted

4. Verify links work
5. Check for consistent formatting

## Output Format

```
Documentation Review
===================
Status: ✅ Complete / ⚠️ Needs Updates / ❌ Incomplete

Issues Found:
- [ ] Issue 1 (file:line)
- [ ] Issue 2 (file:line)

Recommendations:
1. Priority 1 fix
2. Nice to have
```
