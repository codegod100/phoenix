#!/bin/bash
#
# Phoenix Purge - Determinism Testing Script
# Tests if Phoenix regen step generates identical code on re-runs
# Only purges generated CODE - preserves canonicals and IUs
#

set -e

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=".phoenix/purge-backup/$TIMESTAMP"
REPORT_FILE=".phoenix/purge-backup/$TIMESTAMP/report.txt"

echo "🧪 PHOENIX PURGE - Regen Determinism Test"
echo "=========================================="
echo ""

# Verify prerequisites
echo "Phase 0: Verify Prerequisites"
echo "-----------------------------"

MISSING_PREREQ=0

if [ ! -f ".phoenix/canonical.md" ]; then
    echo "❌ Missing .phoenix/canonical.md (run canonicalize first)"
    MISSING_PREREQ=1
fi

if [ ! -f ".phoenix/plan.md" ]; then
    echo "❌ Missing .phoenix/plan.md (run plan first)"
    MISSING_PREREQ=1
fi

if [ ! -d "src/generated" ] || [ -z "$(ls -A src/generated 2>/dev/null)" ]; then
    echo "⚠️  No generated code found in src/generated/"
    echo "   Nothing to purge - run regen first"
    exit 0
fi

if [ "$MISSING_PREREQ" -eq 1 ]; then
    echo ""
    echo "⚠️  Cannot purge - missing canonicals or IUs"
    echo "Run full Phoenix pipeline first:"
    echo "  spec → ingest → canonicalize → plan → regen"
    exit 1
fi

echo "✓ Canonicals present (.phoenix/canonical.md)"
echo "✓ IUs present (.phoenix/plan.md)"
echo "✓ Generated code found"
echo ""

# Phase 1: Backup
echo "Phase 1: Backup"
echo "---------------"
mkdir -p "$BACKUP_DIR"

if [ -d "src/generated" ]; then
    cp -r src/generated "$BACKUP_DIR/src-generated"
    echo "✓ Backed up src/generated/"
fi

# Note: canonical.md and plan.md are NOT backed up - they are source of truth
# We only back up generated code that will be regenerated
echo "✓ Note: canonical.md and plan.md preserved (not backed up - source of truth)"

echo "✓ Backup stored in $BACKUP_DIR"
echo ""

# Phase 2: Purge (Code Only)
echo "Phase 2: Purge Code Only"
echo "------------------------"
echo "⚠️  ONLY deleting src/generated/*"
echo "✓ PRESERVING .phoenix/canonical.md (source of truth)"
echo "✓ PRESERVING .phoenix/plan.md (source of truth)"
echo ""

FILE_COUNT=0
if [ -d "src/generated" ]; then
    FILE_COUNT=$(find src/generated -type f -name "*.ts" 2>/dev/null | wc -l)
    rm -rf src/generated/*
fi

# DO NOT DELETE canonical.md or plan.md - they are the source of truth!
# rm -f .phoenix/canonical.md .phoenix/plan.md .phoenix/generated_manifest.md

echo "✓ Deleted $FILE_COUNT generated code files"
echo "✓ Canonicals and IUs preserved (source of truth)"
echo ""

# Phase 3: Report regeneration ready
echo "Phase 3: Ready to Regenerate from IUs"
echo "--------------------------------------"

SPEC_COUNT=$(find spec -name "*.md" 2>/dev/null | wc -l)
echo "📄 Spec files: $SPEC_COUNT"

IU_COUNT=$(grep -c "^## IU-" .phoenix/plan.md 2>/dev/null || echo "0")
echo "📝 Implementation Units: $IU_COUNT"

if [ -d "$BACKUP_DIR/src-generated" ]; then
    BACKUP_FILES=$(find "$BACKUP_DIR/src-generated" -type f -name "*.ts" | wc -l)
    BACKUP_LINES=$(find "$BACKUP_DIR/src-generated" -type f -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    echo "📊 Original code: $BACKUP_FILES files, ~$BACKUP_LINES lines"
fi

echo ""
echo "⚠️  MANUAL REGENERATION REQUIRED"
echo "--------------------------------"
echo "To complete the purge test, run:"
echo ""
echo "  Run regen using .phoenix/plan.md IUs → src/generated/*"
echo ""
echo "  (Skip ingest/canonicalize/plan - go straight to code generation)"
echo ""
echo "Then run: .pi/skills/phoenix-purge/compare.sh $BACKUP_DIR"
echo ""
echo "📋 Summary:"
echo "  • Generated code: PURGED (ready for regen)"
echo "  • Canonicals (.phoenix/canonical.md): PRESERVED"
echo "  • IUs (.phoenix/plan.md): PRESERVED"
echo "  • Backup: $BACKUP_DIR"
echo ""
