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
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Filter Transaksi</h2>
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
          <div class="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-4">
            <!-- Periode -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Periode</label>
              <DateRangeField
                v-model:start="filters.dateFrom"
                v-model:end="filters.dateTo"
                title="Periode Transaksi"
                placeholder="Semua tanggal"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Status Transaksi -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status Transaksi
              </label>
              <SelectField
                v-model="filters.transactionStatus"
                :options="[
                  { label: 'Semua Status', value: 'semua' },
                  { label: 'Disiapkan', value: 'disiapkan' },
                  { label: 'Dikirim', value: 'dikirim' },
                  { label: 'Selesai', value: 'selesai' },
                ]"
                title="Status Transaksi"
                placeholder="Semua Status"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Status Pembayaran -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status Pembayaran
              </label>
              <SelectField
                v-model="filters.paymentStatus"
                :options="[
                  { label: 'Semua', value: 'semua' },
                  { label: 'Lunas', value: 'lunas' },
                  { label: 'Belum Lunas', value: 'belum_lunas' },
                ]"
                title="Status Pembayaran"
                placeholder="Semua"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Metode Pembayaran -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Metode Pembayaran
              </label>
              <SelectField
                v-model="filters.paymentMethod"
                :options="[
                  { label: 'Semua Metode', value: '' },
                  { label: 'Tunai', value: 'tunai' },
                  { label: 'Transfer', value: 'transfer' },
                  { label: 'QRIS', value: 'qris' },
                  { label: 'Tempo', value: 'tempo' },
                ]"
                title="Metode Pembayaran"
                placeholder="Semua Metode"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Status Catatan -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status Catatan
              </label>
              <SelectField
                v-model="filters.recordStatus"
                :options="[
                  { label: 'Semua (termasuk batal)', value: 'semua' },
                  { label: 'Aktif saja', value: 'aktif' },
                  { label: 'Yang dibatalkan', value: 'batal' },
                ]"
                title="Status Catatan"
                placeholder="Semua"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Customer -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Customer</label>
              <SelectField
                v-model="filters.customer"
                :options="[{ label: 'Semua Customer', value: '' }, { label: 'Tanpa customer', value: '__tanpa__' }, ...customerOptions]"
                title="Customer"
                placeholder="Semua Customer"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Nominal -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nominal (Total)</label>
              <div class="grid grid-cols-2 gap-2">
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-gray-400">Rp</span>
                  <input
                    v-model="filters.minAmount"
                    type="text"
                    inputmode="numeric"
                    placeholder="Min"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    @input="filters.minAmount = digitsOnly($event)"
                  />
                </div>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-gray-400">Rp</span>
                  <input
                    v-model="filters.maxAmount"
                    type="text"
                    inputmode="numeric"
                    placeholder="Max"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    @input="filters.maxAmount = digitsOnly($event)"
                  />
                </div>
              </div>
            </div>

            <!-- Urutan -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Urutkan</label>
              <SelectField
                v-model="filters.sortOrder"
                :options="[
                  { label: 'Terbaru', value: 'newest' },
                  { label: 'Terlama', value: 'oldest' },
                  { label: 'Nominal Terbesar', value: 'highest' },
                  { label: 'Nominal Terkecil', value: 'lowest' },
                ]"
                title="Urutkan"
                placeholder="Terbaru"
                button-class="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
import DateRangeField from '@/components/common/DateRangeField.vue'

interface TransactionFilterValues {
  transactionStatus: string
  paymentStatus: string
  paymentMethod: string
  recordStatus: string
  customer: string
  dateFrom: string
  dateTo: string
  minAmount: string
  maxAmount: string
  sortOrder: string
}

interface CustomerOption {
  value: string
  label: string
}

interface Props {
  isOpen: boolean
  modelValue: TransactionFilterValues
  customerOptions?: CustomerOption[]
}

const props = withDefaults(defineProps<Props>(), {
  customerOptions: () => []
})

const emit = defineEmits(['close', 'apply'])

const emptyValues = (): TransactionFilterValues => ({
  transactionStatus: 'semua',
  paymentStatus: 'semua',
  paymentMethod: '',
  recordStatus: 'semua',
  customer: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  sortOrder: 'newest',
})

const filters = ref<TransactionFilterValues>({ ...emptyValues(), ...props.modelValue })

watch(
  () => props.modelValue,
  (newVal) => {
    filters.value = { ...emptyValues(), ...newVal }
  },
  { deep: true }
)

const digitsOnly = (event: Event) => {
  return (event.target as HTMLInputElement).value.replace(/\D/g, '')
}

const applyFilters = () => {
  emit('apply', { ...filters.value })
  emit('close')
}

const resetFilters = () => {
  filters.value = emptyValues()
  emit('apply', { ...filters.value })
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
