# Navigation Stack - Panduan Penggunaan

## Pengantar

Navigation Stack adalah sistem yang mengelola urutan layer (modal, sheet, dialog, page) untuk tombol back Android. Dengan sistem ini, tombol back Android akan mengikuti urutan layer yang terbuka, bukan riwayat route yang pernah dikunjungi.

## Konsep Dasar

### Urutan Prioritas Back Button

Ketika pengguna menekan tombol back Android, sistem akan menutup layer berdasarkan urutan prioritas:

1. **Modal** yang sedang terbuka
2. **Bottom Sheet** yang sedang terbuka  
3. **Dialog** yang sedang terbuka
4. **Page Route** (router.back())
5. **Exit App** (jika sudah di home page)

### Contoh Skenario

**Tanpa Navigation Stack** (perilaku lama):
```
1. User buka halaman Products
2. User buka halaman Product Detail
3. User buka modal Filter di halaman Product Detail
4. User tekan back → Kembali ke halaman Products (modal tidak tertutup)
```

**Dengan Navigation Stack** (perilaku baru):
```
1. User buka halaman Products
2. User buka halaman Product Detail
3. User buka modal Filter di halaman Product Detail
4. User tekan back → Modal Filter tertutup
5. User tekan back lagi → Kembali ke halaman Products
```

## Instalasi & Setup

Navigation Stack sudah diimplementasikan di `main.ts` dan siap digunakan:

```typescript
// src/main.ts
import { useNavigationStack } from '@/composables/useNavigationStack'

const { handleBackButton } = useNavigationStack()

CapacitorApp.addListener('backButton', async () => {
  const handled = await handleBackButton()
  
  if (!handled) {
    // Keluar dari aplikasi jika sudah tidak ada layer
    if (router.currentRoute.value.path === '/' || !router.options.history.state.back) {
      CapacitorApp.exitApp()
    }
  }
})
```

## Cara Menggunakan

### 1. Import Composable

```typescript
import { useNavigationStack } from '@/composables/useNavigationStack'
```

### 2. Gunakan di Component

```typescript
const { registerModal, unregisterModal } = useNavigationStack()
```

### 3. Register/Unregister Layer

Gunakan `watch` untuk otomatis register/unregister saat layer dibuka/ditutup:

```typescript
const showFilterModal = ref(false)

watch(showFilterModal, (isOpen) => {
  if (isOpen) {
    registerModal('filter-modal', () => {
      showFilterModal.value = false
    })
  } else {
    unregisterModal('filter-modal')
  }
})
```

## Contoh Implementasi

### Modal

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNavigationStack } from '@/composables/useNavigationStack'

const { registerModal, unregisterModal } = useNavigationStack()
const showFilterModal = ref(false)

// Auto register/unregister
watch(showFilterModal, (isOpen) => {
  if (isOpen) {
    registerModal('finance-filter-modal', () => {
      showFilterModal.value = false
    })
  } else {
    unregisterModal('finance-filter-modal')
  }
})

const openModal = () => {
  showFilterModal.value = true
}

const closeModal = () => {
  showFilterModal.value = false
}
</script>

<template>
  <div>
    <button @click="openModal">Buka Filter</button>
    
    <!-- Modal -->
    <div v-if="showFilterModal" class="modal">
      <div class="modal-content">
        <h3>Filter</h3>
        <button @click="closeModal">Tutup</button>
      </div>
    </div>
  </div>
</template>
```

### Bottom Sheet

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNavigationStack } from '@/composables/useNavigationStack'

const { registerSheet, unregisterSheet } = useNavigationStack()
const showBottomSheet = ref(false)

watch(showBottomSheet, (isOpen) => {
  if (isOpen) {
    registerSheet('product-options-sheet', () => {
      showBottomSheet.value = false
    })
  } else {
    unregisterSheet('product-options-sheet')
  }
})
</script>

<template>
  <div>
    <button @click="showBottomSheet = true">Lihat Opsi</button>
    
    <!-- Bottom Sheet -->
    <div v-if="showBottomSheet" class="bottom-sheet">
      <div class="sheet-content">
        <h3>Opsi Produk</h3>
        <button @click="showBottomSheet = false">Tutup</button>
      </div>
    </div>
  </div>
</template>
```

### Dialog Konfirmasi

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNavigationStack } from '@/composables/useNavigationStack'

const { registerDialog, unregisterDialog } = useNavigationStack()
const showConfirmDialog = ref(false)

watch(showConfirmDialog, (isOpen) => {
  if (isOpen) {
    registerDialog('delete-confirm-dialog', () => {
      showConfirmDialog.value = false
    })
  } else {
    unregisterDialog('delete-confirm-dialog')
  }
})

const confirmDelete = () => {
  // Lakukan penghapusan
  showConfirmDialog.value = false
}
</script>

<template>
  <div>
    <button @click="showConfirmDialog = true">Hapus</button>
    
    <!-- Dialog -->
    <div v-if="showConfirmDialog" class="dialog">
      <div class="dialog-content">
        <h3>Konfirmasi Hapus</h3>
        <p>Apakah Anda yakin ingin menghapus?</p>
        <button @click="confirmDelete">Ya, Hapus</button>
        <button @click="showConfirmDialog = false">Batal</button>
      </div>
    </div>
  </div>
</template>
```

## API Reference

### `registerModal(id, closeHandler, meta?)`

Mendaftarkan modal ke navigation stack.

**Parameters:**
- `id` (string): ID unik untuk modal (misal: 'filter-modal')
- `closeHandler` (function): Function yang dipanggil saat back button ditekan
- `meta` (object, optional): Data tambahan untuk modal

**Example:**
```typescript
registerModal('filter-modal', () => {
  showFilterModal.value = false
}, { source: 'finance-dashboard' })
```

### `unregisterModal(id)`

Menghapus modal dari navigation stack.

**Parameters:**
- `id` (string): ID modal yang akan dihapus

### `registerSheet(id, closeHandler, meta?)`

Mendaftarkan bottom sheet ke navigation stack.

### `unregisterSheet(id)`

Menghapus bottom sheet dari navigation stack.

### `registerDialog(id, closeHandler, meta?)`

Mendaftarkan dialog ke navigation stack.

### `unregisterDialog(id)`

Menghapus dialog dari navigation stack.

### `clearStack()`

Menghapus semua layer dari stack (jarang digunakan).

### `hasLayers()`

Mengecek apakah ada layer di stack.

**Returns:** `boolean`

### `peek()`

Mendapatkan layer terakhir di stack.

**Returns:** `StackLayer | undefined`

### `getLayers()`

Mendapatkan semua layer di stack.

**Returns:** `StackLayer[]`

## Best Practices

### 1. Gunakan ID yang Deskriptif

```typescript
// ✅ Good
registerModal('finance-filter-modal', closeHandler)
registerSheet('product-options-sheet', closeHandler)

// ❌ Bad
registerModal('modal1', closeHandler)
registerSheet('sheet', closeHandler)
```

### 2. Selalu Unregister saat Layer Tertutup

Gunakan `watch` untuk otomatis register/unregister:

```typescript
// ✅ Good
watch(showModal, (isOpen) => {
  if (isOpen) {
    registerModal('my-modal', () => { showModal.value = false })
  } else {
    unregisterModal('my-modal')
  }
})

// ❌ Bad - tidak ada unregister
if (showModal.value) {
  registerModal('my-modal', closeHandler)
}
```

### 3. Close Handler Harus Sync dengan State

```typescript
// ✅ Good
registerModal('my-modal', () => {
  showModal.value = false // State berubah
})

// ❌ Bad - close handler tidak mengubah state
registerModal('my-modal', () => {
  console.log('Modal closed')
})
```

### 4. Hindari Register Duplikat

Navigation Stack akan warning jika ID sudah ada. Gunakan `watch` untuk menghindari duplikasi:

```typescript
// ✅ Good - watch otomatis handle open/close
watch(showModal, (isOpen) => {
  if (isOpen) {
    registerModal('my-modal', closeHandler)
  } else {
    unregisterModal('my-modal')
  }
})

// ❌ Bad - bisa register duplikat
const openModal = () => {
  registerModal('my-modal', closeHandler) // Bisa dipanggil berkali-kali
  showModal.value = true
}
```

## Troubleshooting

### Modal tidak tertutup saat back button ditekan

**Penyebab:** Modal tidak terdaftar di navigation stack atau closeHandler tidak benar.

**Solusi:**
1. Pastikan `registerModal` dipanggil saat modal dibuka
2. Pastikan closeHandler mengubah state yang mengontrol visibility modal
3. Cek console untuk warning duplikat ID

### Back button langsung keluar dari app

**Penyebab:** Tidak ada layer di stack dan sudah di home page.

**Solusi:** Pastikan semua modal/sheet/dialog terdaftar dengan benar.

### Layer tidak terunregister

**Penyebab:** `unregisterModal/Sheet/Dialog` tidak dipanggil saat layer tertutup.

**Solusi:** Gunakan `watch` untuk otomatis unregister saat state berubah jadi `false`.

## File yang Sudah Menggunakan Navigation Stack

Semua halaman dengan modal/sheet/dialog sudah terintegrasi (per September 2026):

**Cara baru (disarankan) — pakai `useAutoNavigationStack`:**

```typescript
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'

const showFilterModal = ref(false)
useAutoNavigationStack(showFilterModal, 'nama-halaman-filter-modal')
```

Tipe layer (modal/sheet/dialog) dideteksi otomatis dari ID (mengandung
`sheet`/`bottom`, `dialog`/`confirm`/`alert`, sisanya modal). Bisa di-override
lewat `options.type`. Cleanup otomatis saat komponen unmount.

**File yang sudah pakai `useAutoNavigationStack`:**

1. Finance: FinanceDashboard (via watch), BalanceSheet (via watch), CashFlow, ChartOfAccounts, GeneralLedger (2 modal), JournalList, TrialBalance
2. Reports: SalesReport, ProfitLossReport, TransactionProfitReport
3. Stock: StockManagement (4 layer), StockMovements, StockDetail
4. Customers: CustomerList (2 modal), CustomerDetail, AddCustomer, EditCustomer
5. Purchasing: SupplierList, PurchaseInvoiceDetail
6. Returns: ReturnList
7. HR: AttendanceList, PayrollDetail
8. Products: ProductList (4 layer), ProductDetail, AddProduct, EditProduct
9. Categories: CategoryList (3 layer), CategoryDetail, AddCategory, EditCategory
10. Invoices: InvoiceDetail (4 layer)
11. Shipping: DeliveryOrderForm (3 layer)
12. Settings: StoreSettings (logout confirm)

**Global:** `ConfirmDialogHost.vue` (App.vue) mendaftarkan dialog konfirmasi
`useConfirm()` ke stack — semua pemakaian `confirm()` di aplikasi otomatis
tertutup oleh tombol back Android.

**Komponen modal murni** (StockAdjustmentModal, StockOpnameModal, dst.) tidak
perlu daftar sendiri — parent-nya yang punya state `v-model` yang mendaftar.

**Untuk halaman baru:** cukup panggil `useAutoNavigationStack(showX, 'id-unik')`
di samping deklarasi ref-nya.

## Testing

Untuk testing di browser (bukan native app), gunakan browser DevTools:

1. Buka DevTools → Console
2. Jalankan: `window.history.back()` untuk simulasi back button
3. Atau gunakan Android emulator untuk testing native

## Kontribusi

Jika menemukan bug atau ingin menambah fitur:

1. Buka issue di repository
2. Jelaskan skenario penggunaan
3. Sertakan contoh code jika memungkinkan
