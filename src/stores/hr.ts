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
  Payroll,
  PayrollInsert,
  PayrollUpdate,
  EmployeeLoan,
  EmployeeLoanInsert,
  EmployeeLoanUpdate,
  EmployeeLoanPayment,
  EmployeeLoanPaymentInsert,
} from '@/types/database'

// ============================================================
// Store: HR & Payroll — Manajemen Karyawan
// - Master: Karyawan (jabatan = teks 'supir' | 'loader')
// - Absensi
// - Komponen Payroll
// - Kasbon (employee_loans)
// - Payroll per-karyawan (periode individual)
// ============================================================

export const useHrStore = defineStore('hr', () => {
  // ============================================================
  // State
  // ============================================================
  const employees = ref<Employee[]>([])
  const employeesWithStats = ref<EmployeeWithStats[]>([])
  const attendance = ref<Attendance[]>([])
  const payrollComponents = ref<PayrollComponent[]>([])
  const payrolls = ref<Payroll[]>([])
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
  // PAYROLLS (Per-Karyawan dengan Periode Individual)
  // ============================================================

  async function fetchPayrolls(employeeId?: string) {
    loading.value = true
    error.value = null
    try {
      payrolls.value = await hrServiceAdapter.fetchPayrolls(employeeId)
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

  async function createPayroll(input: PayrollInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await hrServiceAdapter.createPayroll(input)
      payrolls.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePayroll(id: string, updates: PayrollUpdate) {
    loading.value = true
    error.value = null
    const index = payrolls.value.findIndex((p) => p.id === id)
    const old = index !== -1 ? { ...payrolls.value[index] } : null
    try {
      const updated = await hrServiceAdapter.updatePayroll(id, updates)
      if (index !== -1) payrolls.value[index] = updated
      return updated
    } catch (e: any) {
      error.value = e.message
      if (old && index !== -1) payrolls.value[index] = old
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

  async function postPayrollJournal(payrollId: string) {
    loading.value = true
    error.value = null
    try {
      const journalId = await hrServiceAdapter.postPayrollJournal(payrollId)
      // Update status payroll jadi paid
      const index = payrolls.value.findIndex((p) => p.id === payrollId)
      if (index !== -1) {
        payrolls.value[index] = { ...payrolls.value[index], status: 'paid' }
      }
      return journalId
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }

  // ============================================================
  // EMPLOYEE LOANS (KASBON)
  // ============================================================
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

  return {
    employees,
    employeesWithStats,
    attendance,
    payrollComponents,
    payrolls,
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
    fetchPayrolls,
    getPayroll,
    createPayroll,
    updatePayroll,
    deletePayroll,
    postPayrollJournal,
    fetchEmployeeLoans,
    getEmployeeLoan,
    createEmployeeLoan,
    updateEmployeeLoan,
    deleteEmployeeLoan,
    createLoanPayment,
  }
})