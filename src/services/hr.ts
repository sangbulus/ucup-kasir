import { supabase } from '@/lib/supabase'
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
// Service: HR & Payroll (Supabase)
// - Master: Karyawan (jabatan = teks 'supir' | 'loader', tanpa tabel)
// - Absensi
// - Komponen Payroll
// - Kasbon (employee_loans) + potongan otomatis saat payroll
// - Payroll Period & Slip Gaji (via RPC generate_payroll / apply_kasbon_deductions / post_payroll_journal)
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

  /** Karyawan dengan statistik absensi */
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

  /** Absensi bulk untuk satu karyawan (isian bulanan) */
  async bulkCreateAttendance(records: AttendanceInsert[]): Promise<number> {
    let count = 0
    for (const r of records) {
      try {
        await this.createAttendance(r)
        count++
      } catch {
        // Skip duplicate
      }
    }
    return count
  },

  // ============================================================
  // PAYROLL COMPONENTS
  // ============================================================

  async fetchPayrollComponents(): Promise<PayrollComponent[]> {
    const { data, error } = await supabase
      .from('payroll_components')
      .select('*, employee:employees(name)')
      .order('type')
      .order('name')
    if (error) throw error
    return (data || []) as PayrollComponent[]
  },

  async createPayrollComponent(input: PayrollComponentInsert): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PayrollComponent
  },

  async updatePayrollComponent(id: string, updates: PayrollComponentUpdate): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PayrollComponent
  },

  async deletePayrollComponent(id: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ============================================================
  // PAYROLL PERIODS & PAYROLLS
  // ============================================================

  async fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
    if (error) throw error
    return (data || []) as PayrollPeriod[]
  },

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async createPayrollPeriod(input: PayrollPeriodInsert): Promise<PayrollPeriod> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async updatePayrollPeriod(id: string, updates: PayrollPeriodUpdate): Promise<PayrollPeriod> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PayrollPeriod
  },

  async deletePayrollPeriod(id: string): Promise<void> {
    const { error } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async deletePayroll(id: string): Promise<void> {
    const { error } = await supabase
      .from('payrolls')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  /** Payroll (slip gaji) per periode */
  async fetchPayrolls(periodId: string): Promise<Payroll[]> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, items:payroll_items(*), employee:employees(name, employee_code, position, bank_name, bank_account_number, bank_account_name)')
      .eq('period_id', periodId)
      .order('created_at')
    if (error) throw error
    return (data || []) as Payroll[]
  },

  async getPayroll(id: string): Promise<Payroll | null> {
    const { data, error } = await supabase
      .from('payrolls')
      .select('*, items:payroll_items(*), employee:employees(name, employee_code, position, bank_name, bank_account_number, bank_account_name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Payroll
  },

  /** Generate payroll via RPC */
  async generatePayroll(periodId: string): Promise<Payroll[]> {
    const { data, error } = await supabase.rpc('generate_payroll', {
      p_period_id: periodId,
    })
    if (error) throw error
    return (data || []) as Payroll[]
  },

  /** Post payroll journal via RPC (auto-jurnal ke finance) */
  async postPayrollJournal(periodId: string): Promise<string> {
    const { data, error } = await supabase.rpc('post_payroll_journal', {
      p_period_id: periodId,
    })
    if (error) throw error
    return data as string
  },

  /** Terapkan potongan kasbon ke payroll periode (RPC).
   *  p_choices: { "<employee_id>": 'all' | 'half' | 'none' | "<nominal>" } */
  async applyKasbonDeductions(periodId: string, choices: Record<string, KasbonChoice>): Promise<KasbonDeductionResult> {
    const { data, error } = await supabase.rpc('apply_kasbon_deductions', {
      p_period_id: periodId,
      p_choices: choices,
    })
    if (error) throw error
    return (data || { applied_count: 0, applied_amount: 0 }) as KasbonDeductionResult
  },

  /** Summary payroll untuk dashboard */
  async getPayrollSummary(): Promise<PayrollSummary[]> {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('id, period_code, total_employee, total_gross, total_deduction, total_net')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12)
    if (error) throw error
    return (data || []).map((r) => ({
      period_id: r.id,
      period_code: r.period_code,
      employee_count: Number(r.total_employee) || 0,
      total_gross: Number(r.total_gross) || 0,
      total_deduction: Number(r.total_deduction) || 0,
      total_net: Number(r.total_net) || 0,
    }))
  },

  // ============================================================
  // EMPLOYEE LOANS (KASBON)
  // ============================================================

  async fetchEmployeeLoans(): Promise<EmployeeLoan[]> {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*, employee:employees(id, name, employee_code, position), payments:employee_loan_payments(*)')
      .order('loan_date', { ascending: false })
    if (error) throw error
    return (data || []) as EmployeeLoan[]
  },

  async getEmployeeLoan(id: string): Promise<EmployeeLoan | null> {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*, employee:employees(id, name, employee_code, position), payments:employee_loan_payments(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as EmployeeLoan
  },

  async createEmployeeLoan(input: EmployeeLoanInsert): Promise<EmployeeLoan> {
    // remaining_amount selalu disamakan dengan amount saat awal (lunas dicicil via payment)
    const { data, error } = await supabase
      .from('employee_loans')
      .insert({ ...input, remaining_amount: input.amount })
      .select('*, employee:employees(id, name, employee_code, position)')
      .single()
    if (error) throw error
    return data as EmployeeLoan
  },

  async updateEmployeeLoan(id: string, updates: EmployeeLoanUpdate): Promise<EmployeeLoan> {
    const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() }
    // amount diubah → sisa ikut digeser agar selisih pembayaran tetap valid
    if (updates.amount !== undefined && updates.remaining_amount === undefined) {
      const existing = await this.getEmployeeLoan(id)
      if (existing) {
        const paid = Number(existing.amount) - Number(existing.remaining_amount)
        payload.remaining_amount = Math.max(0, Number(updates.amount) - paid)
        if (payload.status === undefined) {
          payload.status = payload.remaining_amount <= 0 ? 'paid' : 'active'
        }
      }
    }
    const { data, error } = await supabase
      .from('employee_loans')
      .update(payload)
      .eq('id', id)
      .select('*, employee:employees(id, name, employee_code, position)')
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