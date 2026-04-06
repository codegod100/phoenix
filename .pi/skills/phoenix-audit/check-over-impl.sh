#!/bin/bash
# Phoenix Over-Implementation Detector
# Checks if files implement more than their IU requires

echo "🔍 Phoenix Over-Implementation Detection"
echo "=========================================="
echo ""

# File to check
FILE=${1:-"src/generated/app/items.ts"}

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

echo "📁 Analyzing: $FILE"
echo ""

# 1. LINE COUNT
echo "1. SIZE ANALYSIS"
echo "------------------"
lines=$(wc -l < "$FILE")
echo "   Total lines: $lines"

# Get file type
if [[ "$FILE" == *".client.ts" ]]; then
  expected_max=150
  type="API Client"
elif [[ "$FILE" == *".ui.ts" ]]; then
  expected_max=300
  type="UI Template"
elif [[ "$FILE" == *"api.ts" ]]; then
  expected_max=100
  type="API Router"
else
  expected_max=200
  type="Core Module"
fi

echo "   Type: $type"
echo "   Threshold: $expected_max lines"
if [ $lines -gt $expected_max ]; then
  echo "   ⚠️  OVER-SIZED: $lines > $expected_max"
else
  echo "   ✅ Size OK"
fi
echo ""

# 2. EXPORT ANALYSIS
echo "2. EXPORT COUNT"
echo "---------------"
functions=$(grep -E "^export (function|const.*=)" "$FILE" 2>/dev/null | wc -l)
classes=$(grep -E "^export class" "$FILE" 2>/dev/null | wc -l)
interfaces=$(grep -E "^export interface" "$FILE" 2>/dev/null | wc -l)
types=$(grep -E "^export type" "$FILE" 2>/dev/null | wc -l)
total_exports=$((functions + classes + interfaces + types))

echo "   Functions/Consts: $functions"
echo "   Classes: $classes"
echo "   Interfaces: $interfaces"
echo "   Types: $types"
echo "   Total exports: $total_exports"

if [ $total_exports -gt 5 ]; then
  echo "   ⚠️  TOO MANY EXPORTS: $total_exports (threshold: 5)"
  echo "   Consider splitting into multiple IUs"
fi
echo ""

# 3. CONCERN MIXING
echo "3. CONCERN ANALYSIS"
echo "-------------------"
concerns=()

# Check for each concern type
if grep -q "new Hono()\|router\.\(get\|post\|patch\|delete\)" "$FILE" 2>/dev/null; then
  concerns+=("HTTP Routes")
fi

if grep -q "db\.prepare\|db\.exec\|SELECT\|INSERT\|UPDATE\|DELETE" "$FILE" 2>/dev/null; then
  concerns+=("Database")
fi

if grep -q "fetch\|axios\|request" "$FILE" 2>/dev/null; then
  concerns+=("API Client")
fi

if grep -q "html\|HTML\|<div\|<script\|innerHTML\|<style" "$FILE" 2>/dev/null; then
  concerns+=("UI/HTML")
fi

if grep -q "z\.object\|zValidator" "$FILE" 2>/dev/null; then
  concerns+=("Validation")
fi

if grep -q "function.*validate\|function.*calculate\|function.*check" "$FILE" 2>/dev/null; then
  concerns+=("Business Logic")
fi

echo "   Detected concerns: ${#concerns[@]}"
for concern in "${concerns[@]}"; do
  echo "   - $concern"
done

if [ ${#concerns[@]} -gt 2 ]; then
  echo ""
  echo "   ⚠️  MIXED CONCERNS: ${#concerns[@]} types (threshold: 2)"
  echo "   This file may be implementing multiple IUs"
fi
echo ""

# 4. IMPORT ANALYSIS (external dependencies)
echo "4. DEPENDENCY ANALYSIS"
echo "----------------------"
import_count=$(grep -E "^import.*from" "$FILE" 2>/dev/null | wc -l)
external_imports=$(grep -E "^import.*from '[^./]" "$FILE" 2>/dev/null | wc -l)
echo "   Total imports: $import_count"
echo "   External packages: $external_imports"

if [ $external_imports -gt 5 ]; then
  echo "   ⚠️  High external dependency: $external_imports packages"
fi
echo ""

# 5. RECOMMENDATION
echo "5. OVER-IMPL SCORE"
echo "------------------"
score=0
if [ $lines -gt $expected_max ]; then ((score+=20)); fi
if [ $total_exports -gt 5 ]; then ((score+=15)); fi
if [ ${#concerns[@]} -gt 2 ]; then ((score+=25)); fi
if [ $external_imports -gt 5 ]; then ((score+=10)); fi

echo "   Score: $score/100 (lower is better)"
if [ $score -eq 0 ]; then
  echo "   ✅ NO OVER-IMPLEMENTATION DETECTED"
elif [ $score -lt 30 ]; then
  echo "   ⚠️  MINOR: Minor scope concerns"
elif [ $score -lt 60 ]; then
  echo "   ⚠️  MODERATE: Consider splitting this IU"
else
  echo "   ❌ SEVERE: Strongly recommend splitting into multiple IUs"
fi
