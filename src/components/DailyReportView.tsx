import React, { useState } from 'react';
import { 
  FileBarChart, Printer, Download, FileSpreadsheet, Wine, 
  ChefHat, Waves, Flame, Building, DollarSign, Calendar, 
  TrendingUp, AlertTriangle, User, Search, PlusCircle, CreditCard,
  FileText, ShieldCheck, CheckCircle2, XCircle, ArrowUpRight,
  ArrowDownRight, RefreshCw, Phone, Clock, Tag, Layers, Check, X,
  ShoppingBag
} from 'lucide-react';
import { 
  Order, MenuItem, Shift, DailyReportData, Expense, CashMovement, 
  DailyClosingRecord, GuestRoom, AppUser, ExpenseDepartment, PaymentMethod,
  StockAdjustmentLog
} from '../types';
import { 
  printReportHTML, exportDailyReportPDF, exportDailyReportExcel,
  exportGenericPDF, exportGenericExcel 
} from '../lib/exporter';
import { formatCurrency } from '../lib/currency';

import { Language, getTranslation } from '../lib/translations';

interface DailyReportViewProps {
  orders: Order[];
  menuItems: MenuItem[];
  stockLogs?: StockAdjustmentLog[];
  currentShift?: Shift | null;
  allShifts?: Shift[];
  guestRooms?: GuestRoom[];
  expenses?: Expense[];
  cashMovements?: CashMovement[];
  dailyClosings?: DailyClosingRecord[];
  currentUser?: AppUser | null;
  onAddExpense?: (expense: Omit<Expense, 'id' | 'expenseNumber' | 'timestamp'>) => void;
  onAddCashMovement?: (movement: Omit<CashMovement, 'id' | 'timestamp' | 'date' | 'time'>) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onPrintReceipt?: (order: Order) => void;
  onUpdateDailyClosing?: (closings: DailyClosingRecord[]) => void;
  darkMode: boolean;
  language?: Language;
}

type ReportTab = 'summary' | 'bar' | 'credit' | 'expense' | 'cash_movement' | 'daily_closing';

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  orders,
  menuItems,
  stockLogs = [],
  currentShift,
  allShifts = [],
  guestRooms = [],
  expenses = [],
  cashMovements = [],
  dailyClosings = [],
  currentUser,
  onAddExpense,
  onAddCashMovement,
  onUpdateOrder,
  onPrintReceipt,
  onUpdateDailyClosing,
  darkMode,
  language = 'rw'
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState<boolean>(false);
  const [payingCreditOrder, setPayingCreditOrder] = useState<Order | null>(null);

  // New Expense Form State
  const [expDept, setExpDept] = useState<ExpenseDepartment>('Bar');
  const [expCategory, setExpCategory] = useState<string>('Purchased Drinks');
  const [expDesc, setExpDesc] = useState<string>('');
  const [expReqBy, setExpReqBy] = useState<string>(currentUser?.fullName || 'Manager');
  const [expAppBy, setExpAppBy] = useState<string>('General Manager');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expReason, setExpReason] = useState<string>('');

  // New Cash Movement Form State
  const [cashType, setCashType] = useState<CashMovement['movementType']>('Manual Adjustment');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cashReason, setCashReason] = useState<string>('');

  // Debt Payment Form State
  const [debtPayAmount, setDebtPayAmount] = useState<string>('');
  const [debtPayMethod, setDebtPayMethod] = useState<PaymentMethod>('Cash');

  // Flexible Date & Shift Matching Helper
  const matchesSelectedDate = (order: Order, targetDateStr?: string) => {
    if (!targetDateStr) return true;
    const datesToCheck = [order.createdAt, order.paidAt, order.updatedAt].filter(Boolean) as string[];
    
    for (const dStr of datesToCheck) {
      if (dStr.startsWith(targetDateStr)) return true;
      try {
        const localDateIso = new Date(dStr).toLocaleDateString('sv'); // 'YYYY-MM-DD'
        if (localDateIso === targetDateStr) return true;
      } catch (e) {}
    }
    
    if (order.businessDate) {
      if (order.businessDate.startsWith(targetDateStr)) return true;
      try {
        const targetFormatted = new Date(targetDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        if (order.businessDate === targetFormatted || order.businessDate.includes(targetDateStr)) return true;
      } catch (e) {}
    }
    return false;
  };

  // Filter Data by Selected Date
  const filteredOrders = orders.filter(o => {
    if (o.status === 'Cancelled') return false;
    return matchesSelectedDate(o, selectedDate);
  });

  const filteredExpenses = expenses.filter(e => {
    return e.date === selectedDate;
  });

  const filteredCashMovements = cashMovements.filter(c => {
    return c.date === selectedDate;
  });

  const filteredDailyClosings = dailyClosings.filter(d => {
    return d.date === selectedDate;
  });

  // Helper for paid orders
  const isPaidOrder = (o: Order) => {
    if (o.status === 'Cancelled') return false;
    if (o.paymentStatus === 'PAID' || o.status === 'Paid') return true;
    if ((o.status === 'Served' || (o.status as string) === 'Completed') && (o.balance <= 0.01 || (o.amountPaid && o.amountPaid >= o.total))) return true;
    if (o.amountPaid && o.amountPaid >= o.total && o.total > 0) return true;
    return false;
  };

  // Automatic Financial Calculations
  const paidOrders = filteredOrders.filter(isPaidOrder);

  const pendingOrders = filteredOrders.filter(
    o => !isPaidOrder(o) && o.paymentStatus !== 'CREDIT' && o.status !== 'Credit'
  );

  const creditOrders = orders.filter(
    o => o.status !== 'Cancelled' && (o.paymentStatus === 'CREDIT' || o.status === 'Credit' || (o.balance > 0 && o.paymentStatus === 'PARTIALLY PAID'))
  );

  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const discounts = paidOrders.reduce((sum, o) => sum + o.discount, 0);
  const netSalesRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

  // Pending / Unpaid Orders financial totals
  const pendingOrdersTotalValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  // Credit metrics
  const totalOutstandingCredit = creditOrders.reduce((sum, o) => sum + (o.balance > 0 ? o.balance : o.total - o.amountPaid), 0);
  const creditCollectedTotal = paidOrders.reduce((sum, o) => {
    if (o.paymentDetails?.method === 'Credit' && o.amountPaid > 0) return sum + o.amountPaid;
    return sum;
  }, 0);

  // Expense calculations
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netFinancialProfit = netSalesRevenue - totalExpensesAmount;

  // Payment Breakdown
  let cashCollected = 0;
  let cardCollected = 0;
  let mobileMoneyCollected = 0;
  let roomApartmentCollected = 0;

  paidOrders.forEach((o) => {
    if (o.paymentMethod === 'Cash') {
      cashCollected += o.total;
    } else if (o.paymentMethod === 'Card') {
      cardCollected += o.total;
    } else if (o.paymentMethod === 'Mobile Money') {
      mobileMoneyCollected += o.total;
    } else if (o.paymentMethod === 'Room Charge' || o.paymentMethod === 'Apartment Charge') {
      roomApartmentCollected += o.total;
    } else if (o.paymentMethod === 'Mixed' && o.paymentDetails) {
      cashCollected += o.paymentDetails.cashPaid || 0;
      cardCollected += o.paymentDetails.cardPaid || 0;
      mobileMoneyCollected += o.paymentDetails.mobileMoneyPaid || 0;
    }
  });

  // Departmental & Product Item Sales breakdown (Paid vs Pending vs Total)
  let barDrinkRevenuePaid = 0;
  let barDrinkRevenuePending = 0;
  let drinksSoldQtyPaid = 0;
  let drinksSoldQtyPending = 0;

  let kitchenFoodRevenuePaid = 0;
  let kitchenFoodRevenuePending = 0;
  let foodOrdersCountPaid = 0;
  let foodOrdersCountPending = 0;

  let poolRevenue = 0;
  let poolPassesCount = 0;
  let saunaRevenue = 0;
  let saunaSessionsCount = 0;
  let roomRevenue = 0;
  let apartmentRevenue = 0;

  const drinkSalesMap: { 
    [name: string]: { 
      qtyPaid: number; 
      qtyPending: number; 
      qtyTotal: number; 
      revenuePaid: number; 
      revenuePending: number; 
      revenueTotal: number;
    } 
  } = {};

  filteredOrders.forEach((o) => {
    const isPaid = o.paymentStatus === 'PAID' || o.status === 'Paid';
    let orderHasFood = false;

    o.items.forEach((item) => {
      const itemRev = item.totalPrice;
      const itemQty = item.quantity;

      if (item.category === 'Food' || item.isFood) {
        if (isPaid) {
          kitchenFoodRevenuePaid += itemRev;
        } else {
          kitchenFoodRevenuePending += itemRev;
        }
        orderHasFood = true;
      } else if (item.category === 'Pool Services') {
        poolRevenue += itemRev;
        poolPassesCount += itemQty;
      } else if (item.category === 'Sauna Services') {
        saunaRevenue += itemRev;
        saunaSessionsCount += itemQty;
      } else {
        // Bar Drink
        if (isPaid) {
          barDrinkRevenuePaid += itemRev;
          drinksSoldQtyPaid += itemQty;
        } else {
          barDrinkRevenuePending += itemRev;
          drinksSoldQtyPending += itemQty;
        }

        if (!drinkSalesMap[item.name]) {
          drinkSalesMap[item.name] = { 
            qtyPaid: 0, 
            qtyPending: 0, 
            qtyTotal: 0, 
            revenuePaid: 0, 
            revenuePending: 0, 
            revenueTotal: 0 
          };
        }

        if (isPaid) {
          drinkSalesMap[item.name].qtyPaid += itemQty;
          drinkSalesMap[item.name].revenuePaid += itemRev;
        } else {
          drinkSalesMap[item.name].qtyPending += itemQty;
          drinkSalesMap[item.name].revenuePending += itemRev;
        }
        drinkSalesMap[item.name].qtyTotal += itemQty;
        drinkSalesMap[item.name].revenueTotal += itemRev;
      }
    });

    if (orderHasFood) {
      if (isPaid) foodOrdersCountPaid++;
      else foodOrdersCountPending++;
    }

    if (o.servicesIncluded?.includes('Rooms') || o.paymentMethod === 'Room Charge') {
      roomRevenue += o.total;
    }
    if (o.servicesIncluded?.includes('Apartments') || o.paymentMethod === 'Apartment Charge') {
      apartmentRevenue += o.total;
    }
  });

  const bestSellingDrinks = Object.entries(drinkSalesMap)
    .map(([name, data]) => ({ 
      name, 
      qtyPaid: data.qtyPaid,
      qtyPending: data.qtyPending,
      qtyTotal: data.qtyTotal,
      revenuePaid: data.revenuePaid,
      revenuePending: data.revenuePending,
      revenueTotal: data.revenueTotal
    }))
    .sort((a, b) => b.qtyTotal - a.qtyTotal);

  // Helper for Order Descriptions
  const getOrderDescription = (order: Order): string => {
    if (order.items && order.items.length > 0) {
      const itemsText = order.items.map(i => `${i.quantity} ${i.name}`).join(', ');
      return `Sold: ${itemsText}`;
    }
    if (order.paymentMethod === 'Room Charge' || order.guestRoomId) {
      return `Room Charge (${order.paymentDetails?.roomOrAptNumber || 'Room'})`;
    }
    if (order.paymentMethod === 'Apartment Charge') {
      return `Apartment Charge (${order.paymentDetails?.roomOrAptNumber || 'Apartment'})`;
    }
    return 'General POS Sale';
  };

  // Helper for Department identification
  const getOrderDepartment = (order: Order): string => {
    if (order.items.some(i => i.category === 'Pool Services')) return 'Pool';
    if (order.items.some(i => i.category === 'Sauna Services')) return 'Sauna';
    if (order.items.some(i => i.category === 'Food' || i.isFood)) return 'Kitchen';
    if (order.paymentMethod === 'Room Charge' || order.servicesIncluded?.includes('Rooms')) return 'Rooms';
    if (order.paymentMethod === 'Apartment Charge' || order.servicesIncluded?.includes('Apartments')) return 'Apartments';
    return 'Bar';
  };

  // Handlers for New Expense
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0) return;

    if (onAddExpense) {
      onAddExpense({
        department: expDept,
        category: expCategory,
        description: expDesc || `Expense for ${expCategory}`,
        requestedBy: expReqBy || 'Staff',
        approvedBy: expAppBy || 'Manager',
        amount: amt,
        reason: expReason || 'Operational Expense',
        date: selectedDate
      });
    }

    setIsExpenseModalOpen(false);
    setExpDesc('');
    setExpAmount('');
    setExpReason('');
  };

  // Handlers for Cash Adjustment
  const handleCreateCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cashAmount);
    if (!amt) return;

    if (onAddCashMovement) {
      onAddCashMovement({
        amount: cashType === 'Expense Paid' || cashType === 'Refund' ? -Math.abs(amt) : Math.abs(amt),
        movementType: cashType,
        reason: cashReason || 'Manual Cash Float Movement',
        user: currentUser?.fullName || 'Cashier',
        shiftId: currentShift?.id
      });
    }

    setIsCashModalOpen(false);
    setCashAmount('');
    setCashReason('');
  };

  // Handlers for Collecting Debt Payment
  const handleCollectDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCreditOrder) return;
    const payVal = parseFloat(debtPayAmount);
    if (!payVal || payVal <= 0) return;

    const remaining = payingCreditOrder.balance > 0 ? payingCreditOrder.balance : payingCreditOrder.total - payingCreditOrder.amountPaid;
    const newPaid = payingCreditOrder.amountPaid + payVal;
    const newBalance = Math.max(0, remaining - payVal);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';
    const newPaymentStatus = newBalance === 0 ? 'PAID' : 'PARTIALLY PAID';

    const updatedOrder: Order = {
      ...payingCreditOrder,
      amountPaid: newPaid,
      balance: newBalance,
      status: newStatus as any,
      paymentStatus: newPaymentStatus as any,
      paymentMethod: debtPayMethod,
      paymentTransactions: [
        ...(payingCreditOrder.paymentTransactions || []),
        {
          id: `TXN-${Date.now()}`,
          orderId: payingCreditOrder.id,
          amount: payVal,
          paymentMethod: debtPayMethod,
          timestamp: new Date().toISOString(),
          cashierName: currentUser?.fullName || 'Cashier',
          note: `Credit Debt Collection`
        }
      ]
    };

    if (onUpdateOrder) {
      onUpdateOrder(updatedOrder);
    }

    if (debtPayMethod === 'Cash' && onAddCashMovement) {
      onAddCashMovement({
        amount: payVal,
        movementType: 'Credit Payment Received',
        reason: `Debt Collection from ${payingCreditOrder.customerName || 'Customer'} (Receipt ${payingCreditOrder.id})`,
        user: currentUser?.fullName || 'Cashier',
        shiftId: currentShift?.id,
        referenceId: payingCreditOrder.id
      });
    }

    setPayingCreditOrder(null);
    setDebtPayAmount('');
  };

  // Variance Approval
  const handleApproveVariance = (closingRecord: DailyClosingRecord, newStatus: 'Approved' | 'Rejected') => {
    if (!onUpdateDailyClosing) return;
    const updated = dailyClosings.map(d => d.id === closingRecord.id ? {
      ...d,
      varianceStatus: newStatus,
      approvedBy: currentUser?.fullName || 'Manager'
    } : d);
    onUpdateDailyClosing(updated);
  };

  // Export handlers
  const handleExportPDF = () => {
    if (activeTab === 'summary') {
      const reportData: DailyReportData = {
        date: selectedDate,
        generatedAt: new Date().toISOString(),
        cashierName: currentShift?.cashierName || 'Bar Cashier',
        totalDrinkSales: barDrinkRevenuePaid + barDrinkRevenuePending,
        drinksSoldQty: drinksSoldQtyPaid + drinksSoldQtyPending,
        bestSellingDrinks: bestSellingDrinks.map(d => ({ name: d.name, qty: d.qtyTotal, revenue: d.revenueTotal })),
        currentStockValue: menuItems.reduce((s, i) => s + (i.price * i.stockQuantity), 0),
        lowStockItemsCount: menuItems.filter(i => i.stockQuantity <= 5).length,
        totalFoodOrders: foodOrdersCountPaid + foodOrdersCountPending,
        foodRevenue: kitchenFoodRevenuePaid + kitchenFoodRevenuePending,
        poolRevenue,
        poolVisitorsCount: poolPassesCount,
        saunaRevenue,
        saunaVisitorsCount: saunaSessionsCount,
        roomRevenue,
        apartmentRevenue,
        totalOrders: filteredOrders.length,
        paidOrdersCount: paidOrders.length,
        unpaidOrdersCount: filteredOrders.filter(o => o.paymentStatus === 'UNPAID').length,
        creditOrdersCount: creditOrders.length,
        partialPaymentsTotal: filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === 'PARTIALLY PAID' ? o.amountPaid : 0), 0),
        outstandingBalanceTotal: totalOutstandingCredit,
        totalTransactions: paidOrders.length,
        grossRevenue,
        discounts,
        netRevenue: netSalesRevenue,
        cashCollected,
        cardCollected,
        mobileMoneyCollected,
        creditCollected: creditCollectedTotal,
        outstandingRoomCharges: roomApartmentCollected
      };
      exportDailyReportPDF(reportData);
    } else if (activeTab === 'expense') {
      const headers = ['Exp #', 'Date', 'Dept', 'Category', 'Description', 'Req By', 'App By', 'Amount (RWF)'];
      const rows = filteredExpenses.map(e => [
        e.expenseNumber, e.date, e.department, e.category, e.description, e.requestedBy, e.approvedBy, formatCurrency(e.amount)
      ]);
      exportGenericPDF('EXPENSE FINANCIAL REPORT', `Date: ${selectedDate}`, headers, rows, `Expense_Report_${selectedDate}`);
    } else if (activeTab === 'credit') {
      const headers = ['Receipt #', 'Customer', 'Phone', 'Date', 'Total Bill', 'Paid', 'Balance', 'Status'];
      const rows = creditOrders.map(o => [
        o.orderNumber || o.id,
        o.customerName || 'Guest',
        o.customerPhone || 'N/A',
        o.createdAt.split('T')[0],
        formatCurrency(o.total),
        formatCurrency(o.amountPaid),
        formatCurrency(o.balance > 0 ? o.balance : o.total - o.amountPaid),
        o.paymentStatus || o.status
      ]);
      exportGenericPDF('CREDIT & DEBT REPORT', `Date: ${selectedDate}`, headers, rows, `Credit_Report_${selectedDate}`);
    } else if (activeTab === 'cash_movement') {
      const headers = ['Time', 'Type', 'Amount (RWF)', 'Reason', 'Cashier', 'Ref ID'];
      const rows = filteredCashMovements.map(m => [
        m.time, m.movementType, formatCurrency(m.amount), m.reason, m.user, m.referenceId || '-'
      ]);
      exportGenericPDF('CASH MOVEMENT LEDGER REPORT', `Date: ${selectedDate}`, headers, rows, `Cash_Movement_${selectedDate}`);
    } else if (activeTab === 'daily_closing') {
      const headers = ['Date', 'Closed By', 'Opening', 'Cash Sales', 'Expected', 'Actual', 'Variance', 'Status'];
      const rows = filteredDailyClosings.map(d => [
        d.date, d.closedBy, formatCurrency(d.openingCash), formatCurrency(d.cashSales), formatCurrency(d.expectedCash), formatCurrency(d.actualCash), formatCurrency(d.difference), d.varianceStatus
      ]);
      exportGenericPDF('DAILY CLOSING & VARIANCE AUDIT REPORT', `Date: ${selectedDate}`, headers, rows, `Daily_Closing_${selectedDate}`);
    } else {
      const headers = ['Txn #', 'Time', 'Customer', 'Waiter', 'Cashier', 'Dept', 'Description', 'Method', 'Status', 'Total', 'Paid', 'Balance'];
      const rows = paidOrders.map(o => [
        o.orderNumber || o.id,
        new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        o.customerName || 'Walk-in Guest',
        o.waiterName || 'N/A',
        o.cashierName || 'Cashier',
        getOrderDepartment(o),
        getOrderDescription(o),
        o.paymentMethod,
        o.paymentStatus,
        formatCurrency(o.total),
        formatCurrency(o.amountPaid),
        formatCurrency(o.balance)
      ]);
      exportGenericPDF('TRANSACTIONS REPORT', `Date: ${selectedDate}`, headers, rows, `Transactions_Report_${selectedDate}`);
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'summary') {
      const reportData: DailyReportData = {
        date: selectedDate,
        generatedAt: new Date().toISOString(),
        cashierName: currentShift?.cashierName || 'Bar Cashier',
        totalDrinkSales: barDrinkRevenuePaid + barDrinkRevenuePending,
        drinksSoldQty: drinksSoldQtyPaid + drinksSoldQtyPending,
        bestSellingDrinks: bestSellingDrinks.map(d => ({ name: d.name, qty: d.qtyTotal, revenue: d.revenueTotal })),
        currentStockValue: menuItems.reduce((s, i) => s + (i.price * i.stockQuantity), 0),
        lowStockItemsCount: menuItems.filter(i => i.stockQuantity <= 5).length,
        totalFoodOrders: foodOrdersCountPaid + foodOrdersCountPending,
        foodRevenue: kitchenFoodRevenuePaid + kitchenFoodRevenuePending,
        poolRevenue,
        poolVisitorsCount: poolPassesCount,
        saunaRevenue,
        saunaVisitorsCount: saunaSessionsCount,
        roomRevenue,
        apartmentRevenue,
        totalOrders: filteredOrders.length,
        paidOrdersCount: paidOrders.length,
        unpaidOrdersCount: filteredOrders.filter(o => o.paymentStatus === 'UNPAID').length,
        creditOrdersCount: creditOrders.length,
        partialPaymentsTotal: filteredOrders.reduce((sum, o) => sum + (o.paymentStatus === 'PARTIALLY PAID' ? o.amountPaid : 0), 0),
        outstandingBalanceTotal: totalOutstandingCredit,
        totalTransactions: paidOrders.length,
        grossRevenue,
        discounts,
        netRevenue: netSalesRevenue,
        cashCollected,
        cardCollected,
        mobileMoneyCollected,
        creditCollected: creditCollectedTotal,
        outstandingRoomCharges: roomApartmentCollected
      };
      exportDailyReportExcel(reportData);
    } else {
      const headers = ['Txn #', 'Date', 'Customer', 'Dept', 'Description', 'Status', 'Total Amount', 'Paid Amount', 'Remaining Balance'];
      const rows = filteredOrders.map(o => [
        o.orderNumber || o.id,
        o.createdAt.split('T')[0],
        o.customerName || 'Guest',
        getOrderDepartment(o),
        getOrderDescription(o),
        o.paymentStatus,
        o.total,
        o.amountPaid,
        o.balance
      ]);
      exportGenericExcel(`Report_${activeTab}_${selectedDate}`, 'Report', headers, rows);
    }
  };

  const handlePrint = () => {
    let html = `<h1>HOTEL & RESORT FINANCIAL REPORT</h1><p>Date: ${selectedDate}</p>`;
    html += `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;">`;
    html += `<thead><tr><th>Txn #</th><th>Customer</th><th>Dept</th><th>Description</th><th>Total</th><th>Status</th></tr></thead><tbody>`;
    filteredOrders.forEach(o => {
      html += `<tr><td>${o.orderNumber || o.id}</td><td>${o.customerName || 'Guest'}</td><td>${getOrderDepartment(o)}</td><td>${getOrderDescription(o)}</td><td>${formatCurrency(o.total)}</td><td>${o.paymentStatus}</td></tr>`;
    });
    html += `</tbody></table>`;
    printReportHTML(`Report ${selectedDate}`, html);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileBarChart className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Hotel & Resort Comprehensive Report Center
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatic real-time calculation of revenue, expenses, credit debts, cash movements, and closing variances.
              </p>
            </div>
          </div>

          {/* Date Selector & Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-gray-500">Business Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-bold flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-xs font-bold flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>PDF Report</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 no-scrollbar">
          {[
            { id: 'summary', label: 'Financial Summary & All Txns', icon: DollarSign },
            { id: 'bar', label: 'Bar & Kitchen Report', icon: Wine },
            { id: 'credit', label: `Credit Debt Report (${creditOrders.length})`, icon: CreditCard },
            { id: 'expense', label: `Expense Report (${filteredExpenses.length})`, icon: ArrowDownRight },
            { id: 'cash_movement', label: 'Cash Movement Ledger', icon: RefreshCw },
            { id: 'daily_closing', label: 'Daily Closing & Variance Audit', icon: ShieldCheck }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ReportTab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------- TAB 1: FINANCIAL SUMMARY & MASTER TRANSACTIONS ------------------- */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Gross Sales Revenue</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(grossRevenue)}</p>
              <p className="text-[10px] text-gray-500 mt-1">{paidOrders.length} Completed Orders</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Total Expenses</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatCurrency(totalExpensesAmount)}</p>
              <p className="text-[10px] text-rose-500 mt-1">{filteredExpenses.length} Expense Vouchers</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Net Revenue (Profit)</p>
              <p className={`text-xl font-black mt-1 ${netFinancialProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatCurrency(netFinancialProfit)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Sales minus Expenses</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Outstanding Credit</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(totalOutstandingCredit)}</p>
              <p className="text-[10px] text-amber-500 mt-1">{creditOrders.length} Unpaid Customer Debts</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Cash Collected</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(cashCollected)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Physical Drawer Cash</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Digital / Card / MoMo</p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{formatCurrency(cardCollected + mobileMoneyCollected)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Card + Mobile Money</p>
            </div>
          </div>

          {/* Departmental Revenue Breakdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Bar (Drinks Dispatched)</span>
                <Wine className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(barDrinkRevenuePaid + barDrinkRevenuePending)}</p>
              <p className="text-[10px] text-gray-400">
                {drinksSoldQtyPaid + drinksSoldQtyPending} units ({drinksSoldQtyPaid} Paid, {drinksSoldQtyPending} Pending)
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Kitchen (Food Sales)</span>
                <ChefHat className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(kitchenFoodRevenuePaid + kitchenFoodRevenuePending)}</p>
              <p className="text-[10px] text-gray-400">
                {foodOrdersCountPaid + foodOrdersCountPending} food orders ({foodOrdersCountPaid} Paid, {foodOrdersCountPending} Pending)
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Pool & Sauna</span>
                <Waves className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(poolRevenue + saunaRevenue)}</p>
              <p className="text-[10px] text-gray-400">{poolPassesCount} pool, {saunaSessionsCount} sauna</p>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Rooms & Suites</span>
                <Building className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(roomRevenue + apartmentRevenue)}</p>
              <p className="text-[10px] text-gray-400">Hotel Guest Folio Charges</p>
            </div>
          </div>

          {/* Master Transactions Ledger Table */}
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  Ibyacurujwe & Imyenda (Sales & Transaction Ledger)
                </h3>
                <p className="text-xs text-gray-500">
                  Detailed list of all sales orders, highlighting paid transactions and outstanding unpaid balances.
                </p>
              </div>

              {/* Search Filter */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search receipt, customer, waiter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quick Status Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xs">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ibyacurujwe Byose / Total Sales</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">
                    {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.total, 0))}
                  </p>
                  <p className="text-[10px] text-gray-500">{filteredOrders.length} Orders Recorded</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Ibyishyuwe / Total Paid</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(netSalesRevenue)}
                  </p>
                  <p className="text-[10px] text-emerald-600/80">{paidOrders.length} Paid Orders</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2 rounded-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Ibitarishyuwe / Total Unpaid / Credit</p>
                  <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                    {formatCurrency(totalOutstandingCredit + pendingOrdersTotalValue)}
                  </p>
                  <p className="text-[10px] text-amber-600/80">{pendingOrders.length + creditOrders.length} Unpaid / Credit Orders</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-3 px-2">Txn #</th>
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2">Customer Name</th>
                    <th className="py-3 px-2">Waiter</th>
                    <th className="py-3 px-2">Cashier</th>
                    <th className="py-3 px-2">Dept</th>
                    <th className="py-3 px-2">Description</th>
                    <th className="py-3 px-2">Method</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Total</th>
                    <th className="py-3 px-2 text-right">Paid</th>
                    <th className="py-3 px-2 text-right">Remaining</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {orders.length === 0 
                              ? "Nta cyacurujwe kirabandikwa mu sisitemu / No sales orders recorded in the system yet."
                              : `Nta cyacurujwe kibonetse ku date ya ${selectedDate} / No orders match the selected filter.`}
                          </p>
                          {orders.length > 0 && (
                            <button
                              onClick={() => setSelectedShiftId('all_shifts')}
                              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            >
                              Show All {orders.length} System Orders (All Shifts & Dates)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders
                      .filter(o => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          (o.orderNumber || o.id).toLowerCase().includes(q) ||
                          (o.customerName || '').toLowerCase().includes(q) ||
                          (o.waiterName || '').toLowerCase().includes(q) ||
                          (o.cashierName || '').toLowerCase().includes(q)
                        );
                      })
                      .map((order) => {
                        const remBalance = order.balance > 0 ? order.balance : Math.max(0, order.total - order.amountPaid);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {order.orderNumber || order.id}
                            </td>
                            <td className="py-3 px-2 text-gray-500">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                              {order.customerName || 'Walk-in Guest'}
                            </td>
                            <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                              {order.waiterName || 'N/A'}
                            </td>
                            <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                              {order.cashierName || 'Cashier'}
                            </td>
                            <td className="py-3 px-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {getOrderDepartment(order)}
                              </span>
                            </td>
                            <td className="py-3 px-2 max-w-xs truncate text-gray-800 dark:text-gray-200">
                              {getOrderDescription(order)}
                            </td>
                            <td className="py-3 px-2 font-bold text-gray-700 dark:text-gray-300">
                              {order.paymentMethod}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.paymentStatus === 'PAID' || order.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : order.paymentStatus === 'CREDIT' || order.status === 'Credit'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}>
                                {order.paymentStatus || order.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-gray-900 dark:text-white">
                              {formatCurrency(order.total)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(order.amountPaid)}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(remBalance)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                {onPrintReceipt && (
                                  <button
                                    onClick={() => onPrintReceipt(order)}
                                    title="Print Receipt"
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {remBalance > 0 && (
                                  <button
                                    onClick={() => {
                                      setPayingCreditOrder(order);
                                      setDebtPayAmount(String(remBalance));
                                    }}
                                    title="Receive Payment"
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center space-x-1 shadow-xs transition-colors"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ------------------- TAB 2: BAR & KITCHEN DETAILED REPORT ------------------- */}
      {activeTab === 'bar' && (
        <div className="space-y-6">
          
          {/* Top KPI Cards for Bar Stock Movement */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Dispatched Drinks</span>
              <span className="text-xl font-black text-amber-500 mt-1 block">{drinksSoldQtyPaid + drinksSoldQtyPending} units</span>
              <span className="text-[10px] text-gray-500">{drinksSoldQtyPaid} Paid + {drinksSoldQtyPending} Pending in Open Tables</span>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Drink Value Dispatched</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{formatCurrency(barDrinkRevenuePaid + barDrinkRevenuePending)}</span>
              <span className="text-[10px] text-gray-500">{formatCurrency(barDrinkRevenuePaid)} Paid / {formatCurrency(barDrinkRevenuePending)} Pending</span>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kitchen Food Orders</span>
              <span className="text-xl font-black text-orange-500 mt-1 block">{foodOrdersCountPaid + foodOrdersCountPending} Orders</span>
              <span className="text-[10px] text-gray-500">{foodOrdersCountPaid} Paid + {foodOrdersCountPending} Pending</span>
            </div>

            <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Food Revenue</span>
              <span className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1 block">{formatCurrency(kitchenFoodRevenuePaid + kitchenFoodRevenuePending)}</span>
              <span className="text-[10px] text-gray-500">{formatCurrency(kitchenFoodRevenuePaid)} Paid / {formatCurrency(kitchenFoodRevenuePending)} Pending</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Top Selling & Dispatched Drinks Breakdown */}
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wine className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Drink Item Sales & Stock Dispatched</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Paid + Pending Included
                </span>
              </div>

              <div className="space-y-3">
                {bestSellingDrinks.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No drink sales recorded for {selectedDate}.</p>
                ) : (
                  bestSellingDrinks.map((item, idx) => (
                    <div key={item.name} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-gray-900 dark:text-white">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">{item.qtyPaid} Paid</span>
                            <span>•</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">{item.qtyPending} Pending</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-slate-900 dark:text-white block">
                          {item.qtyTotal} units dispatched
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.revenueTotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Food & Kitchen Summary */}
            <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center space-x-2 mb-4">
                <ChefHat className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Kitchen & Food Sales</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Paid Food Revenue</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(kitchenFoodRevenuePaid)}</p>
                  <p className="text-[10px] text-gray-400">{foodOrdersCountPaid} Orders Paid</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Pending Food Orders</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(kitchenFoodRevenuePending)}</p>
                  <p className="text-[10px] text-gray-400">{foodOrdersCountPending} Orders Open</p>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Kitchen tickets are automatically routed to the kitchen display screen and tracked upon completion. Pending orders are accounted for in total stock dispatch.
              </p>
            </div>
          </div>

          {/* Itemized Receipts List */}
          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
              Bar & Kitchen Itemized Receipts ({filteredOrders.length})
            </h3>

            <div className="space-y-3">
              {filteredOrders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2 mb-3 gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                        Receipt #{ord.orderNumber || ord.id}
                      </span>
                      <span className="text-xs text-gray-500 ml-3">
                        Guest: <strong className="text-gray-900 dark:text-white">{ord.customerName || 'Walk-in'}</strong>
                      </span>
                      <span className="text-xs text-gray-500 ml-3">
                        Waiter: <strong>{ord.waiterName || 'N/A'}</strong> | Cashier: <strong>{ord.cashierName || 'Staff'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-gray-700">
                        {ord.paymentMethod}
                      </span>
                      <span className="font-black text-sm text-gray-900 dark:text-white">
                        {formatCurrency(ord.total)}
                      </span>
                    </div>
                  </div>

                  {/* Items sold table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="p-2 rounded bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex justify-between">
                        <span>{it.quantity}x {it.name}</span>
                        <span className="font-bold">{formatCurrency(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------- TAB 3: CREDIT (DEBT) REPORT ------------------- */}
      {activeTab === 'credit' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-400 text-lg">
                Total Outstanding Customer Debts: {formatCurrency(totalOutstandingCredit)}
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                Track every unpaid receipt, partial balance, customer contact details, and record debt payments.
              </p>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
              Customer Debt Accounts & Unpaid Receipts
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-3 px-2">Receipt #</th>
                    <th className="py-3 px-2">Customer Name</th>
                    <th className="py-3 px-2">Phone Number</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2 text-right">Total Bill</th>
                    <th className="py-3 px-2 text-right">Paid</th>
                    <th className="py-3 px-2 text-right">Outstanding Balance</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {creditOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        No active customer credit debts found. All bills are fully paid!
                      </td>
                    </tr>
                  ) : (
                    creditOrders.map((ord) => {
                      const balance = ord.balance > 0 ? ord.balance : ord.total - ord.amountPaid;
                      return (
                        <tr key={ord.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {ord.orderNumber || ord.id}
                          </td>
                          <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                            {ord.customerName || 'Customer'}
                          </td>
                          <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                            {ord.customerPhone || 'N/A'}
                          </td>
                          <td className="py-3 px-2 text-gray-500">
                            {ord.createdAt.split('T')[0]}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-gray-900 dark:text-white">
                            {formatCurrency(ord.total)}
                          </td>
                          <td className="py-3 px-2 text-right font-bold text-emerald-600">
                            {formatCurrency(ord.amountPaid)}
                          </td>
                          <td className="py-3 px-2 text-right font-black text-rose-600">
                            {formatCurrency(balance)}
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                              {balance === 0 ? 'Fully Paid' : ord.amountPaid > 0 ? 'Partially Paid' : 'Outstanding'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {balance > 0 && (
                              <button
                                onClick={() => {
                                  setPayingCreditOrder(ord);
                                  setDebtPayAmount(balance.toFixed(2));
                                }}
                                className="px-2.5 py-1 rounded.lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center space-x-1 mx-auto"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Receive Payment</span>
                              </button>
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
        </div>
      )}

      {/* ------------------- TAB 4: EXPENSE REPORT ------------------- */}
      {activeTab === 'expense' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <div>
              <h3 className="font-bold text-rose-800 dark:text-rose-400 text-lg">
                Total Expenses for {selectedDate}: {formatCurrency(totalExpensesAmount)}
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400/80">
                All store, kitchen, generator fuel, utility, and maintenance payouts.
              </p>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record New Expense Voucher</span>
            </button>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
              Expense Transactions List
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-3 px-2">Exp #</th>
                    <th className="py-3 px-2">Department</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Description</th>
                    <th className="py-3 px-2">Requested By</th>
                    <th className="py-3 px-2">Approved By</th>
                    <th className="py-3 px-2">Reason</th>
                    <th className="py-3 px-2 text-right">Amount (RWF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No expense records logged for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {exp.expenseNumber}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800">
                            {exp.department}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                          {exp.category}
                        </td>
                        <td className="py-3 px-2 text-gray-700 dark:text-gray-300">
                          {exp.description}
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                          {exp.requestedBy}
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                          {exp.approvedBy}
                        </td>
                        <td className="py-3 px-2 text-gray-500">
                          {exp.reason}
                        </td>
                        <td className="py-3 px-2 text-right font-black text-rose-600 dark:text-rose-400">
                          {formatCurrency(exp.amount)}
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

      {/* ------------------- TAB 5: CASH MOVEMENT LEDGER ------------------- */}
      {activeTab === 'cash_movement' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div>
              <h3 className="font-bold text-indigo-800 dark:text-indigo-400 text-lg">
                Physical Cash Ledger for {selectedDate}
              </h3>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80">
                Complete record of opening cash float, sales income, credit collections, expense payouts, and closing cash counts.
              </p>
            </div>

            <button
              onClick={() => setIsCashModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Record Cash Float / Manual Movement</span>
            </button>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
              Cash Drawer Movement Log
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2">Movement Type</th>
                    <th className="py-3 px-2">Reason / Description</th>
                    <th className="py-3 px-2">User / Cashier</th>
                    <th className="py-3 px-2">Reference ID</th>
                    <th className="py-3 px-2 text-right">Cash Amount (RWF)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredCashMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No cash movements recorded for {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredCashMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-mono text-gray-500">
                          {mov.time}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mov.amount >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}>
                            {mov.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">
                          {mov.reason}
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                          {mov.user}
                        </td>
                        <td className="py-3 px-2 font-mono text-gray-400">
                          {mov.referenceId || '-'}
                        </td>
                        <td className={`py-3 px-2 text-right font-black ${
                          mov.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {mov.amount >= 0 ? '+' : ''}{formatCurrency(mov.amount)}
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

      {/* ------------------- TAB 6: DAILY CLOSING & VARIANCE AUDIT ------------------- */}
      {activeTab === 'daily_closing' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <h3 className="font-bold text-indigo-800 dark:text-indigo-400 text-lg">
              Daily Shift Closing & Cash Drawer Discrepancy Audit
            </h3>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80">
              Managers can review expected vs actual cash counted by cashiers at shift close, review explanations, and approve variances.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
              Shift Closing Reconciliation Logs
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                    <th className="py-3 px-2">Shift Date</th>
                    <th className="py-3 px-2">Cashier / Closed By</th>
                    <th className="py-3 px-2 text-right">Opening Float</th>
                    <th className="py-3 px-2 text-right">Cash Sales</th>
                    <th className="py-3 px-2 text-right">Expected Drawer</th>
                    <th className="py-3 px-2 text-right">Actual Counted</th>
                    <th className="py-3 px-2 text-right">Variance</th>
                    <th className="py-3 px-2">Explanation</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-center">Manager Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredDailyClosings.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-400">
                        No shift closings logged for {selectedDate}. Cashier shifts can be closed in the Cashier Shift Register tab.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyClosings.map((closing) => (
                      <tr key={closing.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-mono text-gray-500">
                          {closing.date}
                        </td>
                        <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                          {closing.closedBy}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(closing.openingCash)}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-emerald-600">
                          {formatCurrency(closing.cashSales)}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-indigo-600">
                          {formatCurrency(closing.expectedCash)}
                        </td>
                        <td className="py-3 px-2 text-right font-black text-gray-900 dark:text-white">
                          {formatCurrency(closing.actualCash)}
                        </td>
                        <td className={`py-3 px-2 text-right font-black ${
                          closing.difference === 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}>
                          {formatCurrency(closing.difference)}
                        </td>
                        <td className="py-3 px-2 max-w-xs truncate text-gray-600 dark:text-gray-400">
                          {closing.differenceReason || 'Balanced'}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            closing.varianceStatus === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : closing.varianceStatus === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}>
                            {closing.varianceStatus}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {closing.varianceStatus === 'Pending Review' && (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleApproveVariance(closing, 'Approved')}
                                className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Approve Variance"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApproveVariance(closing, 'Rejected')}
                                className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white"
                                title="Reject Variance"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* ------------------- EXPENSE MODAL ------------------- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
            darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Record Expense Voucher</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Department</label>
                <select
                  value={expDept}
                  onChange={(e) => setExpDept(e.target.value as ExpenseDepartment)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                >
                  <option value="Bar">Bar</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Pool & Sauna">Pool & Sauna</option>
                  <option value="Rooms">Rooms</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Administration">Administration</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                >
                  <option value="Purchased Meat">Purchased Meat</option>
                  <option value="Purchased Vegetables">Purchased Vegetables</option>
                  <option value="Purchased Drinks">Purchased Drinks</option>
                  <option value="Generator Fuel">Generator Fuel</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Water">Water</option>
                  <option value="Internet">Internet</option>
                  <option value="Repairs">Repairs</option>
                  <option value="Staff Lunch">Staff Lunch</option>
                  <option value="Transport">Transport</option>
                  <option value="Cleaning Materials">Cleaning Materials</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purchased 20kg beef for kitchen"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Requested By</label>
                  <input
                    type="text"
                    required
                    value={expReqBy}
                    onChange={(e) => setExpReqBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Approved By</label>
                  <input
                    type="text"
                    required
                    value={expAppBy}
                    onChange={(e) => setExpAppBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 45000"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Reason / Justification</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency kitchen restock"
                  value={expReason}
                  onChange={(e) => setExpReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20"
              >
                Save Expense Voucher
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- CASH MOVEMENT MODAL ------------------- */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
            darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Record Cash Float Movement</h3>
              <button onClick={() => setIsCashModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCashMovement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Movement Type</label>
                <select
                  value={cashType}
                  onChange={(e) => setCashType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                >
                  <option value="Opening Cash">Opening Cash Float</option>
                  <option value="Manual Adjustment">Manual Cash Adjustment</option>
                  <option value="Refund">Cash Refund</option>
                  <option value="Credit Payment Received">Credit Payment Received</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Reason / Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shift float cash top-up"
                  value={cashReason}
                  onChange={(e) => setCashReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20"
              >
                Log Cash Movement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- DEBT PAYMENT MODAL ------------------- */}
      {payingCreditOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
            darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold">Receive Debt Payment</h3>
                <p className="text-xs text-gray-500">Customer: {payingCreditOrder.customerName || 'Guest'}</p>
              </div>
              <button onClick={() => setPayingCreditOrder(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectDebtPayment} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Receipt Total: {formatCurrency(payingCreditOrder.total)}</p>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  Remaining Debt: {formatCurrency(payingCreditOrder.balance > 0 ? payingCreditOrder.balance : payingCreditOrder.total - payingCreditOrder.amountPaid)}
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1">Payment Method</label>
                <select
                  value={debtPayMethod}
                  onChange={(e) => setDebtPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Mobile Money">Mobile Money (MoMo)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Amount Collecting (RWF)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={debtPayAmount}
                  onChange={(e) => setDebtPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono font-bold text-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
              >
                Record Debt Payment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
