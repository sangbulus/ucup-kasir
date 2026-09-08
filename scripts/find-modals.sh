#!/bin/bash

# Script untuk mencari file Vue yang memiliki modal/sheet/dialog
# dan belum terintegrasi dengan Navigation Stack

echo "🔍 Mencari file yang memiliki modal/sheet/dialog..."
echo ""

# File yang sudah terintegrasi
INTEGRATED=(
  "src/views/Finance/FinanceDashboard.vue"
  "src/views/Finance/BalanceSheet.vue"
)

# Cari semua file yang punya modal/sheet/dialog
FILES=$(find src/views -type f -name "*.vue" | xargs grep -l "v-if.*show.*Modal\|v-if.*show.*Sheet\|v-if.*show.*Dialog" | sort)

echo "📋 File yang memiliki modal/sheet/dialog:"
echo ""

NEEDS_INTEGRATION=()
ALREADY_INTEGRATED=()

for file in $FILES; do
  is_integrated=false
  for integrated in "${INTEGRATED[@]}"; do
    if [ "$file" = "$integrated" ]; then
      is_integrated=true
      ALREADY_INTEGRATED+=("$file")
      break
    fi
  done

  if [ "$is_integrated" = false ]; then
    NEEDS_INTEGRATION+=("$file")
  fi
done

echo "✅ Sudah terintegrasi (${#ALREADY_INTEGRATED[@]} file):"
for file in "${ALREADY_INTEGRATED[@]}"; do
  echo "  - $file"
done

echo ""
echo "⏳ Perlu diintegrasikan (${#NEEDS_INTEGRATION[@]} file):"
for file in "${NEEDS_INTEGRATION[@]}"; do
  echo "  - $file"
done

echo ""
echo "📊 Total: ${#FILES[@]} file dengan modal/sheet/dialog"
echo "    ${#ALREADY_INTEGRATED[@]} sudah terintegrasi"
echo "    ${#NEEDS_INTEGRATION[@]} perlu diintegrasikan"
