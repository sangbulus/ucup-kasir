import { defineStore } from 'pinia'
import { ref } from 'vue'
import { hrServiceAdapter } from '@/services'
import type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmployeeWithStats,
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  PayrollComponent,
  PayrollComponentInsert,
  PayrollComponentUpdate,
  PayrollPeriod,
  PayrollPeriodInsert,
  PayrollPeriodUpdate,
  Payroll,
  PayrollSummary,
  EmployeeLoan,
  EmployeeLoanInsert,
  EmployeeLoanUpdate,
  EmployeeLoanPayment,
  EmployeeLoanPaymentInsert,
  KasbonChoice,
  KasbonDeductionResult,
} from '@/types/database'

// ============================================================
// Store: HR & Payroll — Manajemen Karyawan
// - Master: Karyawan (jabatan = teks 'supir' | 'loader')
// - Absensi
// - Komponen Payroll
// - Kasbon (employee_loans)
// - Periode Payroll & Slip Gaji
// ============================================================

export const useHrStore = defineStore('hr', () => {
  // ============================================================
  // State
  // ============================================================
  const employees = ref<Employee[]>([])
  const employeesWithStats = ref<EmployeeWithStats[]>([])
  const attendance = ref<Attendance[]>([])
  const payrollComponents = ref<PayrollComponent[]>([])
  const payrollPeriods = ref<PayrollPeriod[]>([])
  const payrolls = ref<Payroll[]>([])
  const payrollSummary = ref<PayrollSummary[]>([])
  const employeeLoans = ref<EmployeeLoan[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // EMPLOYEES
  // ============================================================

  async function fetchEmployees() {
    loading.value = true
    error.value = null
    try {
      employees.value = await hrServiceAdapter.fetchEmployees()
      return employees.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeesWithStats() {
    loading.value = true
    error.value = null
    try {
      employeesWithStats.value = await hrServiceAdapter.fetchEmployeesWithStats()
      return employeesWithStats.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getEmployee(id: string): Promise<Employee | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getEmployee(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(input: EmployeeInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createEmployee(input)
      employees.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateEmployee(id: string, updates: EmployeeUpdate) {
    loading.value = true
    error.value = null
    const index = employees.value.findIndex((e) => e.id === id)
    const old = index !== -1 ? { ...employees.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateEmployee(id, updates)
      if (index !== -1) employees.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) employees.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteEmployee(id: string) {
    loading.value = true
    error.value = null
    const index = employees.value.findIndex((e) => e.id === id)
    const old = index !== -1 ? { ...employees.value[index] } : null
    try {
      await hrServiceAdapter.deleteEmployee(id)
      employees.value = employees.value.filter((e) => e.id !== id)
      employeesWithStats.value = employeesWithStats.value.filter((e) => e.id !== id)
    } catch (e: any) {
      if (old && index !== -1) employees.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // ATTENDANCE
  // ============================================================

  async function fetchAttendance(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      attendance.value = await hrServiceAdapter.fetchAttendance(startDate, endDate)
      return attendance.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAttendance(input: AttendanceInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createAttendance(input)
      attendance.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAttendance(id: string, updates: AttendanceUpdate) {
    loading.value = true
    error.value = null
    const index = attendance.value.findIndex((a) => a.id === id)
    const old = index !== -1 ? { ...attendance.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateAttendance(id, updates)
      if (index !== -1) attendance.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) attendance.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteAttendance(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deleteAttendance(id)
      attendance.value = attendance.value.filter((a) => a.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function bulkCreateAttendance(records: AttendanceInsert[]) {
    loading.value = true
    error.value = null
    try {
      const count = await hrServiceAdapter.bulkCreateAttendance(records)
      return count
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PAYROLL COMPONENTS
  // ============================================================

  async function fetchPayrollComponents() {
    loading.value = true
    error.value = null
    try {
      payrollComponents.value = await hrServiceAdapter.fetchPayrollComponents()
      return payrollComponents.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPayrollComponent(input: PayrollComponentInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPayrollComponent(input)
      // Ambil ulang agar field join (position/employee untuk kolom "Berlaku") terisi
      await fetchPayrollComponents()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePayrollComponent(id: string, updates: PayrollComponentUpdate) {
    loading.value = true
    error.value = null
    try {
      const updated = await hrServiceAdapter.updatePayrollComponent(id, updates)
      // Ambil ulang agar field join (position/employee untuk kolom "Berlaku") terisi
      await fetchPayrollComponents()
      return updated
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePayrollComponent(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deletePayrollComponent(id)
      payrollComponents.value = payrollComponents.value.filter((c) => c.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // PAYROLL PERIODS & PAYROLLS
  // ============================================================

  async function fetchPayrollPeriods() {
    loading.value = true
    error.value = null
    try {
      payrollPeriods.value = await hrServiceAdapter.fetchPayrollPeriods()
      return payrollPeriods.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getPayrollPeriod(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createPayrollPeriod(input: PayrollPeriodInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPayrollPeriod(input)
      payrollPeriods.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePayrollPeriod(id: string, updates: PayrollPeriodUpdate) {
    loading.value = true
    error.value = null
    const index = payrollPeriods.value.findIndex((p) => p.id === id)
    const old = index !== -1 ? { ...payrollPeriods.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updatePayrollPeriod(id, updates)
      if (index !== -1) payrollPeriods.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) payrollPeriods.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePayrollPeriod(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deletePayrollPeriod(id)
      payrollPeriods.value = payrollPeriods.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchPayrolls(periodId: string) {
    loading.value = true
    error.value = null
    try {
      payrolls.value = await hrServiceAdapter.fetchPayrolls(periodId)
      return payrolls.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getPayroll(id: string): Promise<Payroll | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getPayroll(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function generatePayroll(periodId: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.generatePayroll(periodId)
      // RPC generate_payroll mengembalikan baris mentah tanpa join
      // (tanpa nama karyawan & rincian item). Ambil ulang lewat
      // fetchPayrolls agar slip langsung tampil lengkap.
      payrolls.value = await hrServiceAdapter.fetchPayrolls(periodId)
      // Refresh summary periode
      await fetchPayrollPeriods()
      return payrolls.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function postPayrollJournal(periodId: string): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const journalId = await hrServiceAdapter.postPayrollJournal(periodId)
      // Update status lokal
      const index = payrollPeriods.value.findIndex((p) => p.id === periodId)
      if (index !== -1) {
        payrollPeriods.value[index].status = 'paid'
        payrollPeriods.value[index].paid_at = new Date().toISOString()
      }
      // Hanya slip milik periode ini yang berubah status — jangan sentuh slip periode lain
      payrolls.value = payrolls.value.map((p) =>
        p.period_id === periodId ? { ...p, status: 'paid' as const } : p
      )
      return journalId
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePayroll(id: string) {
    loading.value = true
    error.value = null
    try {
      await hrServiceAdapter.deletePayroll(id)
      payrolls.value = payrolls.value.filter((p) => p.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchPayrollSummary() {
    loading.value = true
    error.value = null
    try {
      payrollSummary.value = await hrServiceAdapter.getPayrollSummary()
      return payrollSummary.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // EMPLOYEE LOANS (KASBON)
  // ============================================================

  async function fetchEmployeeLoans() {
    loading.value = true
    error.value = null
    try {
      employeeLoans.value = await hrServiceAdapter.fetchEmployeeLoans()
      return employeeLoans.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getEmployeeLoan(id: string): Promise<EmployeeLoan | null> {
    loading.value = true
    error.value = null
    try {
      return await hrServiceAdapter.getEmployeeLoan(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createEmployeeLoan(input: EmployeeLoanInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createEmployeeLoan(input)
      employeeLoans.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateEmployeeLoan(id: string, updates: EmployeeLoanUpdate) {
    loading.value = true
    error.value = null
    const index = employeeLoans.value.findIndex((l) => l.id === id)
    const old = index !== -1 ? { ...employeeLoans.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updateEmployeeLoan(id, updates)
      if (index !== -1) employeeLoans.value[index] = updated
      return updated
    } catch (e: any) {
      if (old && index !== -1) employeeLoans.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteEmployeeLoan(id: string) {
    loading.value = true
    error.value = null
    const index = employeeLoans.value.findIndex((l) => l.id === id)
    const old = index !== -1 ? { ...employeeLoans.value[index] } : null
    try {
      await hrServiceAdapter.deleteEmployeeLoan(id)
      employeeLoans.value = employeeLoans.value.filter((l) => l.id !== id)
    } catch (e: any) {
      if (old && index !== -1) employeeLoans.value[index] = old
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createLoanPayment(input: EmployeeLoanPaymentInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createLoanPayment(input)
      // Refresh loan untuk update remaining_amount
      await fetchEmployeeLoans()
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Potong kasbon dari payroll periode yang sudah digenerate (RPC).
   *  choices: { "<employee_id>": 'all' | 'half' | 'none' | "<nominal>" } */
  async function applyKasbonDeductions(
    periodId: string,
    choices: Record<string, KasbonChoice>
  ): Promise<KasbonDeductionResult> {
    loading.value = true
    error.value = null
    try {
      const result = await hrServiceAdapter.applyKasbonDeductions(periodId, choices)
      // Slip berubah (deduction & net) + sisa kasbon berubah → refresh keduanya
      payrolls.value = await hrServiceAdapter.fetchPayrolls(periodId)
      await fetchPayrollPeriods()
      await fetchEmployeeLoans()
      return result
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    employees,
    employeesWithStats,
    attendance,
    payrollComponents,
    payrollPeriods,
    payrolls,
    payrollSummary,
    employeeLoans,
    loading,
    error,
    fetchEmployees,
    fetchEmployeesWithStats,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    fetchAttendance,
    createAttendance,
    updateAttendance,
    deleteAttendance,
    bulkCreateAttendance,
    fetchPayrollComponents,
    createPayrollComponent,
    updatePayrollComponent,
    deletePayrollComponent,
    fetchPayrollPeriods,
    getPayrollPeriod,
    createPayrollPeriod,
    updatePayrollPeriod,
    deletePayrollPeriod,
    fetchPayrolls,
    getPayroll,
    deletePayroll,
    generatePayroll,
    postPayrollJournal,
    fetchPayrollSummary,
    fetchEmployeeLoans,
    getEmployeeLoan,
    createEmployeeLoan,
    updateEmployeeLoan,
    deleteEmployeeLoan,
    createLoanPayment,
    applyKasbonDeductions,
  }
})