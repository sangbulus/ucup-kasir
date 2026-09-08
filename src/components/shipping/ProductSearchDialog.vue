<template>
  <teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Pilih Produk</h3>
          <button @click="close" class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="p-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama atau kode produk..."
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <!-- List -->
        <div class="max-h-96 overflow-y-auto custom-scrollbar px-4 pb-4">
          <div v-if="filteredProducts.length === 0" class="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">Tidak ada produk ditemukan</p>
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="prod in filteredProducts"
              :key="prod.id"
              @click="selectProduct(prod)"
              :disabled="!prod.stock || prod.stock <= 0"
              :class="[
                'w-full rounded-xl border p-3 text-left transition-colors',
                (!prod.stock || prod.stock <= 0)
                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-50 dark:border-gray-700 dark:bg-gray-800'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
              ]"
            >
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ prod.name }}</span>
                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">{{ formatMoney(prod.price_sell || 0) }}</span>
              </div>
              <div class="text-[11px] text-gray-600 dark:text-gray-400">
                {{ prod.code || '-' }}
              </div>
              <div :class="[
                'mt-1 text-[10px]',
                (!prod.stock || prod.stock <= 0) ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-500'
              ]">
                Stok: {{ prod.stock || 0 }} {{ prod.unit || 'pcs' }}
                <span v-if="!prod.stock || prod.stock <= 0" class="ml-1">(Tidak tersedia)</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 p-4 dark:border-gray-800">
          <button @click="close" class="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Batal
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Product } from '@/types/database'

interface Props {
  modelValue: boolean
  products: Product[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', product: Product): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const searchQuery = ref('')

const filteredProducts = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return props.products
  return props.products.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.code || '').toLowerCase().includes(q)
  )
})

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

const selectProduct = (product: Product) => {
  emit('select', product)
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>
