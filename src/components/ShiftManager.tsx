import React, { useState } from 'react';
import { 
  Clock, ShieldCheck, DollarSign, AlertTriangle, CheckCircle2, 
  RefreshCw, FileText, Download, Calendar, User, ArrowUpRight, 
  TrendingUp, Lock, Unlock, LockKeyhole, PlusCircle, Check, X,
  ShoppingBag, CreditCard, Smartphone, Building, Search, BarChart3
} from 'lucide-react';
import { Shift, Order, Expense, KitchenTicket, AppUser } from '../types';
import { formatCurrency } from '../lib/currency';
import { exportShiftReportPDF } from '../lib/exporter';

interface ShiftManagerProps {
  currentShift: Shift | null;
  allShifts: Shift[];
  orders: Order[];
  expenses?: Expense[];
  kitchenTickets?: KitchenTicket[];
  currentUser?: AppUser | null;
  userRole?: string;
  onOpenShift: (cashierName: string, openingCash: number, customBusinessDate?: string) => void;
  onCloseShift: (actualCash: number, notes?: string) => void;
  onReopenShift?: (shiftId: string) => void;
  darkMode: boolean;
}

export const ShiftManager: React.FC<ShiftManagerProps> = ({
  currentShift,
  allShifts,
  orders,
  expenses = [],
  currentUser,
  userRole,
  onOpenShift,
  onCloseShift,
  onReopenShift,
  darkMode
}) => {
  // Modal states
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedHistoryShift, setSelectedHistoryShift] = useState<Shift | null>(null);

  // Form states
  const [cashierNameInput, setCashierNameInput] = useState(currentUser?.fullName || 'Bar Cashier');
  const [openingCashInput, setOpeningCashInput] = useState<number>(50000); // 50,000 RWF float default
  const [customBusinessDateInput, setCustomBusinessDateInput] = useState<string>(
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Search & Filter state for shift history
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate live numbers for current active shift
  const currentShiftOrders = currentShift ? orders.filter(o => o.shiftId === currentShift.id) : [];
  const paidShiftOrders = currentShiftOrders.filter(o => o.status === 'Paid' || o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY PAID');
  
  const cashSales = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.cashPaid || 0) - (o.paymentDetails?.changeGiven || 0), 0);
  const cardSales = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.cardPaid || 0), 0);
  const momoSales = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.mobileMoneyPaid || 0), 0);
  const roomSales = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.roomChargeAmount || 0), 0);
  const totalShiftSales = paidShiftOrders.reduce((sum, o) => sum + o.total, 0);

  const currentShiftExpenses = currentShift 
    ? expenses.filter(e => e.shiftId === currentShift.id || (e.date && e.date.startsWith(currentShift.businessDate || ''))) 
    : [];
  const totalShiftExpenses = currentShiftExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openingFloat = currentShift?.openingCash || 0;
  const expectedCashInDrawer = openingFloat + cashSales - totalShiftExpenses;

  // Handlers
  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierNameInput.trim()) {
      alert('Please enter a cashier name.');
      return;
    }
    onOpenShift(cashierNameInput.trim(), Number(openingCashInput) || 0, customBusinessDateInput);
    setShowOpenModal(false);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCloseShift(Number(actualCashCounted) || 0, closingNotes);
    setShowCloseModal(false);
    setActualCashCounted(0);
    setClosingNotes('');
  };

  const handleOpenCloseModal = () => {
    setActualCashCounted(expectedCashInDrawer);
    setShowCloseModal(true);
  };

  // Filter shift history
  const closedShifts = allShifts.filter(s => s.status === 'Closed');
  const filteredClosedShifts = closedShifts.filter(s => 
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.businessDate && s.businessDate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Cashier Shift Register & Control</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Open business shifts, record float cash, monitor live drawer tallies, and perform shift closing reconciliations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {currentShift ? (
            <button
              onClick={handleOpenCloseModal}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <LockKeyhole className="w-4 h-4" />
              <span>Close Shift #{currentShift.shiftNumber || currentShift.id}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Open New Cashier Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Status Section */}
      {currentShift ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-gray-900 dark:to-amber-950/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/80 dark:border-amber-900/40">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800">
                  ACTIVE SHIFT #{currentShift.shiftNumber || currentShift.id}
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  Cashier: {currentShift.cashierName}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-gray-600 dark:text-gray-300">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Business Date</span>
                <span className="font-bold text-gray-900 dark:text-white">{currentShift.businessDate}</span>
              </div>
              <div className="h-8 w-px bg-amber-200 dark:bg-amber-900/40" />
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Shift Opened At</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid for Active Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xs">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Opening Float Cash</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                {formatCurrency(openingFloat)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Drawer Starting Balance</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-2xs">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Cash Collected</p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {formatCurrency(cashSales)}
              </p>
              <p className="text-[10px] text-emerald-600 mt-1">Physical Cash Payments</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-2xs">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Expected Cash in Drawer</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(expectedCashInDrawer)}
              </p>
              <p className="text-[10px] text-blue-600 mt-1">Float + Cash Sales - Expenses ({formatCurrency(totalShiftExpenses)})</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-2xs">
              <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Total Shift Sales</p>
              <p className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(totalShiftSales)}
              </p>
              <p className="text-[10px] text-purple-600 mt-1">{paidShiftOrders.length} Paid Orders</p>
            </div>
          </div>

          {/* Breakdown of Payment Methods */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Cash Sales</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(cashSales)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">POS Card Sales</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(cardSales)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Mobile Money</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(momoSales)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Room Charges</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(roomSales)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No Active Cashier Shift Open</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Opening a cashier shift establishes your float cash balance and enables shift-bound tracking for sales, cash drawer tallies, and daily reconciliations.
            </p>
          </div>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start Today's Business Shift</span>
          </button>
        </div>
      )}

      {/* Closed Shifts History Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>Shift Register Reconciliation Log</span>
            </h3>
            <p className="text-xs text-gray-500">
              Audit log of closed shifts, drawer actual cash counts, expected float totals, and cash variances.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search shifts or cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {filteredClosedShifts.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400">
            No closed shifts logged matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-2">Shift #</th>
                  <th className="py-3 px-2">Business Date</th>
                  <th className="py-3 px-2">Cashier</th>
                  <th className="py-3 px-2">Opened / Closed</th>
                  <th className="py-3 px-2 text-right">Float</th>
                  <th className="py-3 px-2 text-right">Total Sales</th>
                  <th className="py-3 px-2 text-right">Expected Cash</th>
                  <th className="py-3 px-2 text-right">Actual Counted</th>
                  <th className="py-3 px-2 text-right">Variance</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {filteredClosedShifts.map((shift) => {
                  const diff = shift.difference || 0;
                  const isBalanced = diff === 0;
                  const isSurplus = diff > 0;

                  return (
                    <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-2 font-black text-gray-900 dark:text-white">
                        #{shift.shiftNumber || shift.id}
                      </td>
                      <td className="py-3 px-2 font-bold text-gray-700 dark:text-gray-300">
                        {shift.businessDate || 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-gray-900 dark:text-white font-bold">
                        {shift.cashierName}
                      </td>
                      <td className="py-3 px-2 text-[11px] text-gray-500">
                        <div>Open: {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {shift.closedAt && (
                          <div className="text-gray-400">Close: {new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-600 dark:text-gray-400">
                        {formatCurrency(shift.openingCash)}
                      </td>
                      <td className="py-3 px-2 text-right font-black text-gray-900 dark:text-white">
                        {formatCurrency(shift.summary?.totalSales || 0)}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(shift.closingCashExpected || 0)}
                      </td>
                      <td className="py-3 px-2 text-right font-black text-gray-900 dark:text-white">
                        {formatCurrency(shift.closingCashActual || 0)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBalanced ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          isSurplus ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {isBalanced ? 'Balanced (0)' : `${isSurplus ? '+' : ''}${formatCurrency(diff)}`}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => exportShiftReportPDF(shift, orders)}
                            title="Export PDF Report"
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {(userRole === 'Manager' || userRole === 'Admin') && onReopenShift && (
                            <button
                              onClick={() => {
                                if (confirm(`Reopen Shift #${shift.shiftNumber || shift.id}? This will set it back as active.`)) {
                                  onReopenShift(shift.id);
                                }
                              }}
                              title="Reopen Shift (Admin)"
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Open Shift */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-gray-900 dark:text-white">Open Cashier Shift</h3>
              </div>
              <button 
                onClick={() => setShowOpenModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Cashier Name / Operator
                </label>
                <input
                  type="text"
                  required
                  value={cashierNameInput}
                  onChange={(e) => setCashierNameInput(e.target.value)}
                  placeholder="Cashier full name"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Opening Float Cash (RWF)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                  placeholder="Float cash in drawer"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Starting cash float provided for change in the cash drawer.</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Business Date
                </label>
                <input
                  type="text"
                  required
                  value={customBusinessDateInput}
                  onChange={(e) => setCustomBusinessDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Open Shift</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Close Shift */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <LockKeyhole className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900 dark:text-white">
                    Close Shift #{currentShift.shiftNumber || currentShift.id} Reconciliation
                  </h3>
                  <p className="text-[11px] text-gray-400">Cashier: {currentShift.cashierName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCloseModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calculations Summary */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Opening Cash Float:</span>
                <span className="font-bold">{formatCurrency(openingFloat)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Total Cash Sales Collected:</span>
                <span className="font-bold">+{formatCurrency(cashSales)}</span>
              </div>
              {totalShiftExpenses > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Cash Expenses Paid Out:</span>
                  <span className="font-bold">-{formatCurrency(totalShiftExpenses)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-black text-sm text-gray-900 dark:text-white">
                <span>Expected Cash in Drawer:</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(expectedCashInDrawer)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Actual Physical Cash Counted in Drawer (RWF)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={actualCashCounted}
                  onChange={(e) => setActualCashCounted(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-black text-base focus:outline-none"
                />
              </div>

              {/* Variance Callout */}
              {(() => {
                const diff = actualCashCounted - expectedCashInDrawer;
                if (diff === 0) {
                  return (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="font-bold">Cash drawer matches expected tally exactly (0 RWF Variance).</span>
                    </div>
                  );
                }
                const isShort = diff < 0;
                return (
                  <div className={`p-3 rounded-xl border flex items-start space-x-2 ${
                    isShort 
                      ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                      : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                  }`}>
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        {isShort ? `Shortage Discrepancy: -${formatCurrency(Math.abs(diff))}` : `Surplus Discrepancy: +${formatCurrency(diff)}`}
                      </p>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        {isShort ? 'Actual cash counted is less than calculated expected cash.' : 'Actual cash counted exceeds calculated expected cash.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Closing Shift Notes / Variance Explanation
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Optional explanations for variances or shift handoff notes..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <LockKeyhole className="w-4 h-4" />
                  <span>Confirm Close & Download PDF</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
