import React, { useState } from 'react';
import { 
  Users, UserPlus, DollarSign, Calendar, FileText, CheckCircle2, 
  Clock, AlertCircle, Search, Filter, Download, Plus, Edit2, Trash2, 
  Briefcase, Building2, Phone, Mail, Award, ArrowUpRight, ArrowDownRight,
  Printer, Check, X, ShieldAlert, CreditCard, ChevronRight, Eye, RefreshCw, Send, Lock, Bell, UserCheck, Receipt,
  TrendingDown, PieChart, AlertTriangle, ShieldCheck, Activity, Scale, HelpCircle, Shield, RotateCcw
} from 'lucide-react';
import { 
  Employee, SalaryAdvance, PayrollRecord, AttendanceRecord, AppUser 
} from '../types';
import { 
  loadEmployees, saveEmployees, 
  loadSalaryAdvances, saveSalaryAdvances, 
  loadPayrollRecords, savePayrollRecords, 
  loadAttendanceRecords, saveAttendanceRecords,
  loadExpenses, loadOrders, addCashMovement,
  addAuditLog
} from '../lib/storage';
import { formatCurrency } from '../lib/currency';
import { exportGenericPDF, exportGenericExcel } from '../lib/exporter';
import { checkAndTriggerFirstOfMonthPayrollAlert } from '../lib/employeeChargeSystem';

interface HRManagementProps {
  loggedInUser?: AppUser;
  darkMode: boolean;
}

type HRSubTab = 'employees' | 'payroll' | 'advances' | 'attendance' | 'loss_diagnostics' | 'staff_liabilities';

const DEPARTMENTS = [
  'Bar', 
  'Kitchen', 
  'Service / Waiters', 
  'Reception', 
  'Housekeeping', 
  'Accounting', 
  'Management', 
  'Security', 
  'Maintenance'
] as const;

export const HRManagement: React.FC<HRManagementProps> = ({ loggedInUser, darkMode }) => {
  const [activeTab, setActiveTab] = useState<HRSubTab>('employees');
  
  // Storage State
  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployees());
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(() => loadSalaryAdvances());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => loadPayrollRecords());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => loadAttendanceRecords());

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');

  // Trigger 1st of month check on load
  React.useEffect(() => {
    checkAndTriggerFirstOfMonthPayrollAlert(false);
  }, []);

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  const [payingPayrollRecord, setPayingPayrollRecord] = useState<PayrollRecord | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'Bank Transfer' | 'Mobile Money' | 'Cash'>('Bank Transfer');
  const [payoutRef, setPayoutRef] = useState('');

  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  // New Employee Form State
  const [empForm, setEmpForm] = useState({
    fullName: '',
    department: 'Bar' as Employee['department'],
    role: '',
    phone: '',
    email: '',
    nationalId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full-time' as Employee['employmentType'],
    basicSalary: 300000,
    housingAllowance: 30000,
    transportAllowance: 20000,
    otherBonus: 10000,
    pensionRate: 3,
    taxRate: 5,
    bankName: 'BK (Bank of Kigali)',
    bankAccount: '',
    mobileMoneyNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // State update helpers
  const updateEmployees = (newEmps: Employee[]) => {
    setEmployees(newEmps);
    saveEmployees(newEmps);
  };

  const updateAdvances = (newAdv: SalaryAdvance[]) => {
    setSalaryAdvances(newAdv);
    saveSalaryAdvances(newAdv);
  };

  const updatePayroll = (newPay: PayrollRecord[]) => {
    setPayrollRecords(newPay);
    savePayrollRecords(newPay);
  };

  const updateAttendance = (newAtt: AttendanceRecord[]) => {
    setAttendanceRecords(newAtt);
    saveAttendanceRecords(newAtt);
  };

  // Metric Calculations
  const activeEmployees = employees.filter(e => e.status === 'Active');
  const totalBaseSalaryBill = activeEmployees.reduce((sum, e) => sum + e.basicSalary, 0);
  
  const currentMonthAdvances = salaryAdvances.filter(a => a.month === selectedMonth && a.status === 'Approved');
  const totalAdvancesDisbursed = currentMonthAdvances.reduce((sum, a) => sum + a.amount, 0);

  const currentMonthPayroll = payrollRecords.filter(p => p.payrollPeriod === selectedMonth);
  const totalGrossPayroll = currentMonthPayroll.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNetPayroll = currentMonthPayroll.reduce((sum, p) => sum + p.netSalary, 0);
  const totalPaidPayroll = currentMonthPayroll.filter(p => p.paymentStatus === 'Paid').reduce((sum, p) => sum + p.netSalary, 0);

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone.includes(searchTerm) ||
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  // Employee Handlers
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.fullName || !empForm.role || !empForm.phone) {
      alert('Please fill in Employee Name, Role, and Phone number.');
      return;
    }

    if (editingEmployee) {
      const updated = employees.map(emp => emp.id === editingEmployee.id ? {
        ...emp,
        fullName: empForm.fullName,
        department: empForm.department,
        role: empForm.role,
        phone: empForm.phone,
        email: empForm.email,
        nationalId: empForm.nationalId,
        joiningDate: empForm.joiningDate,
        employmentType: empForm.employmentType,
        basicSalary: Number(empForm.basicSalary) || 0,
        housingAllowance: Number(empForm.housingAllowance) || 0,
        transportAllowance: Number(empForm.transportAllowance) || 0,
        otherBonus: Number(empForm.otherBonus) || 0,
        pensionRate: Number(empForm.pensionRate) || 0,
        taxRate: Number(empForm.taxRate) || 0,
        bankName: empForm.bankName,
        bankAccount: empForm.bankAccount,
        mobileMoneyNumber: empForm.mobileMoneyNumber,
        emergencyContactName: empForm.emergencyContactName,
        emergencyContactPhone: empForm.emergencyContactPhone
      } : emp);

      updateEmployees(updated);
      addAuditLog({
        userId: loggedInUser?.id || 'admin',
        userName: loggedInUser?.fullName || 'HR Manager',
        userRole: loggedInUser?.role || 'Manager',
        userEmail: loggedInUser?.email || '',
        action: 'UPDATE_EMPLOYEE',
        category: 'User Management',
        details: `Updated employee profile for ${empForm.fullName} (${editingEmployee.employeeId})`
      });
      setEditingEmployee(null);
    } else {
      const newEmpId = `EMP-${1000 + employees.length + 1}`;
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        employeeId: newEmpId,
        fullName: empForm.fullName,
        department: empForm.department,
        role: empForm.role,
        phone: empForm.phone,
        email: empForm.email,
        nationalId: empForm.nationalId,
        joiningDate: empForm.joiningDate,
        employmentType: empForm.employmentType,
        status: 'Active',
        basicSalary: Number(empForm.basicSalary) || 0,
        housingAllowance: Number(empForm.housingAllowance) || 0,
        transportAllowance: Number(empForm.transportAllowance) || 0,
        otherBonus: Number(empForm.otherBonus) || 0,
        pensionRate: Number(empForm.pensionRate) || 0,
        taxRate: Number(empForm.taxRate) || 0,
        bankName: empForm.bankName,
        bankAccount: empForm.bankAccount,
        mobileMoneyNumber: empForm.mobileMoneyNumber,
        emergencyContactName: empForm.emergencyContactName,
        emergencyContactPhone: empForm.emergencyContactPhone,
        createdAt: new Date().toISOString()
      };

      updateEmployees([newEmp, ...employees]);
      addAuditLog({
        userId: loggedInUser?.id || 'admin',
        userName: loggedInUser?.fullName || 'HR Manager',
        userRole: loggedInUser?.role || 'Manager',
        userEmail: loggedInUser?.email || '',
        action: 'CREATE_EMPLOYEE',
        category: 'User Management',
        details: `Created new employee record: ${newEmp.fullName} (${newEmp.employeeId})`
      });
    }

    setShowAddEmployeeModal(false);
    resetEmpForm();
  };

  const resetEmpForm = () => {
    setEmpForm({
      fullName: '',
      department: 'Bar',
      role: '',
      phone: '',
      email: '',
      nationalId: '',
      joiningDate: new Date().toISOString().split('T')[0],
      employmentType: 'Full-time',
      basicSalary: 300000,
      housingAllowance: 30000,
      transportAllowance: 20000,
      otherBonus: 10000,
      pensionRate: 3,
      taxRate: 5,
      bankName: 'BK (Bank of Kigali)',
      bankAccount: '',
      mobileMoneyNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    });
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      fullName: emp.fullName,
      department: emp.department,
      role: emp.role,
      phone: emp.phone,
      email: emp.email || '',
      nationalId: emp.nationalId || '',
      joiningDate: emp.joiningDate,
      employmentType: emp.employmentType,
      basicSalary: emp.basicSalary,
      housingAllowance: emp.housingAllowance || 0,
      transportAllowance: emp.transportAllowance || 0,
      otherBonus: emp.otherBonus || 0,
      pensionRate: emp.pensionRate || 0,
      taxRate: emp.taxRate || 0,
      bankName: emp.bankName || 'BK (Bank of Kigali)',
      bankAccount: emp.bankAccount || '',
      mobileMoneyNumber: emp.mobileMoneyNumber || '',
      emergencyContactName: emp.emergencyContactName || '',
      emergencyContactPhone: emp.emergencyContactPhone || ''
    });
    setShowAddEmployeeModal(true);
  };

  const handleToggleStatus = (emp: Employee) => {
    const nextStatus = emp.status === 'Active' ? 'On Leave' : emp.status === 'On Leave' ? 'Suspended' : 'Active';
    const updated = employees.map(e => e.id === emp.id ? { ...e, status: nextStatus as Employee['status'] } : e);
    updateEmployees(updated);
  };

  const handleDeleteEmployee = (emp: Employee) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete employee "${emp.fullName}" (${emp.employeeId})?\n\nThis will remove their profile and all associated HR records permanently from the system.`)) {
      const updatedEmps = employees.filter(e => e.id !== emp.id);
      updateEmployees(updatedEmps);

      // Clean up associated advances, payroll, and attendance records
      const updatedAdvances = salaryAdvances.filter(a => a.employeeId !== emp.id);
      if (updatedAdvances.length !== salaryAdvances.length) {
        updateAdvances(updatedAdvances);
      }
      const updatedPayroll = payrollRecords.filter(p => p.employeeId !== emp.id);
      if (updatedPayroll.length !== payrollRecords.length) {
        updatePayroll(updatedPayroll);
      }
      const updatedAttendance = attendanceRecords.filter(att => att.employeeId !== emp.id);
      if (updatedAttendance.length !== attendanceRecords.length) {
        updateAttendance(updatedAttendance);
      }

      addAuditLog({
        userId: loggedInUser?.id || 'admin',
        userName: loggedInUser?.fullName || 'HR Manager',
        userRole: loggedInUser?.role || 'Manager',
        userEmail: loggedInUser?.email || '',
        action: 'DELETE_EMPLOYEE',
        category: 'User Management',
        details: `Permanently deleted employee record for ${emp.fullName} (${emp.employeeId})`
      });

      if (viewingEmployee?.id === emp.id) {
        setViewingEmployee(null);
      }
    }
  };

  const handleClearDemoEmployees = () => {
    if (window.confirm('Are you sure you want to PERMANENTLY remove all demo employee profiles and reset to an empty staff directory?\n\nThis allows you to register your actual real-world staff from scratch.')) {
      updateEmployees([]);
      updateAdvances([]);
      updatePayroll([]);
      updateAttendance([]);
      addAuditLog({
        userId: loggedInUser?.id || 'admin',
        userName: loggedInUser?.fullName || 'HR Manager',
        userRole: loggedInUser?.role || 'Manager',
        userEmail: loggedInUser?.email || '',
        action: 'CLEAR_ALL_DEMO_EMPLOYEES',
        category: 'User Management',
        details: 'Cleared all demo employee profiles to start with a fresh staff directory'
      });
      alert('All demo employee profiles have been permanently removed.');
    }
  };

  // Salary Advance Handlers
  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceEmployeeId || !advanceAmount || Number(advanceAmount) <= 0) {
      alert('Please select an employee and enter a valid advance amount.');
      return;
    }

    const emp = employees.find(e => e.id === advanceEmployeeId);
    if (!emp) return;

    const newAdvance: SalaryAdvance = {
      id: `adv-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department,
      amount: Number(advanceAmount),
      reason: advanceReason || 'Personal Advance Request',
      month: selectedMonth,
      requestDate: new Date().toISOString(),
      status: 'Approved',
      approvedBy: loggedInUser?.fullName || 'HR Manager',
      paidAt: new Date().toISOString()
    };

    updateAdvances([newAdvance, ...salaryAdvances]);
    addAuditLog({
      userId: loggedInUser?.id || 'admin',
      userName: loggedInUser?.fullName || 'HR Manager',
      userRole: loggedInUser?.role || 'Manager',
      userEmail: loggedInUser?.email || '',
      action: 'DISBURSE_SALARY_ADVANCE',
      category: 'Sales',
      details: `Disbursed salary advance of ${formatCurrency(Number(advanceAmount))} to ${emp.fullName}`
    });

    setShowAdvanceModal(false);
    setAdvanceEmployeeId('');
    setAdvanceAmount('');
    setAdvanceReason('');
  };

  // Payroll Run Handler
  const handleGeneratePayrollRun = () => {
    const newRecords: PayrollRecord[] = activeEmployees.map(emp => {
      // Find advances for selected month
      const empAdvances = salaryAdvances.filter(a => a.employeeId === emp.id && a.month === selectedMonth && a.status === 'Approved');
      const advanceDeduction = empAdvances.reduce((sum, a) => sum + a.amount, 0);

      const housing = emp.housingAllowance || 0;
      const transport = emp.transportAllowance || 0;
      const bonus = emp.otherBonus || 0;
      const gross = emp.basicSalary + housing + transport + bonus;

      const rssb = Math.round(emp.basicSalary * ((emp.pensionRate || 3) / 100));
      const paye = Math.round(emp.basicSalary * ((emp.taxRate || 5) / 100));
      const totalDed = rssb + paye + advanceDeduction + (emp.otherDeductions || 0);
      const net = Math.max(0, gross - totalDed);

      // Preserve existing payment status if already created
      const existing = payrollRecords.find(p => p.employeeId === emp.id && p.payrollPeriod === selectedMonth);

      return {
        id: existing ? existing.id : `pay-${selectedMonth}-${emp.id}`,
        payrollPeriod: selectedMonth,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        role: emp.role,
        basicSalary: emp.basicSalary,
        housingAllowance: housing,
        transportAllowance: transport,
        overtimePay: existing ? existing.overtimePay : 0,
        bonus,
        grossSalary: gross,
        rssbPension: rssb,
        payeTax: paye,
        salaryAdvanceDeduction: advanceDeduction,
        otherDeductions: emp.otherDeductions || 0,
        totalDeductions: totalDed,
        netSalary: net,
        paymentStatus: existing ? existing.paymentStatus : 'Unpaid',
        paymentMethod: existing ? existing.paymentMethod : 'Bank Transfer',
        paymentReference: existing ? existing.paymentReference : undefined,
        paidAt: existing ? existing.paidAt : undefined,
        processedBy: loggedInUser?.fullName || 'HR Manager'
      };
    });

    // Merge with records from other months
    const otherPeriodRecords = payrollRecords.filter(p => p.payrollPeriod !== selectedMonth);
    updatePayroll([...newRecords, ...otherPeriodRecords]);

    addAuditLog({
      userId: loggedInUser?.id || 'admin',
      userName: loggedInUser?.fullName || 'HR Manager',
      userRole: loggedInUser?.role || 'Manager',
      userEmail: loggedInUser?.email || '',
      action: 'PROCESS_PAYROLL',
      category: 'Reports',
      details: `Generated payroll run for period ${selectedMonth} (${newRecords.length} staff records)`
    });
  };

  const handleConfirmSalaryPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayrollRecord) return;

    const updated = payrollRecords.map(p => p.id === payingPayrollRecord.id ? {
      ...p,
      paymentStatus: 'Paid' as PayrollRecord['paymentStatus'],
      paymentMethod: payoutMethod,
      paymentReference: payoutRef || `${payoutMethod.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`,
      paidAt: new Date().toISOString()
    } : p);

    updatePayroll(updated);
    addAuditLog({
      userId: loggedInUser?.id || 'admin',
      userName: loggedInUser?.fullName || 'HR Manager',
      userRole: loggedInUser?.role || 'Manager',
      userEmail: loggedInUser?.email || '',
      action: 'PAY_SALARY',
      category: 'Sales',
      details: `Paid net salary of ${formatCurrency(payingPayrollRecord.netSalary)} to ${payingPayrollRecord.employeeName} via ${payoutMethod}`
    });

    setPayingPayrollRecord(null);
    setPayoutRef('');
  };

  // Export handlers
  const handleExportPayrollPDF = () => {
    const headers = ['Emp ID', 'Name', 'Dept', 'Basic Salary', 'Allowances', 'Gross Pay', 'Deductions', 'Net Salary', 'Status'];
    const rows = currentMonthPayroll.map(p => [
      p.employeeId,
      p.employeeName,
      p.department,
      formatCurrency(p.basicSalary),
      formatCurrency(p.housingAllowance + p.transportAllowance + p.bonus),
      formatCurrency(p.grossSalary),
      formatCurrency(p.totalDeductions),
      formatCurrency(p.netSalary),
      p.paymentStatus
    ]);

    exportGenericPDF(
      `HOTEL & RESORT HR PAYROLL REPORT (${selectedMonth})`,
      `Generated by: ${loggedInUser?.fullName || 'HR Manager'} on ${new Date().toLocaleDateString()}`,
      headers,
      rows,
      `Payroll_Report_${selectedMonth}`
    );
  };

  const handleExportPayrollExcel = () => {
    const headers = ['Emp ID', 'Name', 'Department', 'Basic Salary', 'Gross Pay', 'RSSB Pension', 'PAYE Tax', 'Salary Advance', 'Total Deductions', 'Net Salary', 'Payment Status', 'Method'];
    const rows = currentMonthPayroll.map(p => [
      p.employeeId,
      p.employeeName,
      p.department,
      p.basicSalary,
      p.grossSalary,
      p.rssbPension,
      p.payeTax,
      p.salaryAdvanceDeduction,
      p.totalDeductions,
      p.netSalary,
      p.paymentStatus,
      p.paymentMethod || 'N/A'
    ]);

    exportGenericExcel(`Payroll_${selectedMonth}`, 'Payroll Records', headers, rows);
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen transition-colors ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                HR & Employee Salary Control Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Manage Staff Contracts, Attendance, Monthly Payroll Run, Payslips & Salary Advances
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              resetEmpForm();
              setEditingEmployee(null);
              setShowAddEmployeeModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>

          <button
            onClick={() => setShowAdvanceModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm flex items-center space-x-2 border border-slate-700 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Grant Salary Advance</span>
          </button>
        </div>
      </div>

      {/* 1st of the Month Automated Payroll & Staff Consumption Notification Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-indigo-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 font-bold shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-amber-500 text-slate-950">
                1st of Month System
              </span>
              <h4 className="text-xs sm:text-sm font-bold">Payroll & Staff Consumption Auto-Deduction Settlement</h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tracks staff food/beverage consumption, pool/sauna guard liabilities, and customer walkout losses from Day 1 and automatically minuses them from net monthly salary.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            checkAndTriggerFirstOfMonthPayrollAlert(true);
            setSalaryAdvances(loadSalaryAdvances());
            alert('1st of the Month Payroll Payment Alert Notification sent! System notifications updated.');
          }}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 shadow-md flex items-center space-x-1.5 cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Trigger 1st Month Alert</span>
        </button>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black">{activeEmployees.length} Staff</p>
          <span className="text-[11px] text-slate-500 font-medium">Across 9 Departments</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base Salary Bill</span>
            <Briefcase className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-sky-500">{formatCurrency(totalBaseSalaryBill)}</p>
          <span className="text-[11px] text-slate-500 font-medium">Monthly Contract Total</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advances Disbursed</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-500">{formatCurrency(totalAdvancesDisbursed)}</p>
          <span className="text-[11px] text-slate-500 font-medium">Month: {selectedMonth}</span>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Salary Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-500">{formatCurrency(totalPaidPayroll)}</p>
          <span className="text-[11px] text-slate-500 font-medium">Paid out of {formatCurrency(totalNetPayroll)}</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex space-x-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'employees', label: `Staff Directory (${employees.length})`, icon: Users },
            { id: 'payroll', label: 'Payroll & Payslips Run', icon: DollarSign },
            { id: 'advances', label: `Salary Advances (${salaryAdvances.length})`, icon: CreditCard },
            { id: 'attendance', label: 'Attendance & Overtime', icon: Clock },
            { id: 'loss_diagnostics', label: 'P&L Loss Diagnostics', icon: PieChart },
            { id: 'staff_liabilities', label: 'Staff Walkout & Debt Recovery', icon: ShieldAlert }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as HRSubTab)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : darkMode
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Month Selector for Payroll & Reports */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-400">Payroll Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* ----------------- TAB 1: EMPLOYEES DIRECTORY ----------------- */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {employees.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearDemoEmployees}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 whitespace-nowrap"
                  title="Permanently remove all demo employee profiles"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Demo Staff</span>
                </button>
              )}
            </div>
          </div>

          {/* Employees Cards Grid or Empty State */}
          {filteredEmployees.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${
              darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No employee records found</p>
              <p className="text-xs mt-1">
                {employees.length === 0
                  ? 'All demo employees have been permanently deleted. Click "Add New Employee" above to register your actual staff.'
                  : 'No employees match your search or department filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${
                    darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black flex items-center justify-center text-sm">
                        {emp.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {emp.fullName}
                        </h3>
                        <span className="text-[11px] font-mono text-amber-500 font-bold">{emp.employeeId}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 border-y border-slate-100 dark:border-slate-800/80 py-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Department:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{emp.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Job Title:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{emp.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{emp.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Basic Monthly Salary:</span>
                      <span className="font-bold text-amber-500">{formatCurrency(emp.basicSalary)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setViewingEmployee(emp)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>

                    <div className="flex space-x-1.5">
                      <button
                        onClick={() => handleEditClick(emp)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Edit Staff Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors cursor-pointer"
                        title="Change Employment Status"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Employee Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: PAYROLL RUN ----------------- */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div>
              <h3 className="font-black text-amber-800 dark:text-amber-400 text-base sm:text-lg">
                Monthly Salary Payroll Console ({selectedMonth})
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                Calculate basic salaries, housing/transport allowances, deductions (RSSB, PAYE, Advances), and generate official payslips.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGeneratePayrollRun}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run / Recalculate Payroll</span>
              </button>

              <button
                onClick={handleExportPayrollPDF}
                className="px-3 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 border border-slate-700 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>PDF</span>
              </button>

              <button
                onClick={handleExportPayrollExcel}
                className="px-3 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 hover:bg-emerald-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Payroll Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-bold uppercase tracking-wider text-slate-400 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Dept</th>
                    <th className="py-3 px-3 text-right">Basic Salary</th>
                    <th className="py-3 px-3 text-right">Allowances</th>
                    <th className="py-3 px-3 text-right">Gross Pay</th>
                    <th className="py-3 px-3 text-right">Advances</th>
                    <th className="py-3 px-3 text-right text-rose-400">Deductions</th>
                    <th className="py-3 px-3 text-right">Net Payable</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {currentMonthPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No payroll record generated for month {selectedMonth}. Click "Run / Recalculate Payroll" above.
                      </td>
                    </tr>
                  ) : (
                    currentMonthPayroll.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{record.employeeName}</div>
                          <span className="text-[10px] font-mono text-amber-500 font-bold">{record.employeeId}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{record.department}</td>
                        <td className="py-3 px-3 text-right font-mono">{formatCurrency(record.basicSalary)}</td>
                        <td className="py-3 px-3 text-right font-mono text-sky-400">
                          +{formatCurrency(record.housingAllowance + record.transportAllowance + record.bonus)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(record.grossSalary)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-500 font-bold">
                          {record.salaryAdvanceDeduction > 0 ? `-${formatCurrency(record.salaryAdvanceDeduction)}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-500">
                          -{formatCurrency(record.totalDeductions)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-500 text-sm">
                          {formatCurrency(record.netSalary)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            record.paymentStatus === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : record.paymentStatus === 'Processing'
                                ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {record.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {record.paymentStatus !== 'Paid' && (
                              <button
                                onClick={() => setPayingPayrollRecord(record)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewingPayslip(record)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Generate Official Payslip"
                            >
                              <FileText className="w-3 h-3 text-amber-500" />
                              <span>Payslip</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: SALARY ADVANCES ----------------- */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-400 text-base">
                Salary Advances & Loans Register ({selectedMonth})
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/80">
                Advances are automatically deducted from the employee's monthly net pay.
              </p>
            </div>

            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Advance</span>
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-bold uppercase tracking-wider text-slate-400 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Dept</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Advance Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {salaryAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No salary advance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    salaryAdvances.map(adv => (
                      <tr key={adv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {new Date(adv.requestDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {adv.employeeName}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{adv.department}</td>
                        <td className="py-3 px-3 text-slate-400 italic">{adv.reason}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-500">
                          {formatCurrency(adv.amount)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {adv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {adv.approvedBy || 'HR Admin'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: ATTENDANCE & OVERTIME ----------------- */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sky-800 dark:text-sky-400 text-base">
                Staff Attendance & Overtime Logs ({selectedMonth})
              </h3>
              <p className="text-xs text-sky-700 dark:text-sky-300/80">
                Track days worked, paid leave, absent records, and overtime hours.
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-bold uppercase tracking-wider text-slate-400 ${
                  darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3 text-center">Days Worked</th>
                    <th className="py-3 px-3 text-center">Absent Days</th>
                    <th className="py-3 px-3 text-center">Leave Days</th>
                    <th className="py-3 px-3 text-center text-amber-500">Overtime Hours</th>
                    <th className="py-3 px-3">Compliance Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {employees.map(emp => {
                    const att = attendanceRecords.find(a => a.employeeId === emp.id && a.month === selectedMonth) || {
                      daysWorked: 26,
                      absentDays: 0,
                      leaveDays: 0,
                      overtimeHours: 0,
                      notes: 'Standard 26 shift days'
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{emp.fullName}</div>
                          <span className="text-[10px] text-slate-400">{emp.department} • {emp.role}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-500">{att.daysWorked} Days</td>
                        <td className="py-3 px-3 text-center font-bold text-rose-500">{att.absentDays} Days</td>
                        <td className="py-3 px-3 text-center font-bold text-sky-500">{att.leaveDays} Days</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-500">{att.overtimeHours} Hrs</td>
                        <td className="py-3 px-3 text-slate-400 italic">{att.notes || 'Normal shift'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: P&L LOSS DIAGNOSTICS & FINANCIAL HEALTH ----------------- */}
      {activeTab === 'loss_diagnostics' && (() => {
        const orders = loadOrders();
        const expenses = loadExpenses();
        
        // Revenue calculations
        const totalGrossRevenue = orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
        
        // Unpaid customer debt / walkout losses
        const creditOrders = orders.filter(o => o.paymentStatus === 'CREDIT' || o.status === 'Credit' || o.balance > 0);
        const totalUnpaidCreditLoss = creditOrders.reduce((sum, o) => {
          const bal = o.balance > 0 ? o.balance : Math.max(0, o.total - (o.amountPaid || 0));
          return sum + bal;
        }, 0);

        // Staff Payroll cost
        const activeStaffList = employees.filter(e => e.status === 'Active');
        const totalBaseSalaryCost = activeStaffList.reduce((sum, e) => sum + e.basicSalary, 0);

        // Total Staff Minuses / Advances
        const totalStaffMinuses = salaryAdvances.filter(a => a.status === 'Approved').reduce((sum, a) => sum + a.amount, 0);
        const netPayrollPaidOrDue = Math.max(0, totalBaseSalaryCost - totalStaffMinuses);

        // Operating Expenses
        const totalOpExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Total Net Operating Profit / Loss
        const netProfitOrLoss = totalGrossRevenue - (totalOpExpenses + netPayrollPaidOrDue);
        const profitMarginPercent = totalGrossRevenue > 0 ? ((netProfitOrLoss / totalGrossRevenue) * 100) : 0;
        const isCriticalLoss = netProfitOrLoss < 0;

        // Staff consumption vs Walkouts
        const staffLossesList = salaryAdvances.filter(a => 
          a.reason.includes('Loss') || a.reason.includes('Consumption') || a.reason.includes('Guard') || a.reason.includes('Unpaid')
        );
        const totalStaffLossValue = staffLossesList.reduce((sum, a) => sum + a.amount, 0);

        return (
          <div className="space-y-6">
            {/* P&L Health Diagnostic Banner */}
            <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
              isCriticalLoss
                ? 'bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-slate-900 border-rose-500/60 text-white'
                : profitMarginPercent < 15
                  ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border-amber-500/50 text-white'
                  : 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/50 text-white'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      isCriticalLoss 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : profitMarginPercent < 15 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-emerald-500 text-slate-950'
                    }`}>
                      {isCriticalLoss ? '⚠️ Critical Operating Loss Warning' : profitMarginPercent < 15 ? '⚠️ Low Profit Margin' : '🟢 Healthy Business Operations'}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">Current Financial Diagnosis</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black">
                    Net P&L: <span className={netProfitOrLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(netProfitOrLoss)}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {isCriticalLoss 
                      ? 'The business is currently operating at a net deficit! Total expenses, staff payroll, and uncollected debts exceed total cash collected. Action is required below.'
                      : `The business is profitable with a net profit margin of ${profitMarginPercent.toFixed(1)}%. Review cost drivers below to boost profitability.`
                    }
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-right shrink-0 min-w-[200px]">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Profit Margin Rate</span>
                  <p className={`text-2xl font-black ${profitMarginPercent >= 15 ? 'text-emerald-400' : profitMarginPercent >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {profitMarginPercent.toFixed(1)}%
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">Margin on {formatCurrency(totalGrossRevenue)} Cash Sales</span>
                </div>
              </div>
            </div>

            {/* Financial Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">1. Cash Sales Revenue</span>
                <p className="text-xl font-black text-emerald-500">{formatCurrency(totalGrossRevenue)}</p>
                <span className="text-[10px] text-slate-500">{orders.length} Completed POS Orders</span>
              </div>

              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">2. Direct Expenses</span>
                <p className="text-xl font-black text-rose-400">-{formatCurrency(totalOpExpenses)}</p>
                <span className="text-[10px] text-slate-500">{expenses.length} Logged Expense Items</span>
              </div>

              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">3. Net Staff Payroll</span>
                <p className="text-xl font-black text-sky-400">-{formatCurrency(netPayrollPaidOrDue)}</p>
                <span className="text-[10px] text-slate-500">Base {formatCurrency(totalBaseSalaryCost)} - Minuses {formatCurrency(totalStaffMinuses)}</span>
              </div>

              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">4. Unpaid Customer Walkouts</span>
                <p className="text-xl font-black text-amber-500">{formatCurrency(totalUnpaidCreditLoss)}</p>
                <span className="text-[10px] text-slate-500">{creditOrders.length} Credit Receipts Outstanding</span>
              </div>
            </div>

            {/* "Why is Profit Low?" Root Cause Diagnostic Section */}
            <div className={`p-6 rounded-3xl border space-y-4 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-amber-500" />
                  <h4 className="font-black text-base">Profit Leak Diagnostic ("Why is Profit Low?")</h4>
                </div>
                <button
                  onClick={() => {
                    exportGenericPDF(
                      'P&L Profit Loss Diagnostic Report',
                      'Automated Business Financial Health Diagnosis',
                      ['Metric Category', 'Amount Value', 'Impact Analysis'],
                      [
                        ['Cash Sales Collected', formatCurrency(totalGrossRevenue), 'Gross POS Revenue'],
                        ['Direct Operating Expenses', formatCurrency(totalOpExpenses), 'Vendor & Utility Bills'],
                        ['Gross Employee Base Salary', formatCurrency(totalBaseSalaryCost), `${activeStaffList.length} Staff Salaries`],
                        ['Staff Consumption & Walkout Deductions', formatCurrency(totalStaffMinuses), 'Minused to Payroll'],
                        ['Uncollected Customer Debts', formatCurrency(totalUnpaidCreditLoss), `${creditOrders.length} Outstanding Receipts`],
                        ['TRUE NET PROFIT / LOSS', formatCurrency(netProfitOrLoss), isCriticalLoss ? 'CRITICAL LOSS' : 'PROFITABLE']
                      ],
                      'PL_Loss_Diagnostic_Report'
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Diagnostic PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Diagnostic Item 1 */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" /> Payroll Expense Ratio
                    </span>
                    <span className="font-mono text-slate-300">
                      {totalGrossRevenue > 0 ? ((totalBaseSalaryCost / totalGrossRevenue) * 100).toFixed(1) : 0}% of Sales
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Total active employee salaries are {formatCurrency(totalBaseSalaryCost)}. 
                    {((totalBaseSalaryCost / (totalGrossRevenue || 1)) * 100) > 40 
                      ? ' ⚠️ High payroll ratio (>40%) is heavily reducing net profit margins.'
                      : ' Payroll overhead is within healthy operational range.'}
                  </p>
                </div>

                {/* Diagnostic Item 2 */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Customer Walkout & Credit Leakage
                    </span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(totalUnpaidCreditLoss)}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {creditOrders.length} unpaid orders where customers walked out or guards/waiters gave service on credit. 
                    {totalStaffLossValue > 0 
                      ? ` ${formatCurrency(totalStaffLossValue)} has been transferred as staff salary deductions.`
                      : ' Transfer unpaid walkouts to responsible guard/waiter salary accounts below.'}
                  </p>
                </div>

                {/* Diagnostic Item 3 */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-sky-400 flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5" /> Staff Food & Service Consumption
                    </span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(totalStaffLossValue)}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Total food, drinks, or pool/sauna services consumed by staff or lost on shift. Automatically minused on 1st of month payroll run.
                  </p>
                </div>

                {/* Diagnostic Item 4 */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> Direct Operational Bills
                    </span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(totalOpExpenses)}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Total utility, inventory restock, and maintenance expenses logged in the expense tracker.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ----------------- TAB 6: STAFF WALKOUT DEBT & CREDIT RECOVERY LEDGER ----------------- */}
      {activeTab === 'staff_liabilities' && (() => {
        const staffDeductionsList = salaryAdvances.filter(a => a.status === 'Approved' || a.status === 'Recovered' || a.status === 'Waived');

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-black text-lg sm:text-xl flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Staff Walkout & Consumption Debt Recovery Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Shows every employee credited or minused for customer walkouts, guard duty errors, or unpaid staff consumption, with cash recovery option.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    exportGenericExcel(
                      'Staff_Walkout_and_Credit_Deductions_Report',
                      'Staff Liabilities',
                      ['Date', 'Employee', 'Department', 'Reason', 'Amount Minused', 'Status', 'Approved By'],
                      staffDeductionsList.map(a => [
                        new Date(a.requestDate).toLocaleDateString(),
                        a.employeeName,
                        a.department,
                        a.reason,
                        a.amount,
                        a.status,
                        a.approvedBy || 'Manager System'
                      ])
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Recovery Ledger</span>
                </button>
              </div>
            </div>

            {/* Debt Table */}
            <div className={`rounded-3xl border overflow-hidden shadow-lg ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                      darkMode ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      <th className="py-3 px-4">Date Charged</th>
                      <th className="py-3 px-3">Employee Name</th>
                      <th className="py-3 px-3">Role / Dept</th>
                      <th className="py-3 px-3">Reason / Incident Detail</th>
                      <th className="py-3 px-3 text-right">Minused Amount</th>
                      <th className="py-3 px-3 text-center">Recovery Status</th>
                      <th className="py-3 px-3 text-center">Action / Settle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {staffDeductionsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          No staff walkout losses or consumption deductions logged yet.
                        </td>
                      </tr>
                    ) : (
                      staffDeductionsList.map(adv => (
                        <tr key={adv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {new Date(adv.requestDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {adv.employeeName}
                          </td>
                          <td className="py-3 px-3 text-slate-500">{adv.department}</td>
                          <td className="py-3 px-3 text-slate-300 font-medium">{adv.reason}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-500">
                            -{formatCurrency(adv.amount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              adv.status === 'Recovered'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : adv.status === 'Waived'
                                  ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                              {adv.status === 'Approved' ? 'Minused to Salary (Pending)' : adv.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {adv.status === 'Approved' ? (
                              <button
                                onClick={() => {
                                  const confirmSettle = window.confirm(
                                    `Has customer or employee ${adv.employeeName} paid back ${formatCurrency(adv.amount)} in cash?\n\nThis will mark the debt as RECOVERED and cancel the salary minus!`
                                  );
                                  if (confirmSettle) {
                                    const updated = salaryAdvances.map(a => a.id === adv.id ? { ...a, status: 'Recovered' as any } : a);
                                    saveSalaryAdvances(updated);
                                    setSalaryAdvances(updated);

                                    // Add to cash movements
                                    addCashMovement({
                                      shiftId: 'MANUAL',
                                      user: loggedInUser?.fullName || 'Manager System',
                                      amount: adv.amount,
                                      movementType: 'Credit Payment Received',
                                      reason: `Recovered Staff Debt / Walkout Loss from ${adv.employeeName} (${adv.reason})`
                                    });

                                    addAuditLog({
                                      userId: loggedInUser?.id || 'system',
                                      userName: loggedInUser?.fullName || 'Manager',
                                      userRole: 'Manager',
                                      userEmail: '',
                                      action: 'UPDATE_SALARY_ADVANCE',
                                      category: 'System',
                                      details: `Recovered cash ${formatCurrency(adv.amount)} for staff debt ${adv.employeeName}.`
                                    });

                                    alert(`Cash payment of ${formatCurrency(adv.amount)} recovered successfully! Salary minus canceled.`);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center space-x-1 mx-auto cursor-pointer shadow-xs"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Recover Cash</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ----------------- MODAL: ADD / EDIT EMPLOYEE ----------------- */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 my-8 space-y-5 shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-lg">
                  {editingEmployee ? `Edit Staff: ${editingEmployee.fullName}` : 'Register New Employee Record'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-slate-400">Full Employee Name *</label>
                  <input
                    type="text"
                    required
                    value={empForm.fullName}
                    onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                    placeholder="e.g. Jean Claude Nshimiyimana"
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Department *</label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value as Employee['department'] })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Job Title / Role *</label>
                  <input
                    type="text"
                    required
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                    placeholder="e.g. Head Bartender / Waiter"
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    placeholder="+250 788 000 000"
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    placeholder="staff@hotel.rw"
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">National ID / Passport #</label>
                  <input
                    type="text"
                    value={empForm.nationalId}
                    onChange={(e) => setEmpForm({ ...empForm, nationalId: e.target.value })}
                    placeholder="1199..."
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Joining Date</label>
                  <input
                    type="date"
                    value={empForm.joiningDate}
                    onChange={(e) => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-medium ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-400">Employment Type</label>
                  <select
                    value={empForm.employmentType}
                    onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value as Employee['employmentType'] })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold ${
                      darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="Full-time">Full-time Contract</option>
                    <option value="Part-time">Part-time Contract</option>
                    <option value="Casual">Casual / Shift Staff</option>
                  </select>
                </div>
              </div>

              {/* Salary Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase text-amber-500 tracking-wider">
                  Compensation & Salary Settings (RWF)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Basic Salary</label>
                    <input
                      type="number"
                      required
                      value={empForm.basicSalary}
                      onChange={(e) => setEmpForm({ ...empForm, basicSalary: Number(e.target.value) })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Housing Allowance</label>
                    <input
                      type="number"
                      value={empForm.housingAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, housingAllowance: Number(e.target.value) })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Transport Allowance</label>
                    <input
                      type="number"
                      value={empForm.transportAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, transportAllowance: Number(e.target.value) })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Bonus / Other</label>
                    <input
                      type="number"
                      value={empForm.otherBonus}
                      onChange={(e) => setEmpForm({ ...empForm, otherBonus: Number(e.target.value) })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Banking & Payout */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs uppercase text-sky-500 tracking-wider">
                  Banking & Mobile Money Disbursal Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Bank Name</label>
                    <input
                      type="text"
                      value={empForm.bankName}
                      onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                      placeholder="BK / Equity / I&M"
                      className={`w-full px-3 py-2 rounded-xl border font-medium ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Bank Account #</label>
                    <input
                      type="text"
                      value={empForm.bankAccount}
                      onChange={(e) => setEmpForm({ ...empForm, bankAccount: e.target.value })}
                      placeholder="00000-0000000-00"
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-400">Mobile Money Phone #</label>
                    <input
                      type="text"
                      value={empForm.mobileMoneyNumber}
                      onChange={(e) => setEmpForm({ ...empForm, mobileMoneyNumber: e.target.value })}
                      placeholder="+250 788 000 000"
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingEmployee ? 'Save Employee Changes' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: SALARY ADVANCE ----------------- */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base">Disburse Cash Advance to Staff</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-400">Select Employee *</label>
                <select
                  required
                  value={advanceEmployeeId}
                  onChange={(e) => setAdvanceEmployeeId(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="">-- Choose Staff Member --</option>
                  {activeEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.department} - Basic: {formatCurrency(e.basicSalary)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Advance Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-bold text-sm ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Reason / Notes</label>
                <input
                  type="text"
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="e.g. Emergency loan, School fees advance"
                  className={`w-full px-3 py-2.5 rounded-xl border font-medium ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Disburse Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: PAY SALARY ----------------- */}
      {payingPayrollRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base">Pay Salary: {payingPayrollRecord.employeeName}</h3>
                <span className="text-xs font-mono text-emerald-500 font-bold">
                  Net Payable: {formatCurrency(payingPayrollRecord.netSalary)}
                </span>
              </div>
              <button
                onClick={() => setPayingPayrollRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSalaryPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-400">Payment Disbursal Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className={`w-full px-3 py-2.5 rounded-xl border font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="Bank Transfer">Bank Transfer (BK / I&M / Equity)</option>
                  <option value="Mobile Money">Mobile Money (MTN MoMo / Airtel)</option>
                  <option value="Cash">Physical Cash Drawer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-400">Transaction Reference #</label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="e.g. BK-TRF-9921 / MoMo Ref..."
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono font-medium ${
                    darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPayingPayrollRecord(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Confirm Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: OFFICIAL PAYSLIP VIEW ----------------- */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white text-slate-900 p-8 space-y-6 shadow-2xl my-8 print:p-0 print:shadow-none">
            {/* Payslip Header */}
            <div className="flex justify-between items-start border-b pb-4 border-slate-200">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-950">HOTEL & RESORT LTD</h2>
                <p className="text-xs text-slate-500 font-medium">Human Resources & Payroll Office</p>
                <p className="text-xs text-slate-500">Kigali, Rwanda • Tel: +250 788 000 000</p>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 font-black text-xs">
                  OFFICIAL PAYSLIP
                </span>
                <p className="text-xs font-mono font-bold text-slate-500 mt-2">Period: {viewingPayslip.payrollPeriod}</p>
              </div>
            </div>

            {/* Employee Information Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Staff Name</span>
                <span className="font-bold text-sm text-slate-900">{viewingPayslip.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Employee ID</span>
                <span className="font-mono font-bold text-amber-600">{viewingPayslip.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Department</span>
                <span className="font-bold text-slate-800">{viewingPayslip.department}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Position / Role</span>
                <span className="font-bold text-slate-800">{viewingPayslip.role}</span>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 border-b pb-1 border-emerald-200">
                  Gross Earnings
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Basic Monthly Salary:</span>
                    <span className="font-mono font-bold">{formatCurrency(viewingPayslip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Housing Allowance:</span>
                    <span className="font-mono">{formatCurrency(viewingPayslip.housingAllowance)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Transport Allowance:</span>
                    <span className="font-mono">{formatCurrency(viewingPayslip.transportAllowance)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Overtime & Bonuses:</span>
                    <span className="font-mono">{formatCurrency(viewingPayslip.overtimePay + viewingPayslip.bonus)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-black text-emerald-700 pt-2 border-t border-emerald-300">
                    <span>TOTAL GROSS EARNINGS:</span>
                    <span className="font-mono">{formatCurrency(viewingPayslip.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-rose-700 border-b pb-1 border-rose-200">
                  Statutory & Loans Deductions
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">RSSB Pension Contribution:</span>
                    <span className="font-mono text-rose-600">-{formatCurrency(viewingPayslip.rssbPension)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">PAYE Income Tax:</span>
                    <span className="font-mono text-rose-600">-{formatCurrency(viewingPayslip.payeTax)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Salary Advance Deducted:</span>
                    <span className="font-mono text-amber-600 font-bold">
                      {viewingPayslip.salaryAdvanceDeduction > 0 ? `-${formatCurrency(viewingPayslip.salaryAdvanceDeduction)}` : 'RWF 0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 font-black text-rose-700 pt-2 border-t border-rose-300">
                    <span>TOTAL DEDUCTIONS:</span>
                    <span className="font-mono">-{formatCurrency(viewingPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary Payable Callout */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block">Net Take-Home Pay</span>
                <span className="text-[10px] text-emerald-400">Status: {viewingPayslip.paymentStatus} via {viewingPayslip.paymentMethod || 'Bank'}</span>
              </div>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(viewingPayslip.netSalary)}
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-slate-500 border-t border-slate-200">
              <div>
                <p className="font-bold mb-8">Employee Signature: __________________</p>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold mb-8">HR / Accountant Signature: __________________</p>
                <p>Processed By: {viewingPayslip.processedBy || 'Management'}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 flex justify-end space-x-2 print:hidden">
              <button
                onClick={() => setViewingPayslip(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: VIEW EMPLOYEE FULL PROFILE ----------------- */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 font-black flex items-center justify-center">
                  {viewingEmployee.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base">{viewingEmployee.fullName}</h3>
                  <span className="text-xs font-mono text-amber-500 font-bold">{viewingEmployee.employeeId}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div>
                  <span className="text-slate-400 block">Department</span>
                  <span className="font-bold">{viewingEmployee.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Role</span>
                  <span className="font-bold">{viewingEmployee.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contract Type</span>
                  <span className="font-bold">{viewingEmployee.employmentType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Joining Date</span>
                  <span className="font-bold">{viewingEmployee.joiningDate}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="font-bold text-amber-500 uppercase text-[10px] block">Compensation Package</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Basic Monthly Salary:</span>
                  <span className="font-mono font-bold text-slate-100">{formatCurrency(viewingEmployee.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allowances (Housing + Transport + Bonus):</span>
                  <span className="font-mono text-sky-400">
                    +{formatCurrency((viewingEmployee.housingAllowance || 0) + (viewingEmployee.transportAllowance || 0) + (viewingEmployee.otherBonus || 0))}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Banking & Contacts</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Account:</span>
                  <span className="font-mono">{viewingEmployee.bankName || 'N/A'} - {viewingEmployee.bankAccount || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile Money:</span>
                  <span className="font-mono">{viewingEmployee.mobileMoneyNumber || viewingEmployee.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Contact:</span>
                  <span className="font-bold">{viewingEmployee.emergencyContactName || 'N/A'} ({viewingEmployee.emergencyContactPhone || 'N/A'})</span>
                </div>
              </div>

              {/* Day-1 Consumption & Unpaid Customer Loss History Ledger */}
              {(() => {
                const empAdvances = salaryAdvances.filter(a => a.employeeId === viewingEmployee.id);
                const totalEmpDeductions = empAdvances.reduce((sum, a) => sum + a.amount, 0);

                return (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-rose-500 uppercase text-[10px] flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" />
                        Day-1 Staff Consumption & Loss Liability Ledger
                      </span>
                      <span className="font-mono font-bold text-rose-400 text-xs">
                        Total: {formatCurrency(totalEmpDeductions)}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Tracked continuously since hiring ({viewingEmployee.joiningDate || 'Day 1'}). Automatically deducted from monthly payroll.
                    </p>

                    {empAdvances.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-1">No recorded consumption charges or unpaid walkout losses for this employee.</p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {empAdvances.map(adv => (
                          <div key={adv.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center text-[11px]">
                            <div>
                              <p className="font-bold text-slate-200">{adv.reason}</p>
                              <span className="text-[10px] text-slate-500">{adv.requestDate?.slice(0, 10)} | Month: {adv.month}</span>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="font-mono font-bold text-rose-400">-{formatCurrency(adv.amount)}</span>
                              <span className="block text-[9px] uppercase font-bold text-emerald-400">Minus to Salary</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 flex justify-between items-center space-x-2">
              <button
                onClick={() => handleDeleteEmployee(viewingEmployee)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Employee Permanently</span>
              </button>
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
