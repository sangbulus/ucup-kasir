<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Payroll" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Payroll" :subtitle="period?.period_code || ''" back-to="/hr/payroll" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="!period" class="py-20 text-center">
      <p class="text-sm text-gray-500">Periode tidak ditemukan</p>
    </div>

    <template v-else>
      <!-- Period Summary -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">{{ period.period_code }}</h2>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ period.start_date }} → {{ period.end_date }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="statusBadge(period.status)">{{ statusLabel(period.status) }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Karyawan</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ period.total_employee }}</p>
          </div>
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Gross</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(period.total_gross) }}</p>
          </div>
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Net</p>
            <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(period.total_net) }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-3 flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <button
            v-if="period.status === 'draft'"
            @click="handleGenerate"
            :disabled="store.loading"
            class="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Generate Payroll
          </button>
          <button
            v-if="period.status === 'generated'"
            @click="handlePost"
            :disabled="store.loading"
            class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Post Jurnal Akuntansi
          </button>
          <button
            @click="handleDelete"
            :disabled="store.loading"
            class="rounded-xl border border-red-300 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Hapus
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="mt-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari karyawan..."
          class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- Payroll Rows -->
      <div v-if="filteredPayrolls.length === 0" class="mt-4 rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada data payroll. Klik "Generate Payroll" untuk menghitung gaji.</p>
      </div>

      <!-- Desktop Table -->
      <div v-else class="mt-4 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Tunjangan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Potongan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Net</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredPayrolls" :key="p.id" @click="expandedPayrollId = expandedPayrollId === p.id ? null : p.id" class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</td>
              <td class="px-4 py-3 text-right text-emerald-600">{{ formatCurrency(p.total_allowance) }}</td>
              <td class="px-4 py-3 text-right text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
              <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</td>
              <td class="px-4 py-3">
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'">{{ p.status }}</span>
              </td>
            </tr>
            <tr v-if="expandedPayrollId" class="bg-gray-50 dark:bg-gray-800">
              <td colspan="5" class="px-4 py-3">
                <div v-if="expandedPayroll" class="space-y-1.5">
                  <div v-for="item in expandedPayroll.items || []" :key="item.id" class="flex items-center justify-between text-[11px]">
                    <span class="text-gray-600 dark:text-gray-400">{{ item.component_name }}</span>
                    <span :class="item.component_type === 'tunjangan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                      {{ item.component_type === 'tunjangan' ? '+' : '-' }} {{ formatCurrency(item.amount) }}
                    </span>
                  </div>
                  <div v-if="!(expandedPayroll.items || []).length" class="text-[11px] text-gray-400">Tidak ada komponen.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div v-if="filteredPayrolls.length > 0" class="mt-4 grid grid-cols-1 gap-3 md:hidden">
        <div
          v-for="p in filteredPayrolls"
          :key="p.id"
          @click="expandedPayrollId = expandedPayrollId === p.id ? null : p.id"
          class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.employee?.position ? capitalize(p.employee.position) : 'Tanpa jabatan' }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'">{{ p.status }}</span>
            </div>
          </div>
          <div v-if="expandedPayrollId === p.id" class="mt-2 space-y-1.5 border-t border-gray-200 pt-2 dark:border-gray-700">
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Tunjangan</span>
              <span class="font-medium text-emerald-600">{{ formatCurrency(p.total_allowance) }}</span>
            </div>
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Potongan</span>
              <span class="font-medium text-red-600">{{ formatCurrency(p.total_deduction) }}</span>
            </div>
            <div v-for="item in p.items || []" :key="item.id" class="flex justify-between text-[10px] pl-2">
              <span class="text-gray-400">{{ item.component_name }}</span>
              <span :class="item.component_type === 'tunjangan' ? 'text-emerald-600' : 'text-red-600'">{{ item.component_type === 'tunjangan' ? '+' : '-' }} {{ formatCurrency(item.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============================================================
         Modal Potongan Kasbon — muncul saat Generate Payroll bila ada
         karyawan dengan kasbon aktif. User pilih per karyawan:
         Semua / Setengah / Nominal custom / Jangan potong.
         ============================================================ -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showKasbonModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" @click.self="showKasbonModal = false">
        <div class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:rounded-2xl">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Potongan Kasbon saat Gajian</h3>
            <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Pilih cara memotong kasbon tiap karyawan. Potongan maksimal sebesar gaji bersih karyawan tersebut.
            </p>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="kasbonRows.length === 0" class="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Tidak ada kasbon aktif untuk karyawan di periode ini.
            </div>
            <div v-for="row in kasbonRows" :key="row.employeeId" class="mb-4 rounded-xl border border-gray-200 p-3 last:mb-0 dark:border-gray-700">
              <div class="mb-2 flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ row.employeeName }}</p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">Gaji bersih sebelum kasbon: {{ formatCurrency(row.netBefore) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">Sisa Kasbon</p>
                  <p class="text-xs font-bold text-amber-600 dark:text-amber-400">{{ formatCurrency(row.totalRemaining) }}</p>
                </div>
              </div>
              <!-- Segmented pilihan -->
              <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  v-for="opt in KASBON_OPTIONS"
                  :key="opt.value"
                  @click="setKasbonChoice(row.employeeId, opt.value)"
                  class="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition"
                  :class="kasbonChoices[row.employeeId] === opt.value
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'"
                >
                  {{ opt.label }}
                </button>
              </div>
              <!-- Nominal custom -->
              <div v-if="kasbonChoices[row.employeeId] === 'custom'" class="mt-2">
                <input
                  v-model="kasbonCustom[row.employeeId]"
                  type="number"
                  min="0"
                  placeholder="Nominal potongan total"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <p class="mt-1 text-[10px] text-gray-400">Dipotong bertahap dari kasbon terlama (maks. {{ formatCurrency(row.totalRemaining) }})</p>
              </div>
              <!-- Estimasi potong -->
              <p class="mt-2 text-right text-[10px] font-semibold text-red-600 dark:text-red-400">
                Potongan: {{ formatCurrency(estimateDeduction(row)) }}
                <span class="text-gray-400">→ Take home {{ formatCurrency(Math.max(0, row.netBefore - estimateDeduction(row))) }}</span>
              </p>
            </div>
          </div>

          <div class="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              @click="showKasbonModal = false"
              :disabled="store.loading"
              class="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              @click="confirmGenerateWithKasbon"
              :disabled="store.loading"
              class="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {{ store.loading ? 'Memproses...' : 'Generate & Potong Kasbon' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'
import type { KasbonChoice } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = useHrStore()

const loading = ref(true)
const searchQuery = ref('')
const expandedPayrollId = ref<string | null>(null)

const period = computed(() => store.payrollPeriods.find((p) => p.id === route.params.id) || null)
const expandedPayroll = computed(() => store.payrolls.find((p) => p.id === expandedPayrollId.value) || null)

const filteredPayrolls = computed(() => {
  let list = store.payrolls.filter((p) => p.period_id === route.params.id)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((p) => (p.employee?.name || '').toLowerCase().includes(q))
  }
  return list
})

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'generated': return 'Siap Bayar'
    case 'paid': return 'Dibayar'
    case 'cancelled': return 'Batal'
    default: return s
  }
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'generated': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ============================================================
// KASBON — potongan otomatis saat generate payroll
// ============================================================
const KASBON_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'half', label: 'Setengah' },
  { value: 'custom', label: 'Nominal' },
  { value: 'none', label: 'Tidak' },
] as const

const showKasbonModal = ref(false)
/** employee_id → 'all' | 'half' | 'custom' | 'none' */
const kasbonChoices = reactive<Record<string, string>>({})
/** employee_id → angka nominal custom (string dari input) */
const kasbonCustom = reactive<Record<string, string>>({})

/** Baris karyawan dengan kasbon aktif yang akan masuk payroll periode ini. */
const kasbonRows = computed(() => {
  const rows: { employeeId: string; employeeName: string; totalRemaining: number; netBefore: number }[] = []
  const empIds = new Set<string>()
  for (const loan of store.employeeLoans) {
    if (loan.status !== 'active' || Number(loan.remaining_amount) <= 0) continue
    empIds.add(loan.employee_id)
  }
  for (const empId of empIds) {
    const emp = store.employees.find((e) => e.id === empId)
    if (!emp || !emp.is_active || emp.status !== 'aktif') continue
    const totalRemaining = store.employeeLoans
      .filter((l) => l.employee_id === empId && l.status === 'active')
      .reduce((s, l) => s + Number(l.remaining_amount), 0)
    rows.push({
      employeeId: empId,
      employeeName: emp.name,
      totalRemaining,
      // Estimasi gaji bersih sebelum kasbon ≈ base salary
      netBefore: Number(emp.base_salary) || 0,
    })
  }
  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
})

const setKasbonChoice = (empId: string, value: string) => {
  kasbonChoices[empId] = value
}

/** Estimasi potongan utk tampilan (mengikuti aturan RPC: 'all' penuh,
 *  'half' per loan floor/2, 'custom' cap total, dibatasi gaji bersih). */
const estimateDeduction = (row: { employeeId: string; totalRemaining: number; netBefore: number }) => {
  const choice = kasbonChoices[row.employeeId] || 'all'
  if (choice === 'none') return 0
  const loans = store.employeeLoans
    .filter((l) => l.employee_id === row.employeeId && l.status === 'active' && Number(l.remaining_amount) > 0)
    .sort((a, b) => (a.loan_date || '').localeCompare(b.loan_date || ''))
  let allowed = row.netBefore
  let deduct = 0
  for (const l of loans) {
    if (allowed <= 0) break
    const remaining = Number(l.remaining_amount)
    let take = choice === 'half' ? Math.floor(remaining / 2) : remaining
    take = Math.min(take, allowed)
    deduct += take
    allowed -= take
  }
  if (choice === 'custom') {
    const custom = Number(kasbonCustom[row.employeeId]) || 0
    deduct = Math.min(deduct, custom)
  }
  return deduct
}

const handleGenerate = async () => {
  if (!(await confirm('Generate payroll untuk periode ini?'))) return
  try {
    // Muat kasbon terkini utk menentukan perlu-tidaknya modal potongan
    await store.fetchEmployeeLoans()
    if (kasbonRows.value.length > 0) {
      // Default pilihan: Semua
      for (const row of kasbonRows.value) {
        if (!kasbonChoices[row.employeeId]) kasbonChoices[row.employeeId] = 'all'
      }
      showKasbonModal.value = true
      return
    }
    await store.generatePayroll(route.params.id as string)
    toast.success('Berhasil!', 'Payroll berhasil digenerate')
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

/** Generate slip + terapkan potongan kasbon sesuai pilihan user */
const confirmGenerateWithKasbon = async () => {
  try {
    await store.generatePayroll(route.params.id as string)
    const choices: Record<string, KasbonChoice> = {}
    for (const row of kasbonRows.value) {
      const mode = kasbonChoices[row.employeeId] || 'all'
      if (mode === 'none') {
        choices[row.employeeId] = 'none'
      } else if (mode === 'custom') {
        const nominal = Math.max(0, Math.floor(Number(kasbonCustom[row.employeeId]) || 0))
        choices[row.employeeId] = nominal > 0 ? String(nominal) : 'none'
      } else {
        choices[row.employeeId] = mode as KasbonChoice
      }
    }
    const result = await store.applyKasbonDeductions(route.params.id as string, choices)
    toast.success(
      'Payroll dibuat!',
      result.applied_count > 0
        ? `${result.applied_count} potongan kasbon (total ${formatCurrency(result.applied_amount)}) diterapkan`
        : 'Tidak ada potongan kasbon yang diterapkan'
    )
    showKasbonModal.value = false
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handlePost = async () => {
  if (!(await confirm('Post jurnal akuntansi untuk payroll ini?'))) return
  try {
    await store.postPayrollJournal(route.params.id as string)
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handleDelete = async () => {
  const msg = period.value?.status === 'paid'
    ? 'Hapus payroll ini? Jurnal akuntansi yang sudah diposting juga akan ikut terhapus.'
    : 'Hapus payroll ini? Semua data slip gaji akan ikut terhapus.'

  if (!(await confirm(msg))) return
  try {
    await store.deletePayrollPeriod(route.params.id as string)
    toast.success('Berhasil!', 'Payroll berhasil dihapus')
    await router.push('/hr/payroll')
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchPayrollPeriods(),
      store.fetchPayrolls(route.params.id as string),
      store.fetchEmployees(),
      store.fetchEmployeeLoans(),
    ])
  } catch (e: any) {
    toast.error('Gagal memuat data!', e.message)
  } finally {
    // WAJIB di finally — kalau fetch gagal, spinner berhenti & tampil empty state
    loading.value = false
  }
})
</script>