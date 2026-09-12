# Fix ERROR #4: Post Payroll Journal - Cannot Read Map

## 🐛 PROBLEM

Ketika user klik "Bayar & Jurnal":
1. ✅ Jurnal berhasil di-post ke database
2. ❌ Status payroll tetap "draft" di UI (tidak update)
3. ❌ Error: `Cannot read properties of undefined (reading 'map')`
4. ❌ UI crash atau freeze

## 🔍 ROOT CAUSE

**Service Layer** tidak menangkap return value dari RPC function:

```typescript
// ❌ MASALAH di src/services/hr.ts
async postPayrollJournal(payrollId: string): Promise<void> {
  const { error } = await supabase.rpc('post_payroll_journal', {
    p_payroll_id: payrollId,
  })
  if (error) throw error
  // Tidak ada return value!
}
```

**Store Layer** harus fetch ulang SEMUA payroll, yang menyebabkan race condition:

```typescript
// ⚠️ MASALAH di src/stores/hr.ts
async function postPayrollJournal(payrollId: string) {
  await hrServiceAdapter.postPayrollJournal(payrollId)
  
  // Race condition: fetchPayrolls() async, UI render duluan
  await fetchPayrolls()  // 💥 BOOM!
}
```

**Component** crash karena `store.payrolls` temporary undefined:

```typescript
// 💥 CRASH di src/views/Hr/PayrollListNew.vue
const filteredPayrolls = computed(() => {
  let result = [...store.payrolls]  // undefined.map() → ERROR!
  // ...
})
```

---

## ✅ SOLUTION

### Fix 1: Service Layer - Return Updated Data

**File**: `src/services/hr.ts` (sekitar line 242)

```typescript
// ✅ SEBELUM
async postPayrollJournal(payrollId: string): Promise<void> {
  const { error } = await supabase.rpc('post_payroll_journal', {
    p_payroll_id: payrollId,
  })
  if (error) throw error
}

// ✅ SESUDAH
async postPayrollJournal(payrollId: string): Promise<Payroll> {
  const { data, error } = await supabase.rpc('post_payroll_journal', {
    p_payroll_id: payrollId,
  })
  if (error) throw error
  
  // Fetch ulang untuk join employee (consistent dengan generatePayroll)
  return this.getPayroll(data.id) as Promise<Payroll>
}
```

---

### Fix 2: Store Layer - Update Langsung di Store

**File**: `src/stores/hr.ts` (sekitar line 308)

```typescript
// ✅ SEBELUM
async function postPayrollJournal(payrollId: string) {
  loading.value = true
  error.value = null
  try {
    await hrServiceAdapter.postPayrollJournal(payrollId)
    // Refresh untuk update status + journal_entry_id
    await fetchPayrolls()
  } catch (e: any) {
    error.value = e.message
    throw e
  } finally {
    loading.value = false
  }
}

// ✅ SESUDAH
async function postPayrollJournal(payrollId: string) {
  loading.value = true
  error.value = null
  
  // Simpan index untuk update langsung
  const index = payrolls.value.findIndex((p) => p.id === payrollId)
  
  try {
    // Dapat updated payroll dari service
    const updated = await hrServiceAdapter.postPayrollJournal(payrollId)
    
    // Update langsung di store (no refetch needed)
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

---

### Fix 3: Component Layer - Defensive Coding (Optional but Recommended)

**File**: `src/views/Hr/PayrollListNew.vue` (sekitar line 241)

```typescript
// ✅ SEBELUM
const filteredPayrolls = computed(() => {
  let result = [...store.payrolls]
  // ... filter logic
  return result
})

// ✅ SESUDAH (lebih safe)
const filteredPayrolls = computed(() => {
  // Guard clause untuk prevent crash
  if (!store.payrolls || !Array.isArray(store.payrolls)) {
    return []
  }
  
  let result = [...store.payrolls]
  
  if (filterSearch.value) {
    const search = filterSearch.value.toLowerCase()
    result = result.filter((p) =>
      p.period_code.toLowerCase().includes(search) ||
      p.employee?.name?.toLowerCase().includes(search)  // ✅ Optional chaining
    )
  }

  if (filterStartDate.value) {
    result = result.filter((p) => p.period_start >= filterStartDate.value)
  }

  if (filterEndDate.value) {
    result = result.filter((p) => p.period_end <= filterEndDate.value)
  }

  return result
})
```

---

## 🎯 EXPECTED RESULT AFTER FIX

1. ✅ User klik "Bayar & Jurnal"
2. ✅ Jurnal ter-post ke database
3. ✅ Status payroll langsung update ke "paid" di UI (instant, no flicker)
4. ✅ Button "Bayar & Jurnal" hilang, diganti "Cetak"
5. ✅ No error, no crash, smooth UX

---

## 🧪 HOW TO TEST

```typescript
// Test script (bisa di browser console)
const store = useHrStore()

// 1. Generate payroll dulu
await store.generatePayroll('employee-id', '2026-09-01', '2026-09-30', 0)

// 2. Post journal
const payroll = store.payrolls[0]
console.log('Before:', payroll.status) // 'draft'

await store.postPayrollJournal(payroll.id)

console.log('After:', payroll.status)  // ✅ Should be 'paid'
console.log('Journal ID:', payroll.journal_entry_id)  // ✅ Should have ID
```

---

## 📋 CHECKLIST

- [ ] Fix 1: Update `hrService.postPayrollJournal()` return type
- [ ] Fix 2: Update `hrStore.postPayrollJournal()` logic
- [ ] Fix 3: Add guard clause di `filteredPayrolls` computed
- [ ] Test: Generate payroll → Post journal → Verify status change
- [ ] Test: Cek tidak ada error "cannot read map"
- [ ] Deploy

---

## 🔗 RELATED BUGS

Error #4 adalah **INDEPENDENT** dari ERROR #1-3:
- ERROR #1-3: Backend tidak bisa jalan sama sekali
- ERROR #4: Backend jalan, tapi UI crash setelah success

**Priority**: Fix ERROR #1-3 dulu, baru fix ERROR #4.
