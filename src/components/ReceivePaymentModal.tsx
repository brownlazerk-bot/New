import React, { useState } from 'react';
import { 
  DollarSign, CreditCard, Smartphone, Building, 
  CheckCircle2, AlertCircle, X, User, Phone, FileText, UserCheck, AlertTriangle
} from 'lucide-react';
import { Order, PaymentMethod, PaymentTransaction, GuestRoom, Employee } from '../types';
import { formatCurrency } from '../lib/currency';
import { loadEmployees } from '../lib/storage';
import { chargeOrderToEmployee, EmployeeChargeReason } from '../lib/employeeChargeSystem';

interface ReceivePaymentModalProps {
  order: Order;
  guestRooms: GuestRoom[];
  cashierName: string;
  onClose: () => void;
  onPaymentSubmitted: (
    updatedOrder: Order, 
    paymentAmount: number, 
    method: PaymentMethod,
    customerDetails?: { name: string; phone: string }
  ) => void;
  darkMode: boolean;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  order,
  guestRooms,
  cashierName,
  onClose,
  onPaymentSubmitted,
  darkMode
}) => {
  const currentBalance = order.balance > 0 ? order.balance : Math.max(0, order.total - order.amountPaid);
  
  const [paymentType, setPaymentType] = useState<'Full' | 'Partial' | 'Credit' | 'EmployeeCharge'>('Full');
  const [amountInput, setAmountInput] = useState<string>(currentBalance.toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  
  // Mixed payment sub-inputs
  const [cashPart, setCashPart] = useState<string>('');
  const [cardPart, setCardPart] = useState<string>('');
  const [momoPart, setMomoPart] = useState<string>('');
  
  // Credit & Room/Apartment & Employee inputs
  const employeesList = loadEmployees().filter(e => e.status === 'Active');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    order.waiterId || (employeesList[0]?.id || '')
  );
  const [chargeReason, setChargeReason] = useState<EmployeeChargeReason>('Employee Consumption');
  const [customerName, setCustomerName] = useState<string>(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(order.customerPhone || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(order.guestRoomId || '');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleTypeChange = (type: 'Full' | 'Partial' | 'Credit' | 'EmployeeCharge') => {
    setPaymentType(type);
    setError('');
    if (type === 'Full') {
      setAmountInput(currentBalance.toFixed(2));
    } else if (type === 'Partial') {
      setAmountInput((currentBalance / 2).toFixed(2));
    } else if (type === 'Credit') {
      setAmountInput('0.00');
      setMethod('Credit');
    } else if (type === 'EmployeeCharge') {
      setAmountInput('0.00');
      setMethod('Credit');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentType === 'EmployeeCharge') {
      if (!selectedEmployeeId) {
        setError('Please select an employee to charge this bill/consumption to.');
        return;
      }

      const result = chargeOrderToEmployee(
        order.id,
        selectedEmployeeId,
        chargeReason,
        paymentNote.trim(),
        cashierName
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      // Update local state and trigger completion
      const emp = employeesList.find(e => e.id === selectedEmployeeId);
      const updated: Order = {
        ...order,
        customerName: `Staff Charge: ${emp?.fullName || 'Employee'}`,
        customerPhone: emp?.phone || '',
        paymentStatus: 'CREDIT',
        status: 'Credit',
        paymentMethod: 'Credit',
        paymentDetails: {
          method: 'Credit',
          guestName: emp?.fullName,
          guestPhone: emp?.phone
        }
      };

      onPaymentSubmitted(updated, 0, 'Credit', { name: emp?.fullName || 'Staff', phone: emp?.phone || '' });
      return;
    }

    if (paymentType === 'Credit' || method === 'Credit') {
      if (!customerName.trim()) {
        setError('Please provide customer name for Credit / Debt sales.');
        return;
      }
      if (!customerPhone.trim()) {
        setError('Please provide customer phone number for Credit / Debt tracking.');
        return;
      }

      // Mark order as Credit
      const updated: Order = {
        ...order,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentStatus: 'CREDIT',
        status: 'Credit',
        paymentMethod: 'Credit',
        paymentDetails: {
          method: 'Credit',
          guestName: customerName.trim(),
          guestPhone: customerPhone.trim()
        }
      };

      onPaymentSubmitted(updated, 0, 'Credit', { name: customerName.trim(), phone: customerPhone.trim() });
      return;
    }

    const payAmount = parseFloat(amountInput) || 0;

    if (payAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (payAmount > currentBalance + 0.01) {
      setError(`Payment amount (${formatCurrency(payAmount)}) exceeds remaining balance (${formatCurrency(currentBalance)})`);
      return;
    }

    if (method === 'Room Charge' || method === 'Apartment Charge') {
      if (!selectedRoomId) {
        setError('Please select a valid Room or Apartment to charge.');
        return;
      }
    }

    let cashTendered = payAmount;
    let changeDue = 0;

    if (method === 'Cash') {
      const cashVal = parseFloat(amountInput) || payAmount;
      if (cashVal > currentBalance) {
        changeDue = cashVal - currentBalance;
      }
    }

    const newAmountPaid = (order.amountPaid || 0) + payAmount;
    const newBalance = Math.max(0, order.total - newAmountPaid);
    
    let newPaymentStatus: 'PAID' | 'PARTIALLY PAID' = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY PAID';
    let newOrderStatus = newBalance <= 0.01 ? 'Paid' as const : 'Partially Paid' as const;

    const newTransaction: PaymentTransaction = {
      id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      amount: payAmount,
      method,
      cashierName,
      note: paymentNote.trim() || `${paymentType} payment received`,
      cashPaid: method === 'Cash' ? cashTendered : undefined,
      changeGiven: changeDue > 0 ? changeDue : undefined
    };

    const selectedRoom = guestRooms.find(r => r.id === selectedRoomId);

    const updatedOrder: Order = {
      ...order,
      customerName: customerName.trim() || order.customerName,
      customerPhone: customerPhone.trim() || order.customerPhone,
      amountPaid: newAmountPaid,
      balance: newBalance,
      paymentStatus: newPaymentStatus,
      status: newOrderStatus,
      paymentMethod: method,
      paidAt: newBalance <= 0.01 ? (order.paidAt || new Date().toISOString()) : order.paidAt,
      updatedAt: new Date().toISOString(),
      cashierName: cashierName || order.cashierName || 'Cashier',
      paymentDetails: {
        method,
        cashPaid: method === 'Cash' ? cashTendered : (order.paymentDetails?.cashPaid || 0) + (method === 'Cash' ? payAmount : 0),
        cardPaid: method === 'Card' ? payAmount : order.paymentDetails?.cardPaid,
        mobileMoneyPaid: method === 'Mobile Money' ? payAmount : order.paymentDetails?.mobileMoneyPaid,
        roomChargeAmount: (method === 'Room Charge' || method === 'Apartment Charge') ? payAmount : order.paymentDetails?.roomChargeAmount,
        selectedRoomId: selectedRoom?.id || order.guestRoomId,
        roomOrAptNumber: selectedRoom?.number,
        guestName: selectedRoom?.guestName || customerName.trim(),
        guestPhone: customerPhone.trim(),
        changeGiven: changeDue
      },
      paymentHistory: [
        ...(order.paymentHistory || []),
        newTransaction
      ]
    };

    onPaymentSubmitted(updatedOrder, payAmount, method, { name: customerName.trim(), phone: customerPhone.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-lg w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                {order.orderNumber || `#${order.id}`}
              </span>
              <h3 className="font-bold text-base">Receive Payment</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {order.tableNumber ? `Table: ${order.tableNumber}` : 'Direct Sale'} | Waiter: {order.waiterName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Ribbon */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-center mb-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Order Total</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(order.total)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Paid</p>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(order.amountPaid || 0)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Balance Due</p>
            <p className="text-sm font-black text-amber-600 dark:text-amber-400">{formatCurrency(currentBalance)}</p>
          </div>
        </div>

        {/* Payment Type Switcher (Full, Partial, Credit, Charge Staff) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange('Full')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
              paymentType === 'Full'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Full Payment
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('Partial')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
              paymentType === 'Partial'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Partial Payment
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('Credit')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
              paymentType === 'Credit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Customer Debt
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('EmployeeCharge')}
            className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
              paymentType === 'EmployeeCharge'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Charge Staff Salary
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* If Employee Salary Deduction Mode */}
          {paymentType === 'EmployeeCharge' ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
                <UserCheck className="w-4 h-4" />
                <span>Automatic Employee Salary Advance / Loss Deduction</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-300 leading-relaxed">
                This will record the unpaid bill ({formatCurrency(currentBalance)}) directly as an employee liability or consumption deduction against their monthly salary.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Responsible Employee (Staff / Guard / Waiter) *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                >
                  <option value="">-- Select Employee --</option>
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.role || e.department} - ID: {e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Charge Reason / Category *
                </label>
                <select
                  value={chargeReason}
                  onChange={(e) => setChargeReason(e.target.value as EmployeeChargeReason)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                >
                  <option value="Employee Consumption">Employee Consumption (Food / Beverage / Services consumed)</option>
                  <option value="Unpaid Customer Walkout Loss">Unpaid Customer Walkout Loss (Customer left without paying)</option>
                  <option value="Service Guard Liability (Pool/Sauna)">Service Guard Liability (Pool Guard / Sauna Guard duty error)</option>
                  <option value="Staff Breakages & Damages">Staff Breakages & Equipment Damages</option>
                  <option value="Other">Other Staff Liability</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Note / Incident Summary
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Unpaid Pool ticket & drinks by runner customer"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          ) : (
            /* Customer Info for Receipt / Debt */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center">
                  <User className="w-3 h-3 mr-1 text-gray-400" />
                  Customer Name {paymentType === 'Credit' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Guest Name"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1 flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-gray-400" />
                  Phone Number {paymentType === 'Credit' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+237 6..."
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>
            </div>
          )}

          {/* Amount to Pay (If not credit) */}
          {paymentType !== 'Credit' && (
            <div>
              <label className="block text-xs font-bold mb-1">
                Amount Being Paid Now ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance + 100}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-lg font-mono font-bold text-amber-600 dark:text-amber-400"
              />
              {paymentType === 'Partial' && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Remaining Balance after this payment: <span className="font-bold text-gray-900 dark:text-white">${Math.max(0, currentBalance - (parseFloat(amountInput) || 0)).toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {/* Payment Method Selector Grid */}
          {paymentType !== 'Credit' && (
            <div>
              <label className="block text-xs font-bold mb-2">Select Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Cash' as PaymentMethod, label: 'Cash', icon: DollarSign },
                  { id: 'Card' as PaymentMethod, label: 'Card', icon: CreditCard },
                  { id: 'Mobile Money' as PaymentMethod, label: 'MoMo', icon: Smartphone },
                  { id: 'Room Charge' as PaymentMethod, label: 'Room Charge', icon: Building },
                  { id: 'Apartment Charge' as PaymentMethod, label: 'Apartment', icon: Building },
                  { id: 'Mixed' as PaymentMethod, label: 'Mixed', icon: DollarSign },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room / Apartment Guest Selection */}
          {(method === 'Room Charge' || method === 'Apartment Charge') && paymentType !== 'Credit' && (
            <div>
              <label className="block text-xs font-bold mb-1">Select Guest Room or Apartment</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">-- Select Room / Apartment --</option>
                {guestRooms
                  .filter(r => method === 'Room Charge' ? r.type === 'Room' : r.type === 'Apartment')
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.number} - {room.guestName} (Curr Bal: ${room.balance.toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Payment Note */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
              Transaction Note (Optional)
            </label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Paid part cash part card / Deposit"
              className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center space-x-1.5 transition-all ${
                paymentType === 'Credit'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{paymentType === 'Credit' ? 'Record Credit Debt' : 'Confirm Payment'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
