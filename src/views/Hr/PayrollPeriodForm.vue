<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Periode Payroll" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Periode Payroll" subtitle="Buat periode penggajian baru" @back="$router.back()" />

    <!-- Error -->
    <div v-if="errorMsg" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{{ errorMsg }}</div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Detail Periode</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Mulai <span class="text-red-500">*</span></label>
            <input
              v-model="form.start_date"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Selesai <span class="text-red-500">*</span></label>
            <input
              v-model="form.end_date"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <!-- Saran periode lanjutan: otomatis mulai sehari setelah periode terakhir -->
        <div v-if="suggestion" class="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
          <p class="text-xs text-blue-800 dark:text-blue-300">
            Periode terakhir berakhir <b>{{ formatDate(suggestion.lastEnd) }}</b>.
            <button type="button" @click="applySuggestion" class="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-400">
              Mulai {{ formatDate(suggestion.nextStart) }}
            </button>
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p class="text-xs text-amber-800 dark:text-amber-300">
          Rentang tanggal bebas — tidak harus satu bulan penuh. Contoh: gajian tiap tanggal 8, buat periode <b>9 s/d 20</b>, lalu <b>21 s/d tanggal 8 bulan berikutnya</b>. Insentif bongkar muat dihitung dari surat jalan selesai yang tanggalnya masuk rentang ini. Kode periode dibuat otomatis: <b>{{ previewCode }}</b>.
        </p>
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          @click="$router.back()"
          class="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="store.loading"
          class="flex-[2] items-center justify-center rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {{ store.loading ? 'Menyimpan...' : 'Simpan Periode' }}
        </button>
      </div>
    </form>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const router = useRouter()
const store = useHrStore()
const errorMsg = ref('')

const now = new Date()
const fmtLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const form = reactive({
  // Default: bulan berjalan penuh (perilaku lama), tapi bebas diubah
  start_date: fmtLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
  end_date: fmtLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
})

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_ID[m - 1]} ${y}`
}

// Periode aktif (bukan cancelled) untuk cek tumpang tindih & saran kelanjutan
const activePeriods = computed(() =>
  (store.payrollPeriods || []).filter((p: any) => p.status !== 'cancelled')
)

const suggestion = computed(() => {
  if (activePeriods.value.length === 0) return null
  const lastEnd = activePeriods.value.reduce(
    (mx: string, p: any) => (p.end_date > mx ? p.end_date : mx),
    activePeriods.value[0].end_date
  )
  const next = new Date(lastEnd + 'T00:00:00')
  next.setDate(next.getDate() + 1)
  return { lastEnd, nextStart: fmtLocal(next) }
})

const applySuggestion = () => {
  if (!suggestion.value) return
  form.start_date = suggestion.value.nextStart
  // Default akhir: tanggal yang sama bulan berikutnya (siklus ±1 bulan), user bisa ubah
  const s = new Date(form.start_date + 'T00:00:00')
  const e = new Date(s.getFullYear(), s.getMonth() + 1, s.getDate() - 1)
  form.end_date = fmtLocal(e)
}

const previewCode = computed(() => (form.start_date && form.end_date ? buildCode(form.start_date, form.end_date) : 'PRL-...'))

// Kode unik per rentang tanggal: PRL-YYYYMMDD-YYYYMMDD (boleh beberapa periode dlm 1 bulan)
function buildCode(start: string, end: string): string {
  return `PRL-${start.split('-').join('')}-${end.split('-').join('')}`
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.start_date || !form.end_date) {
    errorMsg.value = 'Tanggal mulai dan selesai wajib diisi'
    return
  }
  if (form.end_date < form.start_date) {
    errorMsg.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai'
    return
  }
  // Cegah satu surat jalan/absensi terhitung di dua periode
  const overlap = activePeriods.value.find(
    (p: any) => form.start_date <= p.end_date && form.end_date >= p.start_date
  )
  if (overlap) {
    errorMsg.value = `Rentang ini tumpang tindih dengan periode ${overlap.period_code} (${formatDate(overlap.start_date)} – ${formatDate(overlap.end_date)}). Periode payroll tidak boleh beririsan.`
    return
  }
  try {
    const [sy, sm] = form.start_date.split('-').map(Number)
    const created = await store.createPayrollPeriod({
      period_code: buildCode(form.start_date, form.end_date),
      period_month: sm,
      period_year: sy,
      start_date: form.start_date,
      end_date: form.end_date,
      status: 'draft',
      total_employee: 0,
      total_gross: 0,
      total_deduction: 0,
      total_net: 0,
    })
    router.push(`/hr/payroll/${created.id}`)
  } catch (e: any) {
    errorMsg.value = e.message
  }
}

onMounted(() => {
  store.fetchPayrollPeriods()
})
</script>
