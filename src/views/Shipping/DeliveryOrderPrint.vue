<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950">
    <!-- Toolbar (hidden saat print) -->
    <div class="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 print:hidden">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <button
          @click="router.back()"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          Kembali
        </button>
        <div class="flex items-center gap-2">
          <button
            @click="handleShare"
            :disabled="busy"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Bagikan
          </button>
          <button
            @click="handlePrint"
            :disabled="busy"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
            </svg>
            {{ isNative ? 'Cetak (PDF)' : 'Cetak' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && !order" class="flex items-center justify-center py-24">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat surat jalan...</p>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!order" class="mx-auto max-w-4xl px-4 py-16 text-center">
      <p class="text-gray-600 dark:text-gray-400">Surat jalan tidak ditemukan</p>
    </div>

    <!-- Dokumen Surat Jalan -->
    <div v-else class="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div class="print-area bg-white p-8 font-sans text-gray-900 shadow-xl sm:p-10">
        <!-- Kop -->
        <div class="text-center">
          <p class="text-base font-black uppercase tracking-widest">
            {{ isMulti ? 'Surat Jalan Gabungan (Multi-Drop)' : 'Surat Jalan' }}
          </p>
          <p class="mt-2 text-[22px] font-bold leading-none" style="color: #0d86ff">{{ storeName }}</p>
          <p v-if="storeAddress" class="mt-1.5 text-sm text-gray-600">{{ storeAddress }}</p>
          <p v-if="storePhone" class="text-sm text-gray-600">Phone: {{ storePhone }}</p>
        </div>

        <div class="mt-5 border-t-2 border-b-2 border-black"></div>

        <!-- Info umum -->
        <div class="mt-4 grid grid-cols-1 gap-x-10 gap-y-1.5 text-sm sm:grid-cols-2">
          <div class="flex items-baseline gap-2">
            <span class="w-28 whitespace-nowrap font-semibold">No. Surat Jalan</span>
            <span>:</span>
            <span class="font-semibold">{{ order.do_number || '-' }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-24 whitespace-nowrap font-semibold">Tanggal Kirim</span>
            <span>:</span>
            <span class="font-semibold">{{ formatDate(order.do_date) }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-28 whitespace-nowrap font-semibold">No. Polisi</span>
            <span>:</span>
            <span class="font-semibold">{{ plateInfo }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-24 whitespace-nowrap font-semibold">Nama Sopir</span>
            <span>:</span>
            <span class="font-semibold">{{ order.driver_name || '-' }}</span>
          </div>
        </div>
        <p v-if="isMulti" class="mt-1.5 text-sm">
          <span class="font-semibold">Rute Pengiriman</span> : {{ drops.map((d) => d.kecamatan).join(' → ') }}
        </p>

        <!-- Rekap muatan truk: total seluruh barang yang harus dimuat (agregat semua tujuan) -->
        <div class="mt-6">
          <p class="text-sm font-bold uppercase tracking-wide">Daftar Muat Truk</p>
          <div class="mt-1.5 overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-t-2 border-b-2 border-black">
                  <th class="w-9 py-2 text-center text-xs font-bold uppercase">No</th>
                  <th class="w-28 px-2 py-2 text-left text-xs font-bold uppercase">Kode Barang</th>
                  <th class="px-2 py-2 text-left text-xs font-bold uppercase">Nama / Deskripsi Barang</th>
                  <th class="w-16 py-2 pl-2 pr-4 text-right text-xs font-bold uppercase">Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in truckRows" :key="i" class="border-b border-gray-300">
                  <td class="py-2 text-center">{{ i + 1 }}</td>
                  <td class="px-2 py-2">{{ r.code }}</td>
                  <td class="px-2 py-2">{{ r.name }}</td>
                  <td class="py-2 pl-2 pr-4 text-right font-semibold">{{ r.qty }}</td>
                </tr>
                <tr v-if="truckRows.length === 0">
                  <td colspan="4" class="py-3 text-center text-gray-500">Tidak ada barang dicatat.</td>
                </tr>
                <tr v-else class="border-t-2 border-black">
                  <td colspan="3" class="py-2 pr-2 text-right text-xs font-bold uppercase">Total Dimuat</td>
                  <td class="py-2 pl-2 pr-4 text-right text-base font-black">{{ truckTotalQty }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Barang dimuat: satu bagian per transaksi rujukan (penerima + tabel) -->
        <div v-for="(d, di) in drops" :key="di" class="mt-6">
          <p class="text-sm">
            <span class="font-bold">Pelanggan</span> : {{ d.name }}
          </p>
          <p class="text-sm">
            <span class="font-bold">Alamat</span> : {{ d.kecamatan !== '-' ? d.kecamatan : '-' }}
          </p>
          <div class="mt-1.5 overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="border-t-2 border-b-2 border-black">
                  <th class="w-9 py-2 text-center text-xs font-bold uppercase">No</th>
                  <th class="w-28 px-2 py-2 text-left text-xs font-bold uppercase">Kode Barang</th>
                  <th class="px-2 py-2 text-left text-xs font-bold uppercase">Nama / Deskripsi Barang</th>
                  <th class="w-16 py-2 pl-2 pr-4 text-right text-xs font-bold uppercase">Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in d.rows" :key="r.no" class="border-b border-gray-300">
                  <td class="py-2 text-center">{{ r.no }}</td>
                  <td class="px-2 py-2">{{ r.code }}</td>
                  <td class="px-2 py-2">{{ r.name }}</td>
                  <td class="py-2 pl-2 pr-4 text-right font-semibold">{{ r.qty }}</td>
                </tr>
                <tr v-if="d.rows.length === 0">
                  <td colspan="4" class="py-3 text-center text-gray-500">Tidak ada barang dicatat.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Catatan kaki -->
        <div class="mt-8 border-t-2 border-black pt-3 text-xs leading-relaxed text-gray-600">
          <p class="font-bold text-gray-900">Catatan Pengiriman{{ isMulti ? ' Multi-Drop' : '' }}:</p>
          <p>
            Dokumen ini diproses secara otomatis oleh sistem manajemen logistik terintegrasi
            dan sah tanpa memerlukan tanda tangan basah. Mohon periksa kesesuaian fisik
            barang saat penerimaan.
          </p>
          <p v-if="order.notes" class="mt-1"><span class="font-semibold text-gray-900">Catatan:</span> {{ order.notes }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShippingStore } from '@/stores/shipping'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useProductsStore } from '@/stores/products'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useDeliveryOrderPdf } from '@/composables/useDeliveryOrderPdf'
import { isNativeApp } from '@/lib/platform'
import { useToast } from '@/composables/useToast'
import type { Customer, Product, Transaction } from '@/types/database'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useShippingStore()
const { generatePdfBlob, sharePdf } = useDeliveryOrderPdf()
const isNative = isNativeApp()
const busy = ref(false)
const customersStore = useCustomersStore()
const txStore = useTransactionsStore()
const productsStore = useProductsStore()
const settingsStore = useStoreSettingsStore()

const doId = route.params.id as string
const order = computed(() => store.currentOrder)

const storeName = computed(() => settingsStore.storeName)
const storeAddress = computed(() => settingsStore.storeAddress)
const storePhone = computed(() => settingsStore.storePhone)

const plateInfo = computed(() => {
  const v = order.value?.vehicle
  if (!v) return '-'
  return `${v.plate_number}${v.vehicle_type ? ` (${v.vehicle_type})` : ''}`
})

// Kode barang dari master produk (sku/code/barcode), match via product_id lalu nama
const productCode = (item: any): string => {
  const list: Product[] = productsStore.products || []
  const p =
    (item.product_id && list.find((x) => x.id === item.product_id)) ||
    list.find((x) => (x.name || '').trim().toLowerCase() === (item.product_name || '').trim().toLowerCase())
  return p?.sku || p?.code || p?.barcode || '-'
}

interface PrintRow {
  no: number
  code: string
  name: string
  qty: number
}
interface PrintDrop {
  name: string
  kecamatan: string
  rows: PrintRow[]
}

// Satu transaksi rujukan = satu "drop". Urutan mengikuti transaction_ids pada surat jalan.
const drops = computed<PrintDrop[]>(() => {
  const o = order.value
  if (!o) return []

  const ids = o.transaction_ids || []
  const byId = new Map<string, Transaction>((txStore.transactions || []).map((t) => [t.id, t]))
  const txs = ids.map((id) => byId.get(id)).filter((t): t is Transaction => !!t)

  let no = 0
  if (txs.length > 0) {
    return txs.map((t) => {
      const cust: Customer | undefined = t.customer_id
        ? (customersStore.customers || []).find((c) => c.id === t.customer_id)
        : undefined
      no = 0 // penomoran ulang mulai dari 1 di tiap tabel
      return {
        name: cust?.name || t.customer_name || '-',
        kecamatan: cust?.kecamatan || '-',
        rows: (t.items || []).map((it) => ({
          no: ++no,
          code: productCode(it),
          name: it.product_name || '-',
          qty: it.quantity || 0,
        })),
      }
    })
  }

  // Fallback: tanpa transaksi rujukan → pakai barang dimuat DO sebagai satu drop
  const li = o.load_items || []
  const source = li.length > 0 ? li : o.items || []
  return [
    {
      name: o.customer_name || 'Pelanggan',
      kecamatan: '-',
      rows: source.map((r) => ({
        no: ++no,
        code: '-',
        name: r.product_name || '-',
        qty: r.quantity || 0,
      })),
    },
  ]
})

const isMulti = computed(() => drops.value.length > 1)

// Rekap muatan truk: seluruh barang dari semua tujuan diagregat per kode+nama produk,
// diletakkan di atas supaya jelas total yang harus dimuat ke truk sebelum rincian per transaksi.
const truckRows = computed(() => {
  const agg = new Map<string, { code: string; name: string; qty: number }>()
  for (const d of drops.value) {
    for (const r of d.rows) {
      const key = `${r.code}||${r.name.toLowerCase()}`
      const ex = agg.get(key)
      if (ex) ex.qty += r.qty
      else agg.set(key, { code: r.code, name: r.name, qty: r.qty })
    }
  }
  return [...agg.values()]
})

const truckTotalQty = computed(() => truckRows.value.reduce((s, r) => s + r.qty, 0))

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const printDO = () => {
  document.title = `Surat Jalan - ${order.value?.do_number || ''}`
  window.print()
}

// Bangun data dokumen dari state tampilan untuk dicetak ke PDF
const buildPdfData = () => {
  const o = order.value!
  return {
    storeName: storeName.value,
    storeAddress: storeAddress.value,
    storePhone: storePhone.value,
    doNumber: o.do_number || '',
    doDate: o.do_date,
    plate: plateInfo.value,
    driverName: o.driver_name || '-',
    isMulti: isMulti.value,
    route: drops.value.map((d) => d.kecamatan).filter((k) => k && k !== '-').join(' → '),
    notes: o.notes,
    truckRows: truckRows.value.map((r) => ({ code: r.code, name: r.name, qty: r.qty })),
    truckTotalQty: truckTotalQty.value,
    drops: drops.value.map((d) => ({
      name: d.name,
      kecamatan: d.kecamatan,
      rows: d.rows.map((r) => ({ code: r.code, name: r.name, qty: r.qty })),
    })),
  }
}

const doFilename = () => `Surat_Jalan_${order.value?.do_number || ''}.pdf`

const sharePdfFlow = async () => {
  if (!order.value) return
  busy.value = true
  try {
    const blob = generatePdfBlob(buildPdfData())
    await sharePdf(blob, doFilename())
  } catch (e: any) {
    // Batal share dari dialog sistem bukan error nyata
    if (e?.message !== 'USER_CANCELED' && e?.code !== 'USER_CLOSED')
      toast.error('Gagal!', e.message || 'Gagal membagikan surat jalan')
  } finally {
    busy.value = false
  }
}

const handleShare = () => sharePdfFlow()

// Android: "Cetak" langsung export PDF lalu buka share sheet (WhatsApp);
// web: tetap dialog print browser.
const handlePrint = () => {
  if (isNative) return sharePdfFlow()
  printDO()
}

onMounted(async () => {
  await Promise.all([
    store.getDeliveryOrder(doId),
    customersStore.fetchCustomers(),
    txStore.fetchTransactions(),
    productsStore.fetchProducts(),
  ])
})
</script>

<style scoped>
@media print {
  /* Margins 0 menekan header/footer otomatis Chrome (tanggal, jam, judul halaman) */
  @page {
    margin: 0;
  }

  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
    max-width: none !important;
    padding: 24px 72px !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
