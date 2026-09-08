<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] md:hidden"
        @click="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Modal Content -->
        <div
          class="absolute bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl bg-white dark:bg-gray-900"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Filter</h2>
            <button
              @click="close"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Filter Content -->
          <div class="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
            <!-- Kategori Filter -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Kategori
              </label>
              <SelectField
                v-model="filters.category"
                :options="[{ label: 'Semua Kategori', value: '' }, ...categoryOptions]"
                title="Kategori"
                placeholder="Semua Kategori"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Status Filter -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status
              </label>
              <SelectField
                v-model="filters.status"
                :options="[
                  { label: 'Semua Status', value: '' },
                  { label: 'Aktif', value: 'Aktif' },
                  { label: 'Tidak Aktif', value: 'Tidak Aktif' },
                ]"
                title="Status"
                placeholder="Semua Status"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Stok Filter -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Stok
              </label>
              <SelectField
                v-model="filters.stock"
                :options="[
                  { label: 'Semua Stok', value: '' },
                  { label: 'Stok Tinggi (>10)', value: 'high' },
                  { label: 'Stok Sedang (1-10)', value: 'medium' },
                  { label: 'Stok Habis (0)', value: 'low' },
                ]"
                title="Stok"
                placeholder="Semua Stok"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="border-t border-gray-200 px-6 py-4 space-y-3 dark:border-gray-700">
            <button
              @click="applyFilters"
              class="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Terapkan Filter
            </button>
            <button
              @click="resetFilters"
              class="w-full rounded-lg bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SelectField from '@/components/common/SelectField.vue'

interface FilterValues {
  category: string
  status: string
  stock: string
}

interface CategoryOption {
  value: string
  label: string
}

interface Props {
  isOpen: boolean
  modelValue?: FilterValues
  categoryOptions?: CategoryOption[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ category: '', status: '', stock: '' }),
  categoryOptions: () => []
})

const emit = defineEmits(['close', 'apply', 'update:modelValue'])

const filters = ref<FilterValues>({ ...props.modelValue })

watch(() => props.modelValue, (newVal) => {
  filters.value = { ...newVal }
}, { deep: true })

const applyFilters = () => {
  emit('update:modelValue', filters.value)
  emit('apply', filters.value)
  emit('close')
}

const resetFilters = () => {
  filters.value = { category: '', status: '', stock: '' }
  emit('update:modelValue', filters.value)
  emit('apply', filters.value)
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .absolute:last-child,
.modal-leave-active .absolute:last-child {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .absolute:last-child,
.modal-leave-to .absolute:last-child {
  transform: translateY(100%);
}
</style>
