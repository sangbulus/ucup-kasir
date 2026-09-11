<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Slip Gaji" class="hidden md:block" />
    <MobilePageHeader title="Slip Gaji" subtitle="Daftar pembayaran gaji karyawan" back-to="/quick-menu/karyawan">
      <template #actions>
        <button @click="showCreateModal = true" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Slip Gaji</h2>
      <button @click="showCreateModal = true" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Buat Slip Gaji
      </button>
    </div>

    <div class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <SelectField v-model="filterEmployeeId" label="Filter Karyawan" placeholder="Semua Karyawan" :options="employeeOptions" />
      <div class="flex gap-2">
        <DateField v-model="filterStartDate" label="Dari" placeholder="Tanggal mulai" />
        <DateField v-model="filterEndDate" label="Sampai" placeholder="Tanggal akhir" />
      </div>
    </div>

    <div v-if="loading && store.payrolls.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="filteredPayrolls.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada slip gaji.</p>
      <button @click="showCreateModal = true" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">+ Buat Slip Gaji</button>
    </div>

    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Kode</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Periode</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Total Net</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredPayrolls" :key="p.id" @click="viewDetail(p)" class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-mono text-[10px] font-medium text-gray-900 dark:text-white">{{ p.period_code }}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(p.period_start) }} - {{ formatDate(p.period_end) }}</td>
            <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</td>
            <td class="px-4 py-3"><span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(p.status)">{{ statusLabel(p.status) }}</span></td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button v-if="p.status === 'draft'" @click.stop="handlePost(p.id)" class="rounded-lg border border-emerald-300 px-2.5 py-1 text-[9px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400">
                  Bayar
                </button>
                <button @click.stop="handleDelete(p.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400">
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="filteredPayrolls.length > 0" class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="p in filteredPayrolls" :key="p.id" @click="viewDetail(p)" class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.period_code }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(p.status)">{{ statusLabel(p.status) }}</span>
        </div>
        <div class="mt-2 text-[10px] text-gray-600 dark:text-gray-400">{{ formatDate(p.period_start) }} - {{ formatDate(p.period_end) }}</div>
        <div class="mt-2 text-right">
          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</span>
        </div>
        <div class="mt-2 flex gap-2">
          <button v-if="p.status === 'draft'" @click.stop="handlePost(p.id)" class="rounded-lg bg-emerald-100 px-2.5 py-1 text-[9px] font-medium text-emerald-700 dark:bg-emerald-500/20">Bayar Gaji</button>
          <button @click.stop="handleDelete(p.id)" class="rounded-lg bg-red-100 px-2.5 py-1 text-[9px] font-medium text-red-700 dark:bg-red-500/20">Hapus</button>
        </div>
      </div>
    </div>

    <transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" @click.self="showCreateModal = false">
        <div class="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:rounded-2xl">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Buat Slip Gaji Baru</h3>
            <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Isi detail slip gaji untuk 1 karyawan dengan periode tertentu</p>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <div class="space-y-3">
              <SelectField v-model="form.employee_id" label="Karyawan" placeholder="Pilih karyawan" :options="activeEmployeeOptions" required />
              <DateField v-model="form.period_start" label="Tanggal Mulai Periode" required />
              <DateField v-model="form.period_end" label="Tanggal Akhir Periode" required />
              <InputField v-model="form.base_salary" type="number" label="Gaji Pokok" placeholder="0" required />
              <InputField v-model="form.total_allowance" type="number" label="Total Tunjangan" placeholder="0" />
              <InputField v-model="form.total_deduction" type="number" label="Total Potongan" placeholder="0" />
              <InputField v-model="form.notes" label="Catatan" placeholder="Catatan (opsional)" />
            </div>
          </div>
          <div class="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
            <button @click="showCreateModal = false" :disabled="loading" class="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300">Batal</button>
            <button @click="handleCreate" :disabled="loading" class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{{ loading ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </div>
      </div>
    </transition>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { ref, reactive, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import SelectField from '@/components/common/SelectField.vue'
import DateField from '@/components/common/DateField.vue'
import InputField from '@/components/common/InputField.vue'
import { useHrStore } from '@/stores/hr'
import type { Payroll, PayrollInsert } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const store = useHrStore()
const loading = computed(() => store.loading)
const showCreateModal = ref(false)
const filterEmployeeId = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

useAutoNavigationStack(showCreateModal, 'payroll-create-modal')

const form = reactive({
  employee_id: '',
  period_start: '',
  period_end: '',
  base_salary: 0,
  total_allowance: 0,
  total_deduction: 0,
  notes: '',
})

const employeeOptions = computed(() => {
  const opts = store.employees.map((e) => ({ value: e.id, label: `${e.name} (${e.employee_code})` }))
  return [{ value: '', label: 'Semua Karyawan' }, ...opts]
})

const activeEmployeeOptions = computed(() =>
  store.employees.filter((e) => e.is_active && e.status === 'aktif').map((e) => ({ value: e.id, label: `${e.name} (${e.employee_code})` }))
)

const filteredPayrolls = computed(() => {
  let list = [...store.payrolls]
  if (filterEmployeeId.value) list = list.filter((p) => p.employee_id === filterEmployeeId.value)
  if (filterStartDate.value) list = list.filter((p) => p.period_start >= filterStartDate.value)
  if (filterEndDate.value) list = list.filter((p) => p.period_end <= filterEndDate.value)
  return list.sort((a, b) => b.period_start.localeCompare(a.period_start))
})

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
const getStatusBadge = (s: string) => s === 'draft' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
const statusLabel = (s: string) => s === 'draft' ? 'Draft' : 'Dibayar'

const handleCreate = async () => {
  if (!form.employee_id || !form.period_start || !form.period_end) {
    toast.error('Gagal!', 'Karyawan dan periode harus diisi')
    return
  }
  try {
    const employee = store.employees.find((e) => e.id === form.employee_id)
    if (!employee) throw new Error('Karyawan tidak ditemukan')
    const baseSalary = Number(form.base_salary) || Number(employee.base_salary) || 0
    const totalAllowance = Number(form.total_allowance) || 0
    const totalDeduction = Number(form.total_deduction) || 0
    const totalGross = baseSalary + totalAllowance
    const totalNet = totalGross - totalDeduction
    const periodCode = `${form.period_start.replace(/-/g, '')}-${employee.employee_code}`
    const input: PayrollInsert = {
      employee_id: form.employee_id,
      period_start: form.period_start,
      period_end: form.period_end,
      period_code: periodCode,
      base_salary: baseSalary,
      total_allowance: totalAllowance,
      total_deduction: totalDeduction,
      total_gross: totalGross,
      total_net: totalNet,
      status: 'draft',
      notes: form.notes || undefined,
    }
    await store.createPayroll(input)
    toast.success('Berhasil!', 'Slip gaji berhasil dibuat')
    showCreateModal.value = false
    Object.assign(form, { employee_id: '', period_start: '', period_end: '', base_salary: 0, total_allowance: 0, total_deduction: 0, notes: '' })
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handlePost = async (payrollId: string) => {
  if (!(await confirm('Bayar gaji ini dan posting ke jurnal akuntansi?'))) return
  try {
    await store.postPayrollJournal(payrollId)
    toast.success('Berhasil!', 'Gaji berhasil dibayar dan jurnal telah diposting')
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handleDelete = async (payrollId: string) => {
  if (!(await confirm('Hapus slip gaji ini?'))) return
  try {
    await store.deletePayroll(payrollId)
    toast.success('Berhasil!', 'Slip gaji berhasil dihapus')
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const viewDetail = (payroll: Payroll) => {
  toast.info('Info', `Slip gaji ${payroll.period_code}`)
}

onMounted(() => Promise.all([store.fetchEmployees(), store.fetchPayrolls()]))
</script>
