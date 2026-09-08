# Panduan Testing Sistem Sinkronisasi

## Overview

Sistem sinkronisasi Ucup Kasir menggunakan pola offline-first dengan SQLite sebagai database lokal dan Supabase sebagai server backend. Dokumen ini menjelaskan cara testing dan debugging sistem sinkronisasi.

## Komponen Sistem Sinkronisasi

### 1. SQLite Database (`src/lib/sqlite.ts`)
- Database lokal untuk menyimpan data offline
- 45 tabel (43 tabel data + 2 tabel metadata)
- Foreign key constraints untuk integritas referensial
- Sync queue untuk tracking perubahan lokal

### 2. Sync Engine (`src/services/sync/syncEngine.ts`)
- **Download Flow**: Supabase → SQLite
- **Upload Flow**: SQLite → Supabase (via sync queue)
- **Backup Flow**: Upload semua data ke Supabase

### 3. SQLite Services (`src/services/sqlite/*`)
- Service layer untuk setiap modul (categories, products, transactions, dll)
- Setiap service memiliki method `replaceAll()` untuk download
- Semua operasi CRUD menambahkan item ke sync queue

### 4. Sync Tester (`src/utils/syncTester.ts`)
- Utility untuk testing dan debugging
- Health check untuk monitoring status sinkronisasi
- Test runner untuk download dan upload flow

## Cara Testing

### A. Menggunakan UI Debugger

1. **Akses Sync Debugger**
   ```
   URL: /settings/sync-debugger
   ```

2. **Health Check**
   - Klik "Run Check" di card Health Check
   - Melihat status queue, last sync, dan jumlah data per tabel
   - Identifikasi masalah potensial

3. **Test Download**
   - Klik "Run Test" di card Test Download
   - Verifikasi bahwa data berhasil didownload dari Supabase
   - Periksa error jika ada

4. **Test Upload**
   - Klik "Run Test" di card Test Upload
   - Verifikasi bahwa perubahan lokal berhasil diupload
   - Periksa item yang gagal upload

5. **Inspect Queue**
   - Klik "Refresh" di card Sync Queue
   - Melihat detail setiap item di queue
   - Monitor retry count dan error message

6. **Run All Tests**
   - Klik "Run All Tests" untuk menjalankan semua test sekaligus
   - Mendapatkan overview lengkap dari sistem sinkronisasi

### B. Menggunakan Console/Script

```typescript
import {
  testDownloadFlow,
  testUploadFlow,
  syncHealthCheck,
  runAllSyncTests
} from '@/utils/syncTester'

// Health check
const health = await syncHealthCheck()
console.log('Health:', health)

// Test download
const downloadResult = await testDownloadFlow()
console.log('Download:', downloadResult)

// Test upload
const uploadResult = await testUploadFlow()
console.log('Upload:', uploadResult)

// Run all tests
const results = await runAllSyncTests()
console.log('All Tests:', results)
```

### C. Manual Testing dengan Supabase MCP

```typescript
// Cek tabel di Supabase
await mcp__supabase__list_tables({ schemas: ['public'] })

// Cek data di tabel tertentu
await mcp__supabase__execute_sql({
  query: 'SELECT * FROM products LIMIT 10'
})

// Cek migration history
await mcp__supabase__list_migrations()
```

## Skenario Testing

### 1. Fresh Download (Login Pertama Kali)

**Langkah:**
1. Hapus database lokal (jika ada)
2. Login ke aplikasi
3. Sistem otomatis memanggil `downloadAllFromSupabase()`
4. Verifikasi semua data terdownload

**Ekspektasi:**
- Semua tabel terisi dengan data dari Supabase
- Queue kosong setelah download
- Metadata `last_download_at` terupdate
- Tidak ada error

### 2. Upload Perubahan Lokal

**Langkah:**
1. Buat perubahan data lokal (tambah/edit/hapus)
2. Verifikasi item masuk ke sync queue
3. Panggil `uploadChangesToSupabase()` atau tunggu auto-sync
4. Verifikasi item terhapus dari queue setelah sukses

**Ekspektasi:**
- Item berhasil diupload ke Supabase
- Queue kosong atau item gagal tetap ada dengan retry count
- Metadata `last_sync_at` terupdate
- Data di Supabase match dengan data lokal

### 3. Conflict Resolution (Last-Write-Wins)

**Langkah:**
1. Edit data yang sama dari 2 device berbeda
2. Upload dari device pertama
3. Upload dari device kedua
4. Verifikasi data terakhir yang menang

**Ekspektasi:**
- Tidak ada error conflict
- Data terakhir yang diupload menimpa data sebelumnya
- Sistem stabil tanpa data corruption

### 4. Network Error Handling

**Langkah:**
1. Matikan koneksi internet
2. Buat perubahan data lokal
3. Verifikasi item masuk ke queue
4. Coba sync (akan gagal)
5. Hidupkan koneksi internet
6. Sync ulang

**Ekspektasi:**
- Item tetap di queue saat offline
- Error message jelas saat gagal sync
- Retry count bertambah
- Berhasil sync setelah koneksi kembali

### 5. Large Dataset Download

**Langkah:**
1. Siapkan data besar di Supabase (1000+ records per tabel)
2. Download semua data
3. Monitor waktu dan memory usage

**Ekspektasi:**
- Download berhasil tanpa timeout
- Memory tidak meledak
- Foreign key constraints tetap terjaga
- Performa acceptable (< 30 detik untuk 10k records)

### 6. Batch Upload

**Langkah:**
1. Buat banyak perubahan lokal (100+ operations)
2. Upload semua sekaligus
3. Monitor progress

**Ekspektasi:**
- Semua item diproses satu per satu
- Item yang gagal tetap di queue
- Item yang sukses dihapus dari queue
- Tidak ada deadlock atau hang

## Debugging Tips

### 1. Cek Queue yang Stuck

```sql
-- Di SQLite
SELECT * FROM sync_queue WHERE retry_count > 3;
```

**Solusi:**
- Periksa `last_error` untuk root cause
- Perbaiki data yang salah
- Hapus item dari queue jika tidak recoverable

### 2. Foreign Key Constraint Error

```
FOREIGN KEY constraint failed
```

**Solusi:**
- Pastikan data parent sudah ada sebelum insert child
- Verifikasi urutan insert di `downloadAllFromSupabase()`
- Cek apakah FK constraints dimatikan saat download

### 3. Duplicate Key Error

```
UNIQUE constraint failed: products.id
```

**Solusi:**
- Gunakan `INSERT OR REPLACE` atau `upsert()`
- Verifikasi ID generation (UUID harus unique)
- Cek apakah ada race condition

### 4. Data Tidak Sinkron

**Diagnosis:**
1. Cek queue size: `SELECT COUNT(*) FROM sync_queue`
2. Cek last sync: `SELECT value FROM sync_metadata WHERE key = 'last_sync_at'`
3. Bandingkan data lokal vs Supabase

**Solusi:**
- Paksa full download: `downloadAllFromSupabase()`
- Atau paksa full upload: `uploadAllToSupabase()`

### 5. Memory Leak saat Download

**Diagnosis:**
- Monitor memory usage saat download
- Cek apakah ada array yang tidak di-clear

**Solusi:**
- Batch download dengan pagination
- Clear array setelah diproses
- Gunakan streaming jika memungkinkan

## Best Practices

### 1. Testing Sebelum Production

- Test dengan data realistis (bukan 10 records)
- Test dengan koneksi lambat (throttle network)
- Test dengan interruption (kill app di tengah sync)
- Test dengan multiple devices

### 2. Monitoring Production

- Track sync failures via logging
- Alert jika queue size > threshold
- Monitor sync latency
- Track retry patterns

### 3. Error Handling

- Jangan auto-retry forever (max 5x)
- Simpan error message untuk debugging
- Alert user jika sync terus gagal
- Provide manual retry button

### 4. Data Integrity

- Selalu gunakan transaction untuk multi-table operations
- Validate data sebelum upload
- Backup sebelum destructive operations
- Test rollback scenarios

## Troubleshooting Checklist

- [ ] Apakah SQLite sudah terinisialisasi? (`initSQLite()`)
- [ ] Apakah user sudah login? (`supabase.auth.getUser()`)
- [ ] Apakah ada koneksi internet? (`isOnlineNow()`)
- [ ] Apakah queue kosong atau ada error? (`getSyncQueue()`)
- [ ] Apakah foreign keys aktif? (`PRAGMA foreign_keys`)
- [ ] Apakah schema SQLite match dengan Supabase?
- [ ] Apakah semua service punya method `replaceAll()`?
- [ ] Apakah `DOWNLOAD_TABLES` lengkap?

## Referensi Kode

- **SQLite**: `src/lib/sqlite.ts`
- **Sync Engine**: `src/services/sync/syncEngine.ts`
- **Sync Tester**: `src/utils/syncTester.ts`
- **Sync Debugger UI**: `src/views/Settings/SyncDebugger.vue`
- **Schema SQL**: `src/db/init.sql`

## Support

Jika menemukan bug atau masalah:
1. Capture screenshot dari Sync Debugger
2. Export console log
3. Export sync queue (`SELECT * FROM sync_queue`)
4. Buat issue dengan detail lengkap
