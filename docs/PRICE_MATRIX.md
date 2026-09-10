# Matriks Harga Khusus (Tiered & Custom Pricing)

Fitur untuk mengelola harga produk berdasarkan kuantitas pembelian (tiered pricing) dan harga khusus per pelanggan (custom pricing).

## Fitur Utama

### 1. Harga Bertingkat (Price Tiers)
- Atur harga berbeda berdasarkan range kuantitas pembelian
- Contoh: 1-10 pcs Rp 10.000, 11-50 pcs Rp 9.500, 51+ pcs Rp 9.000
- Nama tier kustom (Eceran, Grosir, Partai Besar, dll)
- Periode berlaku (tanggal mulai dan berakhir)
- Status aktif/nonaktif

### 2. Harga Khusus Pelanggan (Customer Price Matrix)
- Atur harga khusus untuk pelanggan tertentu
- Minimal kuantitas untuk harga khusus
- Periode berlaku
- Catatan/alasan pemberian harga khusus
- Status aktif/nonaktif

## Struktur Database

### Tabel: price_tiers
```sql
- id: uuid (PK)
- user_id: uuid (FK ke auth.users)
- product_id: uuid (FK ke products)
- min_quantity: integer (kuantitas minimum)
- max_quantity: integer (kuantitas maksimum, nullable)
- tier_price: numeric (harga tier)
- tier_name: text (nama tier, opsional)
- is_active: boolean
- start_date: date (tanggal mulai berlaku)
- end_date: date (tanggal berakhir)
- created_at: timestamptz
- updated_at: timestamptz
```

### Tabel: customer_price_matrix
```sql
- id: uuid (PK)
- user_id: uuid (FK ke auth.users)
- customer_id: uuid (FK ke customers)
- product_id: uuid (FK ke products)
- custom_price: numeric (harga khusus)
- min_quantity: integer (minimal kuantitas)
- is_active: boolean
- start_date: date
- end_date: date
- notes: text
- created_at: timestamptz
- updated_at: timestamptz
```

## Function Database

### get_applicable_price
Mengembalikan harga yang berlaku untuk produk berdasarkan prioritas:
1. Harga khusus pelanggan (jika ada dan sesuai kriteria)
2. Harga tier berdasarkan kuantitas (jika ada dan sesuai kriteria)
3. Harga normal produk

```sql
SELECT get_applicable_price(
  p_product_id := 'uuid-produk',
  p_customer_id := 'uuid-pelanggan', -- opsional
  p_quantity := 10,
  p_date := CURRENT_DATE
);
```

## Cara Menggunakan

### 1. Akses Halaman Matriks Harga
```
/price-matrix
```

### 2. Menambah Harga Tier
1. Klik tombol "Tambah"
2. Pilih "Harga Tier (Berdasarkan Kuantitas)"
3. Pilih produk
4. Atur nama tier (Eceran, Grosir, dll)
5. Atur range kuantitas (min dan max)
6. Masukkan harga tier
7. Atur periode berlaku (opsional)
8. Simpan

### 3. Menambah Harga Khusus Pelanggan
1. Klik tombol "Tambah"
2. Pilih "Harga Custom (Per Pelanggan)"
3. Pilih pelanggan
4. Pilih produk
5. Masukkan harga khusus
6. Atur minimal kuantitas
7. Atur periode berlaku (opsional)
8. Tambahkan catatan (opsional)
9. Simpan

## Integrasi dengan Modul Penjualan

### Menggunakan Composable
```typescript
import { usePriceMatrix } from '@/composables/usePriceMatrix'

const { getApplicablePrice } = usePriceMatrix()

// Get harga yang berlaku
const price = await getApplicablePrice(
  productId,
  quantity,
  customerId, // opsional
  defaultPrice
)
```

### Menggunakan Service
```typescript
import { priceMatrixService } from '@/services/priceMatrixService'

// Get harga yang berlaku
const price = await priceMatrixService.getApplicablePrice(
  productId,
  customerId,
  quantity,
  date
)
```

## Komponen UI

### PriceMatrixCard
Komponen untuk menampilkan list matriks harga dengan filter dan aksi CRUD.

```vue
<PriceMatrixCard
  @add="handleAdd"
  @edit="handleEdit"
  @delete="handleDelete"
/>
```

### PriceTierForm
Form untuk menambah/edit harga tier.

```vue
<PriceTierForm
  v-model="showForm"
  :edit-data="editingData"
  @submit="handleSubmit"
/>
```

### CustomerPriceForm
Form untuk menambah/edit harga khusus pelanggan.

```vue
<CustomerPriceForm
  v-model="showForm"
  :edit-data="editingData"
  @submit="handleSubmit"
/>
```

## Validasi

1. **Range Kuantitas**: Max quantity harus >= min quantity
2. **Overlap**: Sistem mencegah overlap range kuantitas untuk produk yang sama di periode yang sama
3. **Periode**: End date harus >= start date
4. **Harga**: Harga tidak boleh negatif

## Tips Penggunaan

1. **Harga Tier**: Gunakan untuk produk yang sering dijual dalam jumlah banyak
2. **Harga Khusus**: Gunakan untuk pelanggan loyal atau kontrak khusus
3. **Periode**: Manfaatkan untuk promo atau kontrak terbatas waktu
4. **Status Aktif**: Nonaktifkan sementara tanpa menghapus data

## Migrasi

File migrasi: `supabase/migrations/20260909_price_matrix_system.sql`

Untuk apply migrasi:
```bash
# Via Supabase CLI (local)
supabase db push

# Via MCP tool (production)
# Sudah di-apply otomatis saat development
```
