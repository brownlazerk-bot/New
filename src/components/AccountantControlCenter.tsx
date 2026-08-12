import React, { useState } from 'react';
import { 
  Briefcase, DollarSign, CreditCard, FileText, ArrowUpRight, ArrowDownRight, 
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Search, Filter, 
  PlusCircle, Download, Printer, ShieldCheck, RefreshCw, Layers, 
  Calendar, Building, User, Phone, BookOpen, Clock, ChevronRight, MessageSquare,
  Scale, FileSpreadsheet, Check, Eye, Vault, PieChart, Landmark
} from 'lucide-react';
import { 
  Order, MenuItem, Shift, Expense, CashMovement, DailyClosingRecord, POSDepositRecord,
  PurchaseOrder, AppUser, ExpenseDepartment, PaymentMethod 
} from '../types';
import { formatCurrency } from '../lib/currency';
import { printReportHTML, exportGenericPDF, exportGenericExcel } from '../lib/exporter';
import { loadApprovalRequests, saveApprovalRequests, loadApprovalRules, loadPOSDeposits, addPOSDeposit, loadPayrollRecords } from '../lib/storage';

interface AccountantControlCenterProps {
  orders: Order[];
  menuItems: MenuItem[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  cashMovements: CashMovement[];
  allShifts: Shift[];
  currentUser?: AppUser | null;
  onAddExpense?: (expense: Omit<Expense, 'id' | 'expenseNumber' | 'timestamp'>) => void;
  onAddCashMovement?: (movement: Omit<CashMovement, 'id' | 'timestamp' | 'date' | 'time'>) => void;
  onEditPurchaseOrder?: (id: string, updated: Partial<PurchaseOrder>) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  darkMode: boolean;
}

type ControlTab = 
  | 'overview' 
  | 'pos_deposits' 
  | 'cash_flow' 
  | 'pnl_statement' 
  | 'payables' 
  | 'receivables' 
  | 'ledger' 
  | 'expenses' 
  | 'vat_tax' 
  | 'cogs' 
  | 'reports';

export const AccountantControlCenter: React.FC<AccountantControlCenterProps> = ({
  orders = [],
  menuItems = [],
  purchaseOrders = [],
  expenses = [],
  cashMovements = [],
  allShifts = [],
  currentUser,
  onAddExpense,
  onAddCashMovement,
  onEditPurchaseOrder,
  onUpdateOrder,
  darkMode = false
}) => {
  const [activeTab, setActiveTab] = useState<ControlTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Modals & Action States
  const [payingPo, setPayingPo] = useState<PurchaseOrder | null>(null);
  const [poPayMethod, setPoPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [poPayRef, setPoPayRef] = useState('');

  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [orderPayMethod, setOrderPayMethod] = useState<PaymentMethod>('CASH');
  const [orderPayNotes, setOrderPayNotes] = useState('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expDept, setExpDept] = useState<ExpenseDepartment>('Bar');
  const [expCategory, setExpCategory] = useState('Stock Purchase');
  const [expAmount, setExpAmount] = useState(0);
  const [expPayMethod, setExpPayMethod] = useState<PaymentMethod>('CASH');
  const [expRecipient, setExpRecipient] = useState('');
  const [expDesc, setExpDesc] = useState('');

  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [cashType, setCashType] = useState<'Deposit to Bank' | 'Withdrawal from Bank' | 'Capital Injection' | 'Owner Draw' | 'Petty Cash Replenishment'>('Deposit to Bank');
  const [cashAmount, setCashAmount] = useState(0);
  const [cashRef, setCashRef] = useState('');
  const [cashDesc, setCashDesc] = useState('');

  // POS Handover & Cash Deposit States
  const [posDeposits, setPosDeposits] = useState<POSDepositRecord[]>(() => loadPOSDeposits());
  const [isPosDepositModalOpen, setIsPosDepositModalOpen] = useState(false);
  const [depCashier, setDepCashier] = useState('John Mugisha (POS Cashier)');
  const [depDestination, setDepDestination] = useState<'Bank Account' | 'Company Safe / Vault' | 'Petty Cash Reserve' | 'Owner Handover'>('Bank Account');
  const [depBankName, setDepBankName] = useState('Bank of Kigali (BK)');
  const [depAccountNo, setDepAccountNo] = useState('00012-3456789-01');
  const [depSlipRef, setDepSlipRef] = useState('');
  const [depCashAmt, setDepCashAmt] = useState(250000);
  const [depMomoAmt, setDepMomoAmt] = useState(150000);
  const [depCardAmt, setDepCardAmt] = useState(50000);
  const [depDepositedAmt, setDepDepositedAmt] = useState(450000);
  const [depNotes, setDepNotes] = useState('');

  // Cash Flow View Modes
  const [cashFlowViewMode, setCashFlowViewMode] = useState<'daily' | 'monthly'>('daily');

  // Open POS Handover Modal with auto-calculated expected cash
  const handleOpenPosDepositModal = () => {
    const today = dateFilter || new Date().toISOString().split('T')[0];
    const todayPaidOrders = (orders || []).filter(o => o && o.paymentStatus === 'PAID' && o.status !== 'Cancelled' && (o.createdAt || '').startsWith(today));
    
    const cashTotal = todayPaidOrders.filter(o => o.paymentMethod === 'CASH').reduce((acc, o) => acc + (o.total || 0), 0);
    const momoTotal = todayPaidOrders.filter(o => o.paymentMethod === 'MOBILE_MONEY' || o.paymentMethod === 'MOMO').reduce((acc, o) => acc + (o.total || 0), 0);
    const cardTotal = todayPaidOrders.filter(o => o.paymentMethod === 'CARD').reduce((acc, o) => acc + (o.total || 0), 0);

    const cAmt = cashTotal || 350000;
    const mAmt = momoTotal || 200000;
    const cdAmt = cardTotal || 75000;

    setDepCashAmt(cAmt);
    setDepMomoAmt(mAmt);
    setDepCardAmt(cdAmt);
    setDepDepositedAmt(cAmt + mAmt + cdAmt);
    setDepSlipRef(`SLIP-BK-${Math.floor(10000 + Math.random() * 90000)}`);
    setIsPosDepositModalOpen(true);
  };

  const handleCreatePOSDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalPosSales = depCashAmt + depMomoAmt + depCardAmt;
    const variance = depDepositedAmt - totalPosSales;

    const newDep = addPOSDeposit({
      date: dateFilter || new Date().toISOString().split('T')[0],
      cashierName: depCashier,
      totalPOSSales: totalPosSales,
      cashAmount: depCashAmt,
      mobileMoneyAmount: depMomoAmt,
      cardAmount: depCardAmt,
      creditAmount: 0,
      amountDeposited: depDepositedAmt,
      depositDestination: depDestination,
      bankName: depBankName,
      bankAccountNo: depAccountNo,
      depositSlipReference: depSlipRef || `SLIP-${Date.now().toString().slice(-6)}`,
      varianceAmount: variance,
      varianceNotes: variance === 0 ? 'Exact match' : variance > 0 ? 'Surplus cash deposited' : 'Shortage recorded',
      receivedByAccountant: currentUser?.fullName || 'David Habimana (Accountant)',
      status: variance === 0 ? 'Verified & Deposited' : 'Discrepancy Flagged',
      notes: depNotes || 'POS money verified and deposited into official bank account.'
    });

    if (onAddCashMovement) {
      onAddCashMovement({
        type: 'Deposit to Bank',
        amount: depDepositedAmt,
        reason: `POS Money Collection Deposit (${depCashier}) - Ref: ${depSlipRef || newDep.depositNumber}`,
        referenceNumber: depSlipRef || newDep.depositNumber,
        performedBy: currentUser?.fullName || 'Accountant',
        shiftId: ''
      });
    }

    setPosDeposits(loadPOSDeposits());
    setIsPosDepositModalOpen(false);
    alert(`✓ POS Money Collection of RWF ${depDepositedAmt.toLocaleString()} successfully deposited to ${depBankName}! Ref: ${newDep.depositNumber}`);
  };

  // Key KPI Calculations
  const totalRevenue = (orders || [])
    .filter(o => o && o.paymentStatus === 'PAID' && o.status !== 'Cancelled')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const totalUnpaidReceivables = (orders || [])
    .filter(o => o && o.paymentStatus !== 'PAID' && o.status !== 'Cancelled')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const totalPayablesUnpaid = (purchaseOrders || [])
    .filter(p => p && (p.paymentStatus === 'Unpaid' || p.paymentStatus === 'Partially Paid'))
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const totalPurchaseSpend = (purchaseOrders || [])
    .reduce((acc, p) => acc + (p.totalAmount || 0), 0);

  const totalExpensesAmount = (expenses || [])
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const netOperatingProfit = totalRevenue - totalExpensesAmount - totalPurchaseSpend;

  // Settle Unpaid Purchase Order (Accounts Payable)
  const handleSettleSupplierInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPo) return;

    if (onEditPurchaseOrder) {
      onEditPurchaseOrder(payingPo.id, {
        paymentStatus: 'Paid',
        notes: `${payingPo.notes || ''} [Paid via ${poPayMethod} - Ref: ${poPayRef || 'N/A'}]`
      });
    }

    // Auto-log Cash Movement if Bank Transfer / Cash
    if (onAddCashMovement) {
      onAddCashMovement({
        type: poPayMethod === 'CASH' ? 'Withdrawal from Bank' : 'Withdrawal from Bank',
        amount: payingPo.totalAmount,
        reason: `Supplier Payment for PO #${payingPo.poNumber} (${payingPo.supplierName})`,
        referenceNumber: poPayRef || payingPo.poNumber,
        performedBy: currentUser?.fullName || 'Accountant',
        shiftId: ''
      });
    }

    alert(`✓ Supplier Invoice #${payingPo.poNumber} settled successfully! Total: RWF ${payingPo.totalAmount.toLocaleString()}`);
    setPayingPo(null);
    setPoPayRef('');
  };

  // Recover Customer Unpaid Order Debt (Accounts Receivable)
  const handleRecoverCustomerDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;

    if (onUpdateOrder) {
      onUpdateOrder({
        ...payingOrder,
        paymentStatus: 'PAID',
        paymentMethod: orderPayMethod,
        notes: `${payingOrder.notes || ''} [Debt Settled on ${new Date().toLocaleDateString()} - Accountant Verified]`
      });
    }

    alert(`✓ Customer Order #${payingOrder.orderNumber} debt settled! Amount: RWF ${payingOrder.total.toLocaleString()}`);
    setPayingOrder(null);
    setOrderPayNotes('');
  };

  // Submit Expense Voucher
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    if (onAddExpense) {
      onAddExpense({
        department: expDept,
        category: expCategory,
        amount: expAmount,
        paymentMethod: expPayMethod,
        recipientName: expRecipient || 'Vendor / Staff',
        description: expDesc,
        authorizedBy: currentUser?.fullName || 'Accountant'
      });
    }

    alert(`✓ Expense Voucher recorded! RWF ${expAmount.toLocaleString()} allocated to ${expDept} (${expCategory}).`);
    setIsExpenseModalOpen(false);
    setExpAmount(0);
    setExpRecipient('');
    setExpDesc('');
  };

  // Submit General Ledger Cash Movement
  const handleCreateCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashAmount <= 0) {
      alert('Please enter a valid cash movement amount.');
      return;
    }

    if (onAddCashMovement) {
      onAddCashMovement({
        type: cashType,
        amount: cashAmount,
        reason: cashDesc || cashType,
        referenceNumber: cashRef || `REF-${Date.now()}`,
        performedBy: currentUser?.fullName || 'Accountant',
        shiftId: ''
      });
    }

    alert(`✓ Ledger Cash Movement (${cashType}) recorded! Amount: RWF ${cashAmount.toLocaleString()}`);
    setIsCashMovementModalOpen(false);
    setCashAmount(0);
    setCashRef('');
    setCashDesc('');
  };

  // Export A4 Financial Statement
  const handleExportA4FinancialStatement = () => {
    const accountantName = currentUser?.fullName || 'Senior Accountant';
    const html = `
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 8px; margin-bottom: 12px; }
        .kpi-grid { display: flex; justify-content: space-around; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
        .kpi-box { text-align: center; }
        .kpi-val { font-size: 15px; font-weight: bold; color: #0f172a; }
        .kpi-lbl { font-size: 9px; color: #475569; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background: #1e293b; color: #ffffff; border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 6px 8px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; }
      </style>

      <div class="header">
        <h1 style="font-size: 20px; font-weight: 900; margin: 0;">SEVEN TO SEVEN - SKY VIEW RESORT</h1>
        <h3 style="font-size: 13px; margin: 2px 0 6px 0; color: #334155;">OFFICIAL ACCOUNTING FINANCIAL CONTROL STATEMENT</h3>
        <div style="font-size: 10px; color: #64748b;">
          Audit Date: ${dateFilter} | Generated: ${new Date().toLocaleString()} | Verified By: <strong>${accountantName}</strong>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><div class="kpi-val" style="color: #059669;">RWF ${totalRevenue.toLocaleString()}</div><div class="kpi-lbl">Gross Revenue</div></div>
        <div class="kpi-box"><div class="kpi-val" style="color: #dc2626;">RWF ${totalExpensesAmount.toLocaleString()}</div><div class="kpi-lbl">Operating Expenses</div></div>
        <div class="kpi-box"><div class="kpi-val" style="color: #2563eb;">RWF ${totalPurchaseSpend.toLocaleString()}</div><div class="kpi-lbl">Purchases Spend</div></div>
        <div class="kpi-box"><div class="kpi-val" style="color: ${netOperatingProfit >= 0 ? '#059669' : '#dc2626'};">RWF ${netOperatingProfit.toLocaleString()}</div><div class="kpi-lbl">Net Operating Profit</div></div>
      </div>

      <h4 style="margin: 15px 0 5px 0; border-bottom: 1px solid #1e293b; padding-bottom: 3px;">1. ACCOUNTS PAYABLE (UNPAID SUPPLIER INVOICES)</h4>
      <table>
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Supplier Name</th>
            <th>Department</th>
            <th class="text-right">Total Amount</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${purchaseOrders.filter(p => p.paymentStatus !== 'Paid').map(p => `
            <tr>
              <td>${p.poNumber}</td>
              <td>${p.supplierName}</td>
              <td>${p.department}</td>
              <td class="text-right">RWF ${p.totalAmount.toLocaleString()}</td>
              <td class="text-center" style="color: red; font-weight: bold;">Unpaid</td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="text-center">No outstanding unpaid supplier invoices</td></tr>'}
        </tbody>
      </table>

      <h4 style="margin: 15px 0 5px 0; border-bottom: 1px solid #1e293b; padding-bottom: 3px;">2. ACCOUNTS RECEIVABLE (CUSTOMER CREDIT DEBTS)</h4>
      <table>
        <thead>
          <tr>
            <th>Order Number</th>
            <th>Customer / Room / Table</th>
            <th>Waiter / Cashier</th>
            <th class="text-right">Unpaid Amount</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders.filter(o => o.paymentStatus !== 'PAID' && o.status !== 'Cancelled').map(o => `
            <tr>
              <td>${o.orderNumber}</td>
              <td>${o.customerName || o.roomNumber ? `Room ${o.roomNumber}` : `Table ${o.tableNumber}`}</td>
              <td>${o.waiterName || o.cashierName}</td>
              <td class="text-right">RWF ${o.total.toLocaleString()}</td>
              <td class="text-center" style="color: orange; font-weight: bold;">Unpaid Credit</td>
            </tr>
          `).join('') || '<tr><td colspan="5" class="text-center">No outstanding customer credit debts</td></tr>'}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #94a3b8; margin-top: 30px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px;">
        <div>Chief Accountant Sign: ___________________________</div>
        <div>General Manager Sign: ___________________________</div>
      </div>
    `;

    printReportHTML(`Accounting Statement - ${dateFilter}`, html);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Title Banner */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-tight">Financial Control & Accountant Portal</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Full Financial Authority
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive control over general ledger, accounts payable/receivable, expenses, COGS, and audit compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportA4FinancialStatement}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Financial Audit Report (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Gross Revenue */}
        <div className={`p-5 rounded-2xl border shadow-md transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gross Revenue (Paid)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            RWF {totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Settled POS & Room sales orders
          </p>
        </div>

        {/* Accounts Payable (Unpaid Supplier POs) */}
        <div className={`p-5 rounded-2xl border shadow-md transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accounts Payable (Suppliers)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            RWF {totalPayablesUnpaid.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {purchaseOrders.filter(p => p.paymentStatus !== 'Paid').length} Unpaid Purchase Orders
          </p>
        </div>

        {/* Accounts Receivable (Customer Debts) */}
        <div className={`p-5 rounded-2xl border shadow-md transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accounts Receivable (Debts)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            RWF {totalUnpaidReceivables.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {orders.filter(o => o.paymentStatus !== 'PAID' && o.status !== 'Cancelled').length} Unpaid Orders / Room Bills
          </p>
        </div>

        {/* Net Operating Profit */}
        <div className={`p-5 rounded-2xl border shadow-md transition-all ${
          darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Operating Profit
            </span>
            <div className={`p-2 rounded-xl ${netOperatingProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netOperatingProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            RWF {netOperatingProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Gross Revenue - Expenses - Purchases
          </p>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Financial Overview', icon: Briefcase },
          { id: 'pos_deposits', label: `POS Cash Handover & Deposits (${posDeposits.length})`, icon: Landmark },
          { id: 'cash_flow', label: 'Daily & Monthly Cash Flow', icon: TrendingUp },
          { id: 'pnl_statement', label: 'P&L Statement & Balance Sheet', icon: FileSpreadsheet },
          { id: 'payables', label: `Accounts Payable (${(purchaseOrders || []).filter(p => p && p.paymentStatus !== 'Paid').length})`, icon: CreditCard },
          { id: 'receivables', label: `Accounts Receivable (${(orders || []).filter(o => o && o.paymentStatus !== 'PAID' && o.status !== 'Cancelled').length})`, icon: AlertTriangle },
          { id: 'ledger', label: 'General Cash Ledger', icon: Scale },
          { id: 'expenses', label: `Expenses Control (${(expenses || []).length})`, icon: DollarSign },
          { id: 'vat_tax', label: 'RRA VAT & Tax Compliance', icon: Building },
          { id: 'cogs', label: 'COGS & Margins', icon: Layers },
          { id: 'reports', label: 'Financial Reports', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ControlTab)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : darkMode
                    ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* POS Money Handover Widget */}
            <div className={`p-5 rounded-2xl border shadow-md ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  <span>POS Money Collections</span>
                </span>
                <button
                  onClick={handleOpenPosDepositModal}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition cursor-pointer"
                >
                  + Record Bank Deposit
                </button>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                RWF {posDeposits.reduce((acc, d) => acc + (d.amountDeposited || 0), 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Total verified POS cash/momo deposited across {posDeposits.length} handover batches.
              </p>
            </div>

            {/* Daily Net Cash Flow Widget */}
            <div className={`p-5 rounded-2xl border shadow-md ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Cash Flow Position</span>
                </span>
                <button
                  onClick={() => setActiveTab('cash_flow')}
                  className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  View Cash Flow &rarr;
                </button>
              </div>
              <div className="text-xl font-black text-emerald-500">
                RWF {(totalRevenue - totalExpensesAmount).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Gross Collections (RWF {totalRevenue.toLocaleString()}) - Operating Expenses (RWF {totalExpensesAmount.toLocaleString()})
              </p>
            </div>

            {/* RRA VAT & Tax Summary Widget */}
            <div className={`p-5 rounded-2xl border shadow-md ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                  <Building className="w-4 h-4" />
                  <span>RRA VAT Liability (18%)</span>
                </span>
                <button
                  onClick={() => setActiveTab('vat_tax')}
                  className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  Tax Summary &rarr;
                </button>
              </div>
              <div className="text-xl font-black text-sky-400">
                RWF {Math.round((totalRevenue * (18 / 118))).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Estimated Output VAT collected on RWF {totalRevenue.toLocaleString()} sales.
              </p>
            </div>

          </div>

          {/* Quick Action Hub for Accountant */}
          <div className={`p-6 rounded-3xl border shadow-xl ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Core Accountant Responsibilities & Daily Tasks</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={handleOpenPosDepositModal}
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 text-left transition cursor-pointer group"
              >
                <div className="font-bold text-xs text-amber-500 group-hover:text-amber-400">1. Collect POS Money</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Verify POS register cash & record bank deposit slip</div>
              </button>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 text-left transition cursor-pointer group"
              >
                <div className="font-bold text-xs text-emerald-500 group-hover:text-emerald-400">2. Expense Voucher</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Authorize vendor payment or departmental expense</div>
              </button>

              <button
                onClick={() => setIsCashMovementModalOpen(true)}
                className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 hover:border-sky-500 text-left transition cursor-pointer group"
              >
                <div className="font-bold text-xs text-sky-500 group-hover:text-sky-400">3. General Cash Movement</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Record bank withdrawals, capital injection, or draws</div>
              </button>

              <button
                onClick={() => setActiveTab('pnl_statement')}
                className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-500 text-left transition cursor-pointer group"
              >
                <div className="font-bold text-xs text-purple-500 group-hover:text-purple-400">4. Financial Statements</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Generate Income Statement (P&L) & Balance Sheet</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: POS MONEY HANDOVER & BANK DEPOSITS */}
      {activeTab === 'pos_deposits' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-500" />
                <span>POS Cash Handover, Money Collections & Bank Deposit Reconciliation</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect physical cash, MoMo settlements, and card proceeds from POS cashiers and record official bank deposits.
              </p>
            </div>
            <button
              onClick={handleOpenPosDepositModal}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record POS Collection & Bank Deposit</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">Deposit Ref & Date</th>
                  <th className="p-3">Cashier / Register</th>
                  <th className="p-3">Breakdown (Cash / MoMo / Card)</th>
                  <th className="p-3 text-right">Amount Deposited</th>
                  <th className="p-3">Destination Bank & Slip</th>
                  <th className="p-3 text-center">Variance</th>
                  <th className="p-3 text-center">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(posDeposits || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No POS Collection Deposits recorded yet. Click "+ Record POS Collection & Bank Deposit" to start.
                    </td>
                  </tr>
                ) : (
                  (posDeposits || []).map(dep => (
                    <tr key={dep.id} className="hover:bg-amber-500/5 transition">
                      <td className="p-3 font-bold font-mono">
                        {dep.depositNumber}
                        <div className="text-[10px] text-slate-400 font-sans">{dep.date}</div>
                      </td>
                      <td className="p-3 font-bold text-amber-500">{dep.cashierName}</td>
                      <td className="p-3 text-[11px] space-y-0.5">
                        <div>💵 Cash: RWF {(dep.cashAmount || 0).toLocaleString()}</div>
                        <div>📱 MoMo: RWF {(dep.mobileMoneyAmount || 0).toLocaleString()}</div>
                        <div>💳 Card: RWF {(dep.cardAmount || 0).toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-right font-black text-emerald-500 text-sm">
                        RWF {(dep.amountDeposited || 0).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="font-bold">{dep.depositDestination}</div>
                        <div className="text-[11px] text-slate-400">{dep.bankName || 'Company Vault'}</div>
                        <div className="text-[10px] font-mono text-amber-500">Ref: {dep.depositSlipReference}</div>
                      </td>
                      <td className="p-3 text-center font-bold">
                        {dep.varianceAmount === 0 ? (
                          <span className="text-emerald-500 text-[11px]">RWF 0 (Balanced)</span>
                        ) : (
                          <span className={dep.varianceAmount > 0 ? 'text-emerald-400 text-[11px]' : 'text-rose-500 text-[11px]'}>
                            {dep.varianceAmount > 0 ? '+' : ''}RWF {dep.varianceAmount.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {dep.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">By {dep.receivedByAccountant}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: DAILY & MONTHLY CASH FLOW STATEMENTS */}
      {activeTab === 'cash_flow' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-6 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span>Daily & Monthly Financial Cash Flow Statements</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track exact cash inflows from POS sales vs cash outflows for vendor purchases and operating expenses.
              </p>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setCashFlowViewMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  cashFlowViewMode === 'daily' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Daily Cash Flow
              </button>
              <button
                onClick={() => setCashFlowViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  cashFlowViewMode === 'monthly' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Cash Flow
              </button>
            </div>
          </div>

          {cashFlowViewMode === 'daily' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs font-bold uppercase text-emerald-500 mb-1">Total Daily Inflows (POS & Debtors)</div>
                  <div className="text-xl font-black text-emerald-400">RWF {totalRevenue.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Cash, MoMo, Card collections</div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-xs font-bold uppercase text-rose-500 mb-1">Total Daily Outflows (Expenses & POs)</div>
                  <div className="text-xl font-black text-rose-400">RWF {(totalExpensesAmount + totalPurchaseSpend).toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Vendor POs + Operating Vouchers</div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-xs font-bold uppercase text-amber-500 mb-1">Net Cash Position for {dateFilter}</div>
                  <div className="text-xl font-black text-amber-400">RWF {netOperatingProfit.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Net Cash Surplus available</div>
                </div>
              </div>

              {/* Cash Movement Ledger Stream */}
              <div className="mt-4 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Audit Stream — Cash & Bank Movements</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                        <th className="p-2">Date & Time</th>
                        <th className="p-2">Movement Type</th>
                        <th className="p-2">Reason / Voucher</th>
                        <th className="p-2 text-right">Inflow (RWF)</th>
                        <th className="p-2 text-right">Outflow (RWF)</th>
                        <th className="p-2 text-center">Authorized By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(cashMovements || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-500">
                            No cash movements logged for this period.
                          </td>
                        </tr>
                      ) : (
                        (cashMovements || []).map(m => {
                          const isInflow = m.amount > 0 || (m as any).type === 'Deposit to Bank' || (m as any).type === 'Capital Injection';
                          return (
                            <tr key={m.id} className="hover:bg-amber-500/5">
                              <td className="p-2 font-mono text-[11px]">
                                {m.date || m.timestamp?.split('T')[0]} {m.time}
                              </td>
                              <td className="p-2 font-bold text-amber-400">{(m as any).movementType || (m as any).type || 'Cash Flow'}</td>
                              <td className="p-2">{m.reason}</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-400">
                                {isInflow ? `+RWF ${Math.abs(m.amount).toLocaleString()}` : '-'}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-rose-400">
                                {!isInflow ? `-RWF ${Math.abs(m.amount).toLocaleString()}` : '-'}
                              </td>
                              <td className="p-2 text-center text-slate-400 font-mono">{(m as any).user || (m as any).performedBy || 'Accountant'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* MONTHLY CASH FLOW SUMMARY */
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500">12-Month Cumulative Cash Flow Statement</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase bg-slate-950/50">
                      <th className="p-3">Month Period</th>
                      <th className="p-3 text-right text-emerald-400">Gross Sales Inflow</th>
                      <th className="p-3 text-right text-rose-400">PO Purchases Spend</th>
                      <th className="p-3 text-right text-rose-400">Operating Expenses</th>
                      <th className="p-3 text-right text-amber-400 font-black">Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {['2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'].map(m => (
                      <tr key={m} className="hover:bg-amber-500/5">
                        <td className="p-3 font-bold font-mono">{m}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">RWF {totalRevenue.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-rose-400">RWF {totalPurchaseSpend.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-rose-400">RWF {totalExpensesAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-black text-amber-400">RWF {netOperatingProfit.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PROFIT & LOSS (P&L) STATEMENT & BALANCE SHEET */}
      {activeTab === 'pnl_statement' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-6 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                <span>Official Income Statement (Profit & Loss) & Balance Sheet</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official financial performance summary for company executive management & owners.
              </p>
            </div>
            <button
              onClick={handleExportA4FinancialStatement}
              className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 P&L Statement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Income Statement / P&L */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase text-amber-500 border-b border-slate-800 pb-2">
                1. Income Statement (Profit & Loss)
              </h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60 font-bold">
                  <span>Gross Operating Sales Revenue:</span>
                  <span className="text-emerald-400">RWF {totalRevenue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Less: Cost of Goods Sold (Purchases & Consumables):</span>
                  <span className="text-rose-400">- RWF {totalPurchaseSpend.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800 font-black text-amber-400 text-sm">
                  <span>GROSS OPERATING PROFIT:</span>
                  <span>RWF {(totalRevenue - totalPurchaseSpend).toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-400">
                  <span>Less: Operating Expenses (Utilities, Repairs, Supplies):</span>
                  <span className="text-rose-400">- RWF {totalExpensesAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-t-2 border-emerald-500 font-black text-emerald-400 text-base">
                  <span>NET BUSINESS OPERATING PROFIT:</span>
                  <span>RWF {netOperatingProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Balance Sheet Summary */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase text-sky-400 border-b border-slate-800 pb-2">
                2. Balance Sheet Overview
              </h4>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-sky-400 text-[11px] uppercase pt-1">CURRENT ASSETS</div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span>Cash & Bank Deposits (Reconciled):</span>
                  <span className="font-mono">RWF {posDeposits.reduce((acc, d) => acc + (d.amountDeposited || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span>Accounts Receivable (Customer Debts):</span>
                  <span className="font-mono text-amber-400">RWF {totalUnpaidReceivables.toLocaleString()}</span>
                </div>

                <div className="font-bold text-rose-400 text-[11px] uppercase pt-3">CURRENT LIABILITIES</div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span>Accounts Payable (Unpaid Supplier POs):</span>
                  <span className="font-mono text-rose-400">RWF {totalPayablesUnpaid.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-2 border-t-2 border-sky-400 font-black text-sky-400 text-sm pt-3">
                  <span>NET WORKING CAPITAL POSITION:</span>
                  <span>RWF {(totalRevenue - totalPayablesUnpaid).toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: RRA VAT & TAX COMPLIANCE */}
      {activeTab === 'vat_tax' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building className="w-5 h-5 text-sky-500" />
                <span>Rwanda Revenue Authority (RRA) VAT & Tax Compliance Control</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                18% Standard VAT Output vs Input calculation and PAYE payroll tax estimation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
              <div className="text-xs font-bold uppercase text-sky-400 mb-1">Output VAT Collected (18%)</div>
              <div className="text-xl font-black text-sky-300">RWF {Math.round(totalRevenue * (18 / 118)).toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-1">Calculated on RWF {totalRevenue.toLocaleString()} gross sales</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xs font-bold uppercase text-emerald-400 mb-1">Deductible Input VAT (18%)</div>
              <div className="text-xl font-black text-emerald-300">RWF {Math.round((totalPurchaseSpend + totalExpensesAmount) * (18 / 118)).toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-1">Calculated on vendor POs and expenses</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-xs font-bold uppercase text-amber-400 mb-1">Net Payable VAT to RRA</div>
              <div className="text-xl font-black text-amber-300">
                RWF {Math.max(0, Math.round(totalRevenue * (18 / 118)) - Math.round((totalPurchaseSpend + totalExpensesAmount) * (18 / 118))).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Output VAT minus Input VAT</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ACCOUNTS PAYABLE (SUPPLIERS & INVOICES) */}
      {activeTab === 'payables' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>Accounts Payable — Supplier Purchase Orders & Invoices</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Control supplier payments, verify received stock items, and settle outstanding purchase orders.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search supplier, PO #..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">PO Number & Date</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Item Breakdown</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-center">Intake Status</th>
                  <th className="p-3 text-center">Payment Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(purchaseOrders || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No Purchase Orders recorded in system.
                    </td>
                  </tr>
                ) : (
                  (purchaseOrders || [])
                    .filter(p => p && (
                      (p.supplierName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
                      (p.poNumber || '').toLowerCase().includes((searchQuery || '').toLowerCase())
                    ))
                    .map(po => {
                      const isUnpaid = po.paymentStatus !== 'Paid';
                      return (
                        <tr key={po.id} className="hover:bg-amber-500/5 transition">
                          <td className="p-3 font-bold font-mono">
                            {po.poNumber || 'PO-UNTITLED'}
                            <div className="text-[10px] text-slate-400 font-sans">{po.date || ''}</div>
                          </td>
                          <td className="p-3 font-bold text-amber-500">{po.supplierName || 'Unknown Supplier'}</td>
                          <td className="p-3">{po.department || 'General'}</td>
                          <td className="p-3 max-w-xs">
                            {(po.items || []).map(it => (
                              <div key={it.itemId || it.itemName || Math.random()} className="text-[11px] truncate">
                                • {it.itemName || 'Item'} ({it.quantity || 0} @ RWF {(it.unitCost || 0).toLocaleString()})
                              </div>
                            ))}
                          </td>
                          <td className="p-3 text-right font-black text-sm">
                            RWF {(po.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              po.status === 'Received' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              po.paymentStatus === 'Paid'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-rose-500 text-white animate-pulse'
                            }`}>
                              {po.paymentStatus || 'Unpaid'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {isUnpaid ? (
                              <button
                                onClick={() => setPayingPo(po)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                              >
                                Settle Payment
                              </button>
                            ) : (
                              <span className="text-emerald-500 font-bold text-[11px] flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Settle Verified
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNTS RECEIVABLE (CUSTOMER DEBTS) */}
      {activeTab === 'receivables' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Accounts Receivable — Outstanding Customer & Room Debts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track and collect unpaid POS sales orders, room bill charges, and waiter tab balances.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">Order # & Time</th>
                  <th className="p-3">Customer / Room / Table</th>
                  <th className="p-3">Waiter / Staff</th>
                  <th className="p-3">Items Summary</th>
                  <th className="p-3 text-right">Debt Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(orders || []).filter(o => o && o.paymentStatus !== 'PAID' && o.status !== 'Cancelled').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No unpaid customer debts recorded.
                    </td>
                  </tr>
                ) : (
                  (orders || [])
                    .filter(o => o && o.paymentStatus !== 'PAID' && o.status !== 'Cancelled')
                    .map(ord => (
                      <tr key={ord.id} className="hover:bg-amber-500/5 transition">
                        <td className="p-3 font-bold font-mono">
                          {ord.orderNumber || 'ORD-UNTITLED'}
                          <div className="text-[10px] text-slate-400 font-sans">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>
                        <td className="p-3 font-bold">
                          {ord.customerName || ord.roomNumber ? `Room ${ord.roomNumber}` : `Table ${ord.tableNumber || 'Bar'}`}
                        </td>
                        <td className="p-3">{ord.waiterName || ord.cashierName || 'Staff'}</td>
                        <td className="p-3 max-w-xs truncate">
                          {(ord.items || []).map(i => `${i.name || 'Item'} (x${i.quantity || 1})`).join(', ')}
                        </td>
                        <td className="p-3 text-right font-black text-rose-500 text-sm">
                          RWF {(ord.total || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-500">
                            Unpaid Credit
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setPayingOrder(ord)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                          >
                            Collect Debt
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASH & BANK LEDGER */}
      {(activeTab === 'overview' || activeTab === 'ledger') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                <span>General Ledger — Cash Movements & Bank Audit</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track bank deposits, petty cash withdrawals, and shift cashier reconciliations.
              </p>
            </div>
            <button
              onClick={() => setIsCashMovementModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Cash/Bank Movement</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">Timestamp & Ref</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reason / Description</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {cashMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No manual cash movements logged today.
                    </td>
                  </tr>
                ) : (
                  cashMovements.map(m => (
                    <tr key={m.id} className="hover:bg-amber-500/5 transition">
                      <td className="p-3 font-mono font-bold">
                        {m.referenceNumber || m.id.slice(-6)}
                        <div className="text-[10px] text-slate-400 font-sans">{m.date} {m.time}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type.includes('Deposit') 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3">{m.reason}</td>
                      <td className="p-3 font-bold">{m.performedBy}</td>
                      <td className={`p-3 text-right font-black text-sm ${
                        m.type.includes('Deposit') ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        RWF {m.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES CONTROL */}
      {activeTab === 'expenses' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-500" />
                <span>Operating Expense Controls & Vouchers</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorize and authorize resort operating expenses across Bar, Kitchen, Maintenance, and Payroll.
              </p>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Expense Voucher</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">Voucher # & Date</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Recipient / Vendor</th>
                  <th className="p-3">Authorized By</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No expense vouchers recorded.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-amber-500/5 transition">
                      <td className="p-3 font-mono font-bold">
                        {e.expenseNumber}
                        <div className="text-[10px] text-slate-400 font-sans">{e.timestamp}</div>
                      </td>
                      <td className="p-3 font-bold text-amber-500">{e.department}</td>
                      <td className="p-3">{e.category}</td>
                      <td className="p-3">{e.recipientName}</td>
                      <td className="p-3 font-bold">{e.authorizedBy}</td>
                      <td className="p-3 text-right font-black text-rose-500 text-sm">
                        RWF {e.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: COGS & PROFIT MARGINS */}
      {activeTab === 'cogs' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span>Cost of Goods Sold (COGS) & Margin Analysis</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit retail selling price vs cost price to ensure resort gross profit margin compliance (Target &gt; 40%).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-slate-400 font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3 text-right">Selling Price</th>
                  <th className="p-3 text-right">Profit / Unit</th>
                  <th className="p-3 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(menuItems || []).map(item => {
                  if (!item) return null;
                  const price = item.price || 0;
                  const cost = item.costPrice || Math.round(price * 0.6);
                  const profit = price - cost;
                  const marginPct = price > 0 ? Math.round((profit / price) * 100) : 0;
                  return (
                    <tr key={item.id || item.name} className="hover:bg-amber-500/5 transition">
                      <td className="p-3 font-bold">{item.name || 'Unnamed Item'}</td>
                      <td className="p-3">{item.category || 'General'}</td>
                      <td className="p-3 text-right font-mono">RWF {cost.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">RWF {price.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-500">RWF {profit.toLocaleString()}</td>
                      <td className="p-3 text-center font-black">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          marginPct >= 40 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: RECORD POS COLLECTION & BANK DEPOSIT */}
      {isPosDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-500" />
              <span>Record POS Money Collection & Bank Deposit</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Collect cashier shift money from POS register and log official bank deposit slip.
            </p>

            <form onSubmit={handleCreatePOSDeposit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Cashier / Register Name</label>
                  <input
                    type="text"
                    required
                    value={depCashier}
                    onChange={e => setDepCashier(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Deposit Destination</label>
                  <select
                    value={depDestination}
                    onChange={e => setDepDestination(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Bank Account">Official Bank Account</option>
                    <option value="Company Safe / Vault">Company Safe / Vault</option>
                    <option value="Petty Cash Reserve">Petty Cash Reserve</option>
                    <option value="Owner Handover">Owner Handover</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Bank Name</label>
                  <select
                    value={depBankName}
                    onChange={e => setDepBankName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Bank of Kigali (BK)">Bank of Kigali (BK)</option>
                    <option value="MTN MoMo Pay Merchant">MTN MoMo Pay Merchant</option>
                    <option value="Equity Bank Rwanda">Equity Bank Rwanda</option>
                    <option value="I&M Bank Rwanda">I&M Bank Rwanda</option>
                    <option value="Cogebanque / Equity">Cogebanque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Deposit Slip / Ref # *</label>
                  <input
                    type="text"
                    required
                    value={depSlipRef}
                    onChange={e => setDepSlipRef(e.target.value)}
                    placeholder="e.g. BK-SLIP-99021"
                    className="w-full p-2.5 rounded-xl border bg-transparent text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold uppercase text-amber-500">POS Register Sales Breakdown (Expected)</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">💵 Cash:</span>
                    <input
                      type="number"
                      value={depCashAmt}
                      onChange={e => setDepCashAmt(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg border bg-transparent text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">📱 MoMo:</span>
                    <input
                      type="number"
                      value={depMomoAmt}
                      onChange={e => setDepMomoAmt(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg border bg-transparent text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">💳 Card:</span>
                    <input
                      type="number"
                      value={depCardAmt}
                      onChange={e => setDepCardAmt(Number(e.target.value))}
                      className="w-full p-1.5 rounded-lg border bg-transparent text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Actual Amount Deposited to Bank (RWF) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={depDepositedAmt}
                  onChange={e => setDepDepositedAmt(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-sm font-black text-emerald-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Accountant Notes / Verification Details</label>
                <input
                  type="text"
                  value={depNotes}
                  onChange={e => setDepNotes(e.target.value)}
                  placeholder="e.g. Physical cash counted and matched bank deposit slip."
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPosDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer shadow-md"
                >
                  Verify & Record Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE SUPPLIER PO */}
      {payingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`rounded-3xl max-w-md w-full p-6 shadow-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-lg mb-2">Settle Supplier Invoice #{payingPo.poNumber}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Supplier: <strong>{payingPo.supplierName}</strong> | Amount Due: <strong className="text-emerald-500">RWF {payingPo.totalAmount.toLocaleString()}</strong>
            </p>

            <form onSubmit={handleSettleSupplierInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Payment Channel</label>
                <select
                  value={poPayMethod}
                  onChange={e => setPoPayMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Bank Transfer">Bank Transfer (BK / I&M)</option>
                  <option value="MOMO">MTN Mobile Money / Airtel Money</option>
                  <option value="CASH">Petty Cash</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  value={poPayRef}
                  onChange={e => setPoPayRef(e.target.value)}
                  placeholder="e.g. TXN-99882341 / BK-0091"
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingPo(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer"
                >
                  Confirm Settle Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT CUSTOMER DEBT */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`rounded-3xl max-w-md w-full p-6 shadow-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-lg mb-2">Collect Customer Debt #{payingOrder.orderNumber}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Debt Amount: <strong className="text-rose-500">RWF {payingOrder.total.toLocaleString()}</strong>
            </p>

            <form onSubmit={handleRecoverCustomerDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Payment Method</label>
                <select
                  value={orderPayMethod}
                  onChange={e => setOrderPayMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money (MoMo)</option>
                  <option value="CARD">VISA / Mastercard</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                >
                  Confirm Debt Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW EXPENSE VOUCHER */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`rounded-3xl max-w-md w-full p-6 shadow-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-lg mb-4">Record New Expense Voucher</h3>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Department</label>
                <select
                  value={expDept}
                  onChange={e => setExpDept(e.target.value as ExpenseDepartment)}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Bar">Bar & Beverage Store</option>
                  <option value="Kitchen">Kitchen & Food Store</option>
                  <option value="Pool & Sauna">Pool & Sauna</option>
                  <option value="Housekeeping">Rooms & Housekeeping</option>
                  <option value="Administration">Administration & Utilities</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Payroll">Staff Payroll / Advance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Expense Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expAmount || ''}
                  onChange={e => setExpAmount(Number(e.target.value))}
                  placeholder="e.g. 150000"
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Recipient / Vendor Name</label>
                <input
                  type="text"
                  value={expRecipient}
                  onChange={e => setExpRecipient(e.target.value)}
                  placeholder="e.g. Bralirwa / EUCL Electricity / Staff"
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Description / Voucher Notes</label>
                <textarea
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  placeholder="Details of expense voucher..."
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                >
                  Authorize Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW CASH MOVEMENT */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`rounded-3xl max-w-md w-full p-6 shadow-2xl border ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-lg mb-4">Record General Ledger Cash Movement</h3>

            <form onSubmit={handleCreateCashMovement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Movement Type</label>
                <select
                  value={cashType}
                  onChange={e => setCashType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Deposit to Bank">Bank Deposit (Cash --&gt; Bank)</option>
                  <option value="Withdrawal from Bank">Petty Cash Withdrawal (Bank --&gt; Cash)</option>
                  <option value="Capital Injection">Capital Injection (Owner --&gt; Business)</option>
                  <option value="Owner Draw">Owner Dividend / Draw</option>
                  <option value="Petty Cash Replenishment">Petty Cash Replenishment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={cashAmount || ''}
                  onChange={e => setCashAmount(Number(e.target.value))}
                  placeholder="e.g. 500000"
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Bank Ref / Slip Number</label>
                <input
                  type="text"
                  value={cashRef}
                  onChange={e => setCashRef(e.target.value)}
                  placeholder="e.g. BK-DEP-9901"
                  className="w-full p-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                >
                  Save Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
