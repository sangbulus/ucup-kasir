import { supabase } from '@/lib/supabase'
import type {
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmployeeWithStats,
  Attendance,
  AttendanceInsert,
  AttendanceUpdate,
  Payroll,
  EmployeeLoan,
  EmployeeLoanInsert,
  EmployeeLoanUpdate,
  EmployeeLoanPayment,
  EmployeeLoanPaymentInsert,
} from '@/types/database'

// ============================================================
// Service: HR & Payroll (Supabase) - Sistem Baru
// - Master: Karyawan (jabatan = teks 'supir' | 'loader')
// - Absensi
// - Payroll per-karyawan (via RPC generate_payroll_for_employee)
// - Kasbon (employee_loans) dengan potongan manual di payroll
// ============================================================

export const hrService = {
  // ============================================================
  // EMPLOYEES
  // ============================================================

  async fetchEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as Employee[]
  },

  async getEmployee(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Employee
  },

  async createEmployee(input: EmployeeInsert): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Employee
  },

  async updateEmployee(id: string, updates: EmployeeUpdate): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Employee
  },

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Karyawan dengan statistik absensi bulan ini */
  async fetchEmployeesWithStats(): Promise<EmployeeWithStats[]> {
    const employees = await this.fetchEmployees()
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { data: attRows, error: attErr } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .gte('attendance_date', currentMonth + '-01')
    if (attErr) throw attErr

    const totalByEmp = new Map<string, number>()
    const absenceByEmp = new Map<string, number>()
    for (const r of (attRows || [])) {
      const eId = r.employee_id as string
      totalByEmp.set(eId, (totalByEmp.get(eId) || 0) + 1)
      if (r.status === 'alpa') {
        absenceByEmp.set(eId, (absenceByEmp.get(eId) || 0) + 1)
      }
    }

    return employees.map((e) => ({
      ...e,
      total_attendance: totalByEmp.get(e.id) || 0,
      total_absences: absenceByEmp.get(e.id) || 0,
    }))
  },

  // ============================================================
  // ATTENDANCE
  // ============================================================

  async fetchAttendance(startDate?: string, endDate?: string): Promise<Attendance[]> {
    let query = supabase
      .from('attendance')
      .select('*, employee:employees(name, employee_code)')
      .order('attendance_date', { ascending: false })

    if (startDate) query = query.gte('attendance_date', startDate)
    if (endDate) query = query.lte('attendance_date', endDate)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Attendance[]
  },

  async getAttendance(id: string): Promise<Attendance | null> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, employee:employees(name, employee_code)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Attendance
  },

  async createAttendance(input: AttendanceInsert): Promise<Attendance> {
    const { data, error } = await supabase
      .from('attendance')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Attendance
  },

  async updateAttendance(id: string, updates: AttendanceUpdate): Promise<Attendance> {
    const { data, error } = await supabase
      .from('attendance')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Attendance
  },

  async deleteAttendance(id: string): Promise<void> {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async bulkCreateAttendance(records: AttendanceInsert[]): Promise<number> {
    const { error } = await supabase
      .from('attendance')
      .insert(records)
    if (error) throw error
    return records.length
  },

  // ============================================================
  // PAYROLLS (Per-Karyawan dengan Periode Individual)
  // - Sistem baru: tidak ada payroll_periods & payroll_components
  // - Generate per karyawan dengan range tanggal custom
  // - Potongan kasbon manual input
  // ============================================================

  /** Payroll (slip gaji) semua karyawan atau per karyawan */
  async fetchPayrolls(employeeId?: string): Promise<Payroll[]> {
    let query = supabase
      .from('payrolls')
      .select('*, employee:employees(name, employee_code, position)')
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Payroll[]
  },

  async getPayroll(id: string): Promise<Payroll | null> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, employee:employees(name, employee_code, position)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Payroll
  },

  /**
   * Generate payroll untuk 1 karyawan via RPC
   * Backend akan auto-hitung base_salary, incentive dari surat jalan
   */
  async generatePayroll(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    kasbonDeduction: number = 0
  ): Promise<Payroll> {
    const { data, error } = await supabase.rpc('generate_payroll_for_employee', {
      p_employee_id: employeeId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_kasbon_deduction: kasbonDeduction,
    })
    if (error) throw error
    
    // Fetch ulang untuk join employee
    return this.getPayroll(data.id) as Promise<Payroll>
  },

  async updatePayroll(id: string, updates: Partial<Payroll>): Promise<Payroll> {
    const { data, error } = await supabase
      .from('payrolls')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, employee:employees(name, employee_code, position)')
      .single()
    if (error) throw error
    return data as Payroll
  },

  /** Post payroll journal via RPC (auto-jurnal ke finance) */
  async postPayrollJournal(payrollId: string): Promise<Payroll> {
    const { data, error } = await supabase.rpc('post_payroll_journal', {
      p_payroll_id: payrollId,
    })
    if (error) throw error
    
    // Fetch ulang untuk join employee (consistent dengan generatePayroll)
    return this.getPayroll(data.id) as Promise<Payroll>
  },

  /** Delete payroll via RPC (akan hapus jurnal juga jika ada) */
  async deletePayroll(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_payroll', {
      p_payroll_id: id,
    })
    if (error) throw error
  },

  // ============================================================
  // EMPLOYEE LOANS (KASBON)
  // ============================================================

  async fetchEmployeeLoans(): Promise<EmployeeLoan[]> {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*, employee:employees(name, employee_code), payments:employee_loan_payments(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as EmployeeLoan[]
  },

  async getEmployeeLoan(id: string): Promise<EmployeeLoan | null> {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*, employee:employees(name, employee_code), payments:employee_loan_payments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as EmployeeLoan
  },

  async createEmployeeLoan(input: EmployeeLoanInsert): Promise<EmployeeLoan> {
    const { data, error } = await supabase
      .from('employee_loans')
      .insert(input)
      .select('*, employee:employees(name, employee_code)')
      .single()
    if (error) throw error
    return data as EmployeeLoan
  },

  async updateEmployeeLoan(id: string, updates: EmployeeLoanUpdate): Promise<EmployeeLoan> {
    const { data, error } = await supabase
      .from('employee_loans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, employee:employees(name, employee_code)')
      .single()
    if (error) throw error
    return data as EmployeeLoan
  },

  async deleteEmployeeLoan(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_loans')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async createLoanPayment(input: EmployeeLoanPaymentInsert): Promise<EmployeeLoanPayment> {
    const { data, error } = await supabase
      .from('employee_loan_payments')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as EmployeeLoanPayment
  },
}
