<template>
  <transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" @click.self="$emit('close')">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:rounded-2xl">
        <!-- Header -->
        <div class="border-b border-gray-200 p-4 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Buat Slip Gaji Baru</h3>
          <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            Generate slip gaji untuk 1 karyawan dengan periode tertentu
          </p>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="space-y-3">
            <!-- Pilih Karyawan -->
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Karyawan <span class="text-red-500">*</span>
              </label>
              <SelectField
                v-model="form.employeeId"
                :options="employeeOptions"
                @update:modelValue="handleEmployeeChange"
                title="Pilih Karyawan"
                placeholder="-- Pilih Karyawan --"
                searchable
                search-placeholder="Cari karyawan..."
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Periode -->
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Periode Gaji <span class="text-red-500">*</span>
              </label>
              <DateRangeField
                v-model:start="form.periodStart"
                v-model:end="form.periodEnd"
                title="Pilih Periode Gaji"
                placeholder="-- Pilih Periode --"
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <!-- Preview Perhitungan (read-only) -->
            <div v-if="form.employeeId" class="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
              <p class="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">Preview Perhitungan</p>
              
              <div class="space-y-1.5 text-[11px]">
                
                <div class="flex items-center justify-between">
                  <span class="text-gray-700 dark:text-gray-300">gaji (auto dari surat jalan):</span>
                  <span class="font-medium text-emerald-600 dark:text-emerald-400">Dihitung otomatis</span>
                </div>
                <div class="flex items-center justify-between border-t border-blue-200 pt-1.5 dark:border-blue-400/30">
                  <span class="text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span class="font-medium text-gray-900 dark:text-white">Gaji + Insentif</span>
                </div>
              </div>
            </div>

            <!-- Kasbon Karyawan -->
            <div v-if="form.employeeId && activeLoans.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p class="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-2">Kasbon Aktif</p>
              
              <div class="space-y-1.5 text-[11px]">
                <div v-for="loan in activeLoans" :key="loan.id" class="flex items-center justify-between">
                  <span class="text-gray-700 dark:text-gray-300">{{ formatDate(loan.loan_date) }}</span>
                  <span class="font-medium text-amber-700 dark:text-amber-400">Sisa: {{ formatCurrency(loan.remaining_amount) }}</span>
                </div>
                <div class="flex items-center justify-between border-t border-amber-200 pt-1.5 font-semibold dark:border-amber-400/30">
                  <span class="text-amber-900 dark:text-amber-300">Total Sisa:</span>
                  <span class="text-amber-900 dark:text-amber-300">{{ formatCurrency(totalKasbon) }}</span>
                </div>
              </div>
            </div>

            <!-- Input Potongan Kasbon -->
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Potongan Kasbon
              </label>
              <CurrencyInput
                v-model="form.kasbonDeduction"
                placeholder="0"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
              <p v-if="totalKasbon > 0" class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                Maksimal: {{ formatCurrency(totalKasbon) }}
              </p>
            </div>

            <!-- Info -->
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p class="text-[11px] text-gray-700 dark:text-gray-300">
                <strong>Cara kerja:</strong> Sistem akan otomatis menghitung gaji dari data karyawan dan insentif bongkar muat dari semua surat jalan yang selesai dalam periode tanggal yang dipilih. Potongan kasbon dapat diinput manual sesuai kesepakatan.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 p-4 dark:border-gray-700">
          <div class="flex gap-3">
            <button
              type="button"
              @click="$emit('close')"
              class="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="button"
              @click="handleSubmit"
              :disabled="!canSubmit || loading"
              class="flex-[2] rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ loading ? 'Memproses...' : 'Generate Slip Gaji' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHrStore } from '@/stores/hr'
import { useToast } from '@/composables/useToast'
import SelectField from '@/components/common/SelectField.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import type { Employee, EmployeeLoan } from '@/types/database'

const emit = defineEmits<{
  close: []
  created: []
}>()

const toast = useToast()
const store = useHrStore()
const loading = ref(false)

const form = reactive({
  employeeId: '',
  periodStart: '',
  periodEnd: '',
  kasbonDeduction: 0,
})

const activeEmployees = computed(() => 
  store.employees.filter((e) => e.is_active && e.status === 'aktif')
)

const employeeOptions = computed(() =>
  activeEmployees.value.map((e) => ({
    label: `${e.name} (${e.position || 'Tanpa Jabatan'})`,
    value: e.id,
  }))
)

const selectedEmployee = computed(() => 
  activeEmployees.value.find((e) => e.id === form.employeeId)
)

const activeLoans = computed(() =>
  store.employeeLoans.filter(
    (l) => l.employee_id === form.employeeId && l.status === 'active' && l.remaining_amount > 0
  )
)

const totalKasbon = computed(() =>
  activeLoans.value.reduce((sum, l) => sum + l.remaining_amount, 0)
)

const canSubmit = computed(
  () => form.employeeId && form.periodStart && form.periodEnd && form.periodStart <= form.periodEnd
)

const handleEmployeeChange = () => {
  // Reset kasbon deduction ketika ganti karyawan
  form.kasbonDeduction = 0
}

const handleSubmit = async () => {
  if (!canSubmit.value) return

  loading.value = true
  try {
    await store.generatePayroll(
      form.employeeId,
      form.periodStart,
      form.periodEnd,
      form.kasbonDeduction
    )
    emit('created')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  } finally {
    loading.value = false
  }
}

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const formatDate = (d: string) => {
  if (!d) return '-'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

onMounted(async () => {
  if (store.employees.length === 0) await store.fetchEmployees()
  if (store.employeeLoans.length === 0) await store.fetchEmployeeLoans()
})
</script>
