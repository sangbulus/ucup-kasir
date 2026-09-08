#!/bin/bash

# Script untuk mengintegrasikan Navigation Stack ke semua komponen Vue yang memiliki modal/sheet/dialog
# Usage: ./scripts/integrate-navigation-stack.sh

echo "🔍 Mencari file Vue yang memiliki modal/sheet/dialog..."

# Cari semua file Vue yang memiliki modal/sheet/dialog
files=$(find src/views -type f -name "*.vue" | xargs grep -l "v-if.*show.*Modal\|v-if.*show.*Sheet\|v-if.*show.*Dialog" | sort)

echo "📋 File yang ditemukan:"
echo "$files"
echo ""
echo "📊 Total: $(echo "$files" | wc -l) file"
echo ""

# Buat daftar file yang sudah terintegrasi
integrated_files=(
  "src/views/Finance/FinanceDashboard.vue"
  "src/views/Finance/BalanceSheet.vue"
)

echo "✅ File yang sudah terintegrasi:"
for file in "${integrated_files[@]}"; do
  echo "  - $file"
done
echo ""

echo "⏳ File yang perlu diintegrasikan:"
for file in $files; do
  skip=false
  for integrated in "${integrated_files[@]}"; do
    if [ "$file" = "$integrated" ]; then
      skip=true
      break
    fi
  done

  if [ "$skip" = false ]; then
    echo "  - $file"
  fi
done
echo ""

echo "💡 Untuk mengintegrasikan Navigation Stack secara otomatis, jalankan:"
echo "   claude 'integrasikan navigation stack ke semua halaman yang memiliki modal'"
