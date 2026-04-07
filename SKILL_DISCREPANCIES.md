# Phoenix Skills Discrepancy Analysis

## Summary

**Status: ALL CRITICAL ISSUES FIXED ✅**

Analyzed 20 Phoenix VCS skills across SKILL.md documentation and their implementations. Found and fixed several discrepancies between documentation and actual code.

---

## Fixed Issues

### 1. **phoenix-audit CLI** ✅ FIXED

**Issue:** phoenix/SKILL.md showed `[project-root]` but audit.js requires `<file-path>`

**Fix:** Updated both the command map table and quick reference in phoenix/SKILL.md to show `<file-path>`

---

### 2. **phoenix-constraint-review CLI** ✅ FIXED

**Issue:** Documented `[spec-file.md]` but takes `[project-root]`

**Fix:** Updated both phoenix-constraint-review/SKILL.md and phoenix/SKILL.md to show `[project-root]`

---

### 3. **phoenix-evidence CLI** ✅ FIXED

**Issue:** Documented `<iu-id> [--tier=high]` but takes `[project-root] [iu-id]`

**Fix:** Updated phoenix-evidence/SKILL.md to show correct CLI syntax

---

### 4. **phoenix-spec CLI** ✅ FIXED

**Issue:** Documented `[spec-file.md]` but takes directory path

**Fix:** Changed to `[spec-directory]` in both phoenix-spec/SKILL.md and phoenix/SKILL.md

---

### 5. **phoenix-regen evidence functions** ✅ FIXED

**Issue:** Documented evidence functions (`runTypecheck`, `runLint`, etc.) that don't exist in regen.js

**Fix:** Removed incorrect function references and added note that evidence is handled by phoenix-evidence

---

### 6. **phoenix-shadow CLI args** ✅ FIXED

**Issue:** Missing optional `[old-pipeline-id] [new-pipeline-id]` arguments

**Fix:** Updated phoenix-shadow/SKILL.md and phoenix/SKILL.md to show optional version args

---

### 7. **phoenix-drift CLI example** ✅ FIXED

**Issue:** Missing `[project-root]` in first example

**Fix:** Added explicit `[project-root]` to both examples

---

### 8. **phoenix-purge execution model** ✅ FIXED

**Issue:** "agent-skills only, execute manually" was confusing given shell scripts exist

**Fix:** Clarified that manual regen step is intentional for safety, with clear 3-step process

---

### 9. **phoenix-inspect missing from quick ref** ✅ FIXED

**Issue:** phoenix-inspect not listed in phoenix/SKILL.md quick reference section

**Fix:** Added inspect command to quick reference

---

## Original Report (Archive)

The following was the original analysis before fixes:

### Critical Discrepancies (All Fixed)
- ~~phoenix-audit: CLI mismatch~~ ✅
- ~~phoenix-constraint-review: CLI mismatch~~ ✅
- ~~phoenix-evidence: CLI mismatch~~ ✅
- ~~phoenix-spec: CLI mismatch~~ ✅
- ~~phoenix-regen: Evidence function references~~ ✅

### Minor Discrepancies (All Fixed)
- ~~phoenix-shadow: Missing optional args~~ ✅
- ~~phoenix-drift: Missing project-root~~ ✅
- ~~phoenix-purge: Unclear execution model~~ ✅
- ~~phoenix-inspect: Missing from quick ref~~ ✅

---

## Verification Commands

```bash
# Verify audit CLI
grep "phoenix-audit/audit.js" /home/nandi/code/phoenix/.pi/skills/phoenix/SKILL.md

# Verify constraint-review CLI
grep "constraint-review.js" /home/nandi/code/phoenix/.pi/skills/phoenix-constraint-review/SKILL.md

# Verify evidence CLI
grep "evidence.js" /home/nandi/code/phoenix/.pi/skills/phoenix-evidence/SKILL.md

# Verify spec CLI
grep "validate.js" /home/nandi/code/phoenix/.pi/skills/phoenix-spec/SKILL.md

# Verify shadow CLI
grep "shadow.js" /home/nandi/code/phoenix/.pi/skills/phoenix-shadow/SKILL.md

# Verify inspect in quick ref
grep -A2 "phoenix inspect" /home/nandi/code/phoenix/.pi/skills/phoenix/SKILL.md
```

---

## Files Modified

1. `/home/nandi/code/phoenix/.pi/skills/phoenix/SKILL.md` - Fixed command map and quick reference
2. `/home/nandi/code/phoenix/.pi/skills/phoenix-constraint-review/SKILL.md` - Fixed CLI args
3. `/home/nandi/code/phoenix/.pi/skills/phoenix-evidence/SKILL.md` - Fixed CLI args
4. `/home/nandi/code/phoenix/.pi/skills/phoenix-spec/SKILL.md` - Fixed CLI args
5. `/home/nandi/code/phoenix/.pi/skills/phoenix-regen/SKILL.md` - Removed incorrect evidence functions
6. `/home/nandi/code/phoenix/.pi/skills/phoenix-shadow/SKILL.md` - Added optional args + placeholder note
7. `/home/nandi/code/phoenix/.pi/skills/phoenix-drift/SKILL.md` - Added project-root to examples
8. `/home/nandi/code/phoenix/.pi/skills/phoenix-purge/SKILL.md` - Clarified execution model

---

## Result

All documentation now accurately reflects the actual CLI interfaces. No more CLI confusion for users.
