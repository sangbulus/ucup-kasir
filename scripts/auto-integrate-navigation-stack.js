#!/usr/bin/env node

/**
 * Script untuk mengintegrasikan Navigation Stack ke komponen Vue secara otomatis
 *
 * Mendeteksi modal/sheet/dialog dan menambahkan:
 * 1. Import useNavigationStack
 * 2. Destructure register/unregister methods
 * 3. Watch untuk auto register/unregister
 *
 * Usage: node scripts/auto-integrate-navigation-stack.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// File yang sudah terintegrasi (skip)
const INTEGRATED_FILES = [
  'src/views/Finance/FinanceDashboard.vue',
  'src/views/Finance/BalanceSheet.vue',
];

// Cari file Vue yang punya modal/sheet/dialog
function findFilesWithModals() {
  try {
    const output = execSync(
      `find src/views -type f -name "*.vue" | xargs grep -l "v-if.*show.*Modal\\|v-if.*show.*Sheet\\|v-if.*show.*Dialog"`,
      { encoding: 'utf8' }
    );

    return output
      .trim()
      .split('\n')
      .filter(file => !INTEGRATED_FILES.includes(file));
  } catch (error) {
    return [];
  }
}

// Deteksi nama variable modal/sheet/dialog
function detectModalVariables(content) {
  const regex = /v-if=["']([a-zA-Z_$][a-zA-Z0-9_$]*(?:Modal|Sheet|Dialog))["']/g;
  const matches = [...content.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

// Generate watch code
function generateWatchCode(varName, type = 'modal') {
  const methodMap = {
    modal: ['registerModal', 'unregisterModal'],
    sheet: ['registerSheet', 'unregisterSheet'],
    dialog: ['registerDialog', 'unregisterDialog'],
  };

  const detectType = varName.toLowerCase().includes('sheet') ? 'sheet'
    : varName.toLowerCase().includes('dialog') ? 'dialog'
    : 'modal';

  const [registerMethod, unregisterMethod] = methodMap[detectType];
  const id = varName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

  return `
// Register/unregister ${varName} di navigation stack
watch(${varName}, (isOpen) => {
  if (isOpen) {
    ${registerMethod}('${id}', () => {
      ${varName}.value = false
    })
  } else {
    ${unregisterMethod}('${id}')
  }
})`;
}

// Cek apakah sudah ada import useNavigationStack
function hasNavigationStackImport(content) {
  return content.includes('useNavigationStack');
}

// Cek apakah sudah ada import watch
function hasWatchImport(content) {
  const vueImportRegex = /import\s+{([^}]+)}\s+from\s+['"]vue['"]/;
  const match = content.match(vueImportRegex);
  return match && match[1].includes('watch');
}

console.log('🔍 Mencari file yang memiliki modal/sheet/dialog...\n');

const files = findFilesWithModals();

if (files.length === 0) {
  console.log('✅ Semua file sudah terintegrasi dengan Navigation Stack!');
  process.exit(0);
}

console.log(`📋 Ditemukan ${files.length} file yang perlu diintegrasikan:\n`);
files.forEach((file, i) => {
  console.log(`${i + 1}. ${file}`);
});

console.log('\n' + '='.repeat(60));
console.log('💡 REKOMENDASI: Integrasikan secara manual atau dengan Claude');
console.log('='.repeat(60));
console.log('\nUntuk integrasi otomatis, jalankan perintah:');
console.log('  claude "integrasikan navigation stack ke semua modal di:');
files.slice(0, 5).forEach(f => console.log(`    - ${f}`));
if (files.length > 5) {
  console.log(`    ... dan ${files.length - 5} file lainnya"`);
}

console.log('\n📖 Dokumentasi lengkap: docs/NAVIGATION_STACK.md\n');

// Export untuk digunakan di script lain
module.exports = {
  findFilesWithModals,
  detectModalVariables,
  generateWatchCode,
  hasNavigationStackImport,
  hasWatchImport,
};
