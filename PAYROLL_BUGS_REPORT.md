# Laporan Bug Testing Fitur Payroll
**Tanggal**: 12 September 2026  
**Status**: CRITICAL - Fitur Payroll Tidak Bisa Digunakan

---

## 🔴 CRITICAL BUGS

### ERROR #1: Fungsi RPC Tidak Bisa Digunakan Tanpa Auth Context
**Severity**: 🔴 CRITICAL (Blocker)  
**File**: `supabase/migrations/20260912_refactor_payroll_per_employee.sql`  
**Fungsi Terdampak**:
- `generate_payroll_for_employee()`
- `post_payroll_journal()`
- `delete_payroll()`

**Deskripsi**:
Semua fungsi RPC payroll menggunakan `auth.uid()` untuk validasi user, tetapi `auth.uid()` mengembalikan `NULL` ketika:
1. Dipanggil dari service role (untuk testing)
2. Dipanggil tanpa authenticated session
3. Dipanggil dari background job atau cron

**Dampak**:
- ❌ Fungsi tidak bisa ditest sama sekali
- ❌ Fungsi gagal dengan error "Karyawan tidak ditemukan" atau "Slip gaji tidak ditemukan"
- ❌ Tidak bisa digunakan untuk automation/scheduled jobs

**Contoh Error**:
```
ERROR: P0001: Karyawan tidak ditemukan
CONTEXT: PL/pgSQL function generate_payroll_for_employee(uuid,date,date,numeric) line 20 at RAISE
```

**Solusi yang Disarankan**:
```sql
-- Option A: Tambahkan fallback untuk auth.uid()
v_user_id := COALESCE(auth.uid(), (SELECT user_id FROM employees WHERE id = p_employee_id LIMIT 1));

-- Option B: Tambahkan parameter user_id (breaking change)
CREATE OR REPLACE FUNCTION generate_payroll_for_employee(
  p_user_id uuid,  -- NEW PARAMETER
  p_employee_id uuid,
  p_period_start date,
  p_period_end date,
  p_kasbon_deduction numeric DEFAULT 0
) RETURNS payrolls

-- Option C: Gunakan SECURITY INVOKER instead of SECURITY DEFINER
-- (Tapi ini memerlukan perubahan RLS policy)
```

---

### ERROR #2: Mismatch Nama Kolom `account_type` vs `type`
**Severity**: 🔴 HIGH (Runtime Error)  
**File**: `supabase/migrations/20260912_refactor_payroll_per_employee.sql` (line 270, 283)  
**Fungsi Terdampak**: `post_payroll_journal()`

**Deskripsi**:
Fungsi mencari kolom `account_type` di tabel `chart_of_accounts`, tetapi nama kolom yang benar adalah `type`.

**Kode yang Salah**:
```sql
SELECT id INTO v_expense_account
FROM chart_of_accounts
WHERE user_id = v_user_id
  AND account_type = 'expense'  -- ❌ KOLOM TIDAK ADA!
  
SELECT id INTO v_liability_account
FROM chart_of_accounts
WHERE user_id = v_user_id
  AND account_type = 'liability'  -- ❌ KOLOM TIDAK ADA!
```

**Dampak**:
- ❌ Post payroll journal pasti gagal
- ❌ Status payroll tidak bisa diubah ke 'paid'
- ❌ Jurnal akuntansi tidak bisa dibuat

**Solusi**:
```sql
-- Ganti semua 'account_type' menjadi 'type'
AND type = 'beban'  -- lihat juga ERROR #3
AND type = 'kewajiban'
```

---

### ERROR #3: Mismatch Bahasa Account Type (Inggris vs Indonesia)
**Severity**: 🔴 HIGH (Logic Error)  
**File**: `supabase/migrations/20260912_refactor_payroll_per_employee.sql`  
**Fungsi Terdampak**: `post_payroll_journal()`

**Deskripsi**:
Fungsi mencari account type dengan nilai Bahasa Inggris (`'expense'`, `'liability'`), tetapi database menggunakan Bahasa Indonesia (`'beban'`, `'kewajiban'`, `'aset'`, `'pendapatan'`, `'ekuitas'`).

**Data di Database**:
```
type          | count
--------------+------
aset          | 4
beban         | 7     <-- ini yang dicari sebagai 'expense'
ekuitas       | 2
kewajiban     | 1     <-- ini yang dicari sebagai 'liability'
pendapatan    | 2
```

**Kode yang Salah**:
```sql
WHERE type = 'expense'    -- ❌ TIDAK ADA! Seharusnya 'beban'
WHERE type = 'liability'  -- ❌ TIDAK ADA! Seharusnya 'kewajiban'
```

**Dampak**:
- ❌ Akun expense dan liability tidak akan pernah ditemukan
- ❌ Post payroll journal gagal dengan error "Akun biaya gaji tidak ditemukan"
- ❌ Bahkan jika akun sudah dibuat dengan benar, tetap tidak ketemu

**Solusi**:
```sql
-- Ganti nilai pencarian ke Bahasa Indonesia
SELECT id INTO v_expense_account
FROM chart_of_accounts
WHERE user_id = v_user_id
  AND type = 'beban'  -- ✅ BENAR
  AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
ORDER BY created_at
LIMIT 1;

SELECT id INTO v_liability_account
FROM chart_of_accounts
WHERE user_id = v_user_id
  AND type = 'kewajiban'  -- ✅ BENAR
  AND (LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%')
ORDER BY created_at
LIMIT 1;
```

---

---

### ERROR #4: Post Payroll Journal Tidak Return Updated Data
**Severity**: 🔴 HIGH (Data Inconsistency)  
**File**: `src/services/hr.ts` (line ~242)  
**Fungsi Terdampak**: `postPayrollJournal()`

**Deskripsi**:
Fungsi SQL `post_payroll_journal` mengembalikan row `payrolls` yang sudah diupdate (dengan status 'paid', journal_entry_id, paid_at), tetapi service layer tidak menangkap return value tersebut.

**Kode yang Salah**:
```typescript
// src/services/hr.ts
async postPayrollJournal(payrollId: string): Promise<void> {  // ❌ void
  const { error } = await supabase.rpc('post_payroll_journal', {
    p_payroll_id: payrollId,
  })
  if (error) throw error
  // ❌ TIDAK mengembalikan data updated!
}

// src/stores/hr.ts
async function postPayrollJournal(payrollId: string) {
  await hrServiceAdapter.postPayrollJournal(payrollId)
  // ⚠️ Harus refresh manual karena tidak ada return value
  await fetchPayrolls()  // Race condition potential!
}
```

**Dampak**:
- ⚠️ Status payroll tidak update langsung di UI
- ⚠️ Error "Cannot read property 'map'" ketika refresh gagal
- ⚠️ Race condition: user bisa klik tombol lain sebelum refresh selesai
- ⚠️ Performance hit: harus fetch semua payrolls hanya untuk update 1 row

**Contoh Error User**:
```
TypeError: Cannot read properties of undefined (reading 'map')
at filteredPayrolls (PayrollListNew.vue:241)
```

**Root Cause**:
1. `postPayrollJournal()` dipanggil → status belum update di store
2. `fetchPayrolls()` dipanggil → async, butuh waktu
3. UI render sebelum fetchPayrolls selesai → `store.payrolls` temporary undefined
4. `filteredPayrolls` computed coba access `.map()` pada undefined → **CRASH**

**Solusi**:
```typescript
// ✅ PERBAIKAN di src/services/hr.ts
async postPayrollJournal(payrollId: string): Promise<Payroll> {
  const { data, error } = await supabase.rpc('post_payroll_journal', {
    p_payroll_id: payrollId,
  })
  if (error) throw error
  
  // Fetch ulang untuk join employee (sama seperti generatePayroll)
  return this.getPayroll(data.id) as Promise<Payroll>
}

// ✅ PERBAIKAN di src/stores/hr.ts
async function postPayrollJournal(payrollId: string) {
  loading.value = true
  error.value = null
  const index = payrolls.value.findIndex((p) => p.id === payrollId)
  
  try {
    const updated = await hrServiceAdapter.postPayrollJournal(payrollId)
    
    // Update langsung di store tanpa refetch
    if (index !== -1) {
      payrolls.value[index] = updated
    }
    
    return updated
  } catch (e: any) {
    error.value = e.message
    throw e
  } finally {
    loading.value = false
  }
}
```

**Bonus Fix - Defensive Coding di Component**:
```typescript
// src/views/Hr/PayrollListNew.vue
const filteredPayrolls = computed(() => {
  // ✅ Guard clause untuk prevent crash
  if (!store.payrolls || !Array.isArray(store.payrolls)) {
    return []
  }
  
  let result = [...store.payrolls]
  // ... rest of filter logic
  return result
})
```

---

## ⚠️ POTENTIAL ISSUES

### ISSUE #1: Tidak Ada Unique Constraint untuk period_code
**Severity**: 🟡 MEDIUM  
**Deskripsi**: Tabel payrolls tidak memiliki unique constraint untuk `period_code` per user, hanya ada `UNIQUE(user_id, period_code)` yang bagus. ✅ Ini sudah benar.

### ISSUE #2: Perhitungan Insentif Menggunakan CEIL
**Severity**: 🟢 LOW (Design Question)  
**Deskripsi**: 
Fungsi `generate_payroll_for_employee` menggunakan `CEIL()` untuk pembulatan insentif:
```sql
v_incentive := v_incentive + CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
```

Ini bisa menyebabkan total insentif lebih besar dari nilai muatan sebenarnya jika ada banyak surat jalan.

**Contoh**:
- Surat Jalan 1: 1500 ÷ 1 loader = 1500 (OK)
- Surat Jalan 2: 1 ÷ 2 loader = 0.5 → CEIL = 1 per orang = **2 total** (lebih dari 1!)

**Rekomendasi**: Pertimbangkan ROUND atau FLOOR jika ingin konservatif.

---

## 📊 SUMMARY

| Error | Severity | Status | Blocker? |
|-------|----------|--------|----------|
| #1: auth.uid() NULL | 🔴 CRITICAL | Open | ✅ YES |
| #2: account_type vs type | 🔴 HIGH | Open | ✅ YES |
| #3: Bahasa Inggris vs Indonesia | 🔴 HIGH | Open | ✅ YES |
| #4: postPayrollJournal tidak return data | 🔴 HIGH | Open | ⚠️ PARTIAL |

**Kesimpulan**: Fitur Payroll **TIDAK BISA DIGUNAKAN SAMA SEKALI** dalam kondisi saat ini karena:
1. Fungsi RPC tidak bisa dipanggil (ERROR #1)
2. Bahkan jika bisa dipanggil, post journal pasti gagal (ERROR #2 + #3)
3. Bahkan jika berhasil post, UI crash dengan "cannot read map" (ERROR #4)

---

## 🔧 TESTING STATUS

### ✅ Completed Tests:
- [x] Task #1: Setup testing - Database schema validation

### ❌ Blocked Tests (Cannot Proceed):
- [ ] Task #2: Generate payroll tanpa insentif
- [ ] Task #3: Generate payroll dengan insentif
- [ ] Task #4: Generate payroll dengan kasbon
- [ ] Task #5: Post jurnal akuntansi
- [ ] Task #6: Delete payroll
- [ ] Task #7: Edge cases testing
- [ ] Task #8: UI components testing

**Reason**: All tests blocked by ERROR #1 (auth.uid() returns NULL)

---

## 🚀 RECOMMENDED FIX ORDER

1. **FIX ERROR #1 FIRST** (highest priority - blocker untuk semua testing)
2. FIX ERROR #2 (kolom name)
3. FIX ERROR #3 (nilai account type)
4. Re-run all tests
5. Test UI components
6. Deploy to production

---

## 📝 NOTES

Testing dilakukan dengan:
- ✅ Database schema validation
- ✅ RPC function signature check  
- ✅ Data consistency check
- ❌ Actual function execution (blocked by ERROR #1)

Environment:
- Database: Supabase PostgreSQL
- Test Method: Direct SQL query via service role
- Date: 2026-09-12T19:01:27+07:00
