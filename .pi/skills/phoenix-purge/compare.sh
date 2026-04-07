#!/bin/bash
#
# Phoenix Purge - Diff Comparison Script
# Compares regenerated files with backup to calculate determinism score
#

set -e

BACKUP_DIR="${1:-.phoenix/purge-backup/$(ls -1 .phoenix/purge-backup/ 2>/dev/null | tail -1)}"
REPORT_FILE=".phoenix/purge-report.txt"

if [ ! -d "$BACKUP_DIR/src-generated" ]; then
    echo "❌ Error: Backup not found at $BACKUP_DIR"
    echo "Run purge.sh first"
    exit 1
fi

echo "📊 PHOENIX PURGE - Diff Analysis"
echo "================================="
echo ""
echo "Backup: $BACKUP_DIR"
echo ""

# Check if regenerated files exist
if [ ! -d "src/generated" ] || [ -z "$(ls -A src/generated 2>/dev/null)" ]; then
    echo "❌ Error: No regenerated files found in src/generated/"
    echo "Run the Phoenix pipeline first to regenerate code"
    exit 1
fi

# Build comparison table
echo "Phase 4: File Comparison"
echo "----------------------"
echo ""

printf "%-30s %10s %10s %12s\n" "File" "Original" "New" "Score"
printf "%-30s %10s %10s %12s\n" "------------------------------" "----------" "----------" "------------"

TOTAL_FILES=0
IDENTICAL=0
MINOR=0
MAJOR=0
TOTAL_SCORE=0

# Compare each file from backup
for backup_file in $(find "$BACKUP_DIR/src-generated" -type f -name "*.ts" | sort); do
    rel_path="${backup_file#$BACKUP_DIR/src-generated/}"
    new_file="src/generated/$rel_path"
    
    if [ ! -f "$new_file" ]; then
        printf "%-30s %10s %10s %12s\n" "$rel_path" "✓" "❌ MISSING" "0%"
        MAJOR=$((MAJOR + 1))
        TOTAL_FILES=$((TOTAL_FILES + 1))
        continue
    fi
    
    # Get line counts
    orig_lines=$(wc -l < "$backup_file")
    new_lines=$(wc -l < "$new_file")
    
    # Calculate diff using git diff or diff
    if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
        # Use git diff for better comparison
        diff_lines=$(git diff --no-index --numstat "$backup_file" "$new_file" 2>/dev/null | awk '{print $1 + $2}' || echo "9999")
    else
        # Use diff -u and count changed lines
        diff_lines=$(diff -u "$backup_file" "$new_file" 2>/dev/null | grep -c "^[+-]" || echo "9999")
    fi
    
    # Calculate score (normalized by max file size)
    max_lines=$(( orig_lines > new_lines ? orig_lines : new_lines ))
    if [ "$max_lines" -eq 0 ]; then
        score=100
    else
        # Simple heuristic: unchanged lines / total lines
        unchanged=$(( max_lines - diff_lines ))
        if [ "$unchanged" -lt 0 ]; then
            unchanged=0
        fi
        score=$(( 100 * unchanged / max_lines ))
    fi
    
    # Ensure score is reasonable
    if [ "$score" -lt 0 ]; then score=0; fi
    if [ "$score" -gt 100 ]; then score=100; fi
    
    TOTAL_SCORE=$((TOTAL_SCORE + score))
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    # Classification
    status="⚠️"
    if [ "$score" -eq 100 ]; then
        IDENTICAL=$((IDENTICAL + 1))
        status="✅"
    elif [ "$score" -ge 95 ]; then
        MINOR=$((MINOR + 1))
        status="✓"
    elif [ "$score" -ge 70 ]; then
        MAJOR=$((MAJOR + 1))
    else
        MAJOR=$((MAJOR + 1))
        status="❌"
    fi
    
    printf "%-30s %10d %10d %10d%% %s\n" "$rel_path" "$orig_lines" "$new_lines" "$score" "$status"
done

# Check for new files not in backup
for new_file in $(find "src/generated" -type f -name "*.ts" | sort); do
    rel_path="${new_file#src/generated/}"
    backup_file="$BACKUP_DIR/src-generated/$rel_path"
    
    if [ ! -f "$backup_file" ]; then
        new_lines=$(wc -l < "$new_file")
        printf "%-30s %10s %10d %10s %s\n" "$rel_path" "NEW" "$new_lines" "-" "🆕"
        TOTAL_FILES=$((TOTAL_FILES + 1))
    fi
done

echo ""
echo "-------------------------------------------"

# Calculate overall score
if [ "$TOTAL_FILES" -gt 0 ]; then
    OVERALL_SCORE=$(( TOTAL_SCORE / TOTAL_FILES ))
else
    OVERALL_SCORE=0
fi

echo ""
echo "📈 DETERMINISM SCORE: $OVERALL_SCORE%"
echo ""

# Classification
echo "Classification:"
if [ "$OVERALL_SCORE" -eq 100 ]; then
    echo "  🏆 PERFECT (100%) - Byte-for-byte identical"
    echo "  Status: Pipeline is fully deterministic"
elif [ "$OVERALL_SCORE" -ge 95 ]; then
    echo "  ✅ EXCELLENT (95-99%) - Minor variations only"
    echo "  Status: Highly reliable for production"
elif [ "$OVERALL_SCORE" -ge 85 ]; then
    echo "  ✓ GOOD (85-94%) - Implementation variations"
    echo "  Status: Acceptable, monitor for drift"
elif [ "$OVERALL_SCORE" -ge 70 ]; then
    echo "  ⚠️ FAIR (70-84%) - Structural differences"
    echo "  Status: Investigate before production use"
else
    echo "  ❌ POOR (<70%) - Significant divergence"
    echo "  Status: Pipeline non-deterministic - fix required"
fi

echo ""
echo "📋 Summary:"
echo "  • Total files: $TOTAL_FILES"
echo "  • Identical (100%): $IDENTICAL"
echo "  • Minor variance (95-99%): $MINOR"
echo "  • Major variance (<95%): $MAJOR"
echo ""

# Save report
cat > "$REPORT_FILE" << EOF
Phoenix Purge Report - $(date)
================================

Backup: $BACKUP_DIR
Overall Score: $OVERALL_SCORE%

Files:
$(printf "%-30s %10s %10s %12s\n" "File" "Original" "New" "Score")
$(printf "%-30s %10s %10s %12s\n" "------------------------------" "----------" "----------" "------------")

$(for backup_file in $(find "$BACKUP_DIR/src-generated" -type f -name "*.ts" | sort); do
    rel_path="${backup_file#$BACKUP_DIR/src-generated/}"
    new_file="src/generated/$rel_path"
    if [ -f "$new_file" ]; then
        orig_lines=$(wc -l < "$backup_file")
        new_lines=$(wc -l < "$new_file")
        if command -v git &> /dev/null; then
            diff_lines=$(git diff --no-index --numstat "$backup_file" "$new_file" 2>/dev/null | awk '{print $1 + $2}' || echo "9999")
        else
            diff_lines=$(diff -u "$backup_file" "$new_file" 2>/dev/null | grep -c "^[+-]" || echo "9999")
        fi
        max_lines=$(( orig_lines > new_lines ? orig_lines : new_lines ))
        unchanged=$(( max_lines - diff_lines ))
        if [ "$unchanged" -lt 0 ]; then unchanged=0; fi
        score=$(( 100 * unchanged / max_lines ))
        if [ "$score" -lt 0 ]; then score=0; fi
        if [ "$score" -gt 100 ]; then score=100; fi
        printf "%-30s %10d %10d %10d%%\n" "$rel_path" "$orig_lines" "$new_lines" "$score"
    else
        printf "%-30s %10s %10s %10s\n" "$rel_path" "✓" "MISSING" "0%"
    fi
done)

Summary:
- Identical: $IDENTICAL
- Minor: $MINOR  
- Major: $MAJOR
- Total: $TOTAL_FILES
EOF

echo "📄 Full report saved to: $REPORT_FILE"
echo ""
echo "To restore backup:"
echo "  cp -r \"$BACKUP_DIR/src-generated/*\" src/generated/"
