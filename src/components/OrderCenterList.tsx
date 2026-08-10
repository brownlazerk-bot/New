import React, { useState } from 'react';
import { 
  Search, Filter, Plus, DollarSign, Printer, ChefHat, 
  Eye, CheckCircle2, AlertCircle, Clock, Calendar, User, 
  Phone, Receipt, ArrowUpDown, X, Tag, ShieldCheck, Sparkles, Waves, RefreshCw, Edit, Trash2
} from 'lucide-react';
import { 
  Order, OrderStatus, PaymentStatus, Waiter, 
  MenuItem, GuestRoom, KitchenTicket, Table 
} from '../types';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { AddItemModal } from './AddItemModal';
import { OrderDetailsModal } from './OrderDetailsModal';
import { EditOrderModal } from './EditOrderModal';

interface OrderCenterListProps {
  orders: Order[];
  tables: Table[];
  waiters: Waiter[];
  menuItems: MenuItem[];
  guestRooms: GuestRoom[];
  cashierName: string;
  userRole: 'Cashier' | 'Manager';
  darkMode: boolean;
  onUpdateOrder: (updatedOrder: Order, newKot?: KitchenTicket) => void;
  onSaveOrderEdits: (updatedOrder: Order) => void;
  onCancelOrderAndReturnStock: (order: Order) => void;
  onDeleteOrderAndReturnStock: (orderId: string) => void;
  onPrintReceipt: (order: Order) => void;
  onPrintKot?: (order: Order) => void;
  onOpenPosForNewOrder: () => void;
}

export const OrderCenterList: React.FC<OrderCenterListProps> = ({
  orders,
  tables,
  waiters,
  menuItems,
  guestRooms,
  cashierName,
  userRole,
  darkMode,
  onUpdateOrder,
  onSaveOrderEdits,
  onCancelOrderAndReturnStock,
  onDeleteOrderAndReturnStock,
  onPrintReceipt,
  onPrintKot,
  onOpenPosForNewOrder
}) => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<string>('All');
  const [selectedWaiter, setSelectedWaiter] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'Today' | 'Yesterday' | 'All'>('Today');

  // Modal states
  const [activeOrderForPayment, setActiveOrderForPayment] = useState<Order | null>(null);
  const [activeOrderForAddItems, setActiveOrderForAddItems] = useState<Order | null>(null);
  const [activeOrderForDetails, setActiveOrderForDetails] = useState<Order | null>(null);
  const [activeOrderForEdit, setActiveOrderForEdit] = useState<Order | null>(null);

  // Filter Logic
  const filteredOrders = orders.filter(o => {
    // Date filter
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (selectedDateFilter === 'Today') {
      if (orderDate.toDateString() !== today.toDateString()) return false;
    } else if (selectedDateFilter === 'Yesterday') {
      if (orderDate.toDateString() !== yesterday.toDateString()) return false;
    }

    // Search query
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (o.orderNumber || o.id).toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerPhone || '').toLowerCase().includes(q) ||
      (o.waiterName || '').toLowerCase().includes(q) ||
      (o.tableNumber || '').toLowerCase().includes(q) ||
      (o.cashierName || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Order status filter
    if (selectedOrderStatus !== 'All' && o.status !== selectedOrderStatus) {
      return false;
    }

    // Payment status filter
    if (selectedPaymentStatus !== 'All' && o.paymentStatus !== selectedPaymentStatus) {
      return false;
    }

    // Service included filter
    if (selectedService !== 'All') {
      const hasSvc = (o.servicesIncluded || []).some(s => s.toLowerCase().includes(selectedService.toLowerCase())) ||
        o.items.some(i => i.category.toLowerCase().includes(selectedService.toLowerCase()));
      if (!hasSvc) return false;
    }

    // Waiter filter
    if (selectedWaiter !== 'All' && o.waiterId !== selectedWaiter) {
      return false;
    }

    return true;
  });

  // Financial Stats Calculation
  const totalOrdersCount = filteredOrders.length;
  const paidOrdersCount = filteredOrders.filter(o => o.paymentStatus === 'PAID').length;
  const partialOrdersCount = filteredOrders.filter(o => o.paymentStatus === 'PARTIALLY PAID').length;
  const creditOrdersCount = filteredOrders.filter(o => o.paymentStatus === 'CREDIT').length;
  const unpaidOrdersCount = filteredOrders.filter(o => o.paymentStatus === 'UNPAID').length;

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalCollected = filteredOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const totalOutstanding = filteredOrders.reduce((sum, o) => sum + (o.balance > 0 ? o.balance : Math.max(0, o.total - (o.amountPaid || 0))), 0);

  // Status Badges
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'Preparing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'Ready':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      case 'Served':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300';
      case 'Waiting for Payment':
        return 'bg-amber-500 text-white font-bold';
      case 'Partially Paid':
        return 'bg-orange-500 text-white font-bold';
      case 'Paid':
        return 'bg-emerald-600 text-white font-bold';
      case 'Credit':
        return 'bg-indigo-600 text-white font-bold';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentBadge = (paymentStatus: PaymentStatus, balance: number) => {
    switch (paymentStatus) {
      case 'PAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-xs">PAID</span>;
      case 'PARTIALLY PAID':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
            PARTIAL (${balance.toFixed(2)} DUE)
          </span>
        );
      case 'CREDIT':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs">CREDIT DEBT</span>;
      case 'UNPAID':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">UNPAID</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-500 text-white">{paymentStatus}</span>;
    }
  };

  // Quick Action: Mark as Paid
  const handleQuickMarkPaid = (order: Order) => {
    if (confirm(`Mark Order ${order.orderNumber || order.id} as Fully Paid ($${order.total.toFixed(2)})?`)) {
      const updated: Order = {
        ...order,
        amountPaid: order.total,
        balance: 0,
        paymentStatus: 'PAID',
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paymentHistory: [
          ...(order.paymentHistory || []),
          {
            id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
            timestamp: new Date().toISOString(),
            amount: order.balance > 0 ? order.balance : order.total,
            method: order.paymentMethod || 'Cash',
            cashierName,
            note: 'Marked as Fully Paid'
          }
        ]
      };
      onUpdateOrder(updated);
    }
  };

  // Quick Action: Mark as Credit
  const handleQuickMarkCredit = (order: Order) => {
    let name = order.customerName || '';
    let phone = order.customerPhone || '';

    if (!name) {
      name = prompt('Enter Customer Full Name for Credit Debt:', '') || '';
      if (!name) return;
    }
    if (!phone) {
      phone = prompt('Enter Customer Phone Number for Credit Debt:', '') || '';
      if (!phone) return;
    }

    const updated: Order = {
      ...order,
      customerName: name,
      customerPhone: phone,
      paymentStatus: 'CREDIT',
      status: 'Credit',
      paymentMethod: 'Credit',
      paymentDetails: {
        method: 'Credit',
        guestName: name,
        guestPhone: phone
      }
    };

    onUpdateOrder(updated);
  };

  // Quick Action: Cancel Order (With Direct Stock Return)
  const handleCancelOrder = (order: Order) => {
    onCancelOrderAndReturnStock(order);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Create Order Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-amber-200" />
            <h2 className="text-xl font-black">Unified Order & Cashier Center</h2>
          </div>
          <p className="text-xs text-amber-100 mt-1">
            Create, track, and process payments for Bar Drinks, Food, Pool, Sauna, and Room Charges.
          </p>
        </div>

        <button
          onClick={onOpenPosForNewOrder}
          className="px-5 py-3 rounded-xl bg-white text-amber-900 font-extrabold text-xs shadow-lg hover:bg-amber-50 flex items-center space-x-2 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-600" />
          <span>+ Create New Customer Order</span>
        </button>
      </div>

      {/* Realtime Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalOrdersCount}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">${totalRevenue.toFixed(2)} Total Value</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Paid Orders</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{paidOrdersCount}</p>
          <p className="text-[10px] text-emerald-600/70 mt-0.5">${totalCollected.toFixed(2)} Collected</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Partially Paid</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{partialOrdersCount}</p>
          <p className="text-[10px] text-amber-500/70 mt-0.5">Deposits Received</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Credit / Debt</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{creditOrdersCount}</p>
          <p className="text-[10px] text-indigo-500/70 mt-0.5">Pay Later Customer Debt</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Unpaid Orders</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{unpaidOrdersCount}</p>
          <p className="text-[10px] text-rose-500/70 mt-0.5">Awaiting Checkout</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Balance Due</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">${totalOutstanding.toFixed(2)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Outstanding</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`p-4 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search #ORD, Customer, Table, Phone, Waiter..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-xs text-gray-400">✕</button>
            )}
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              <option value="Today">Date: Today Only</option>
              <option value="Yesterday">Date: Yesterday</option>
              <option value="All">Date: All Records</option>
            </select>
          </div>

          {/* Order Status */}
          <div>
            <select
              value={selectedOrderStatus}
              onChange={(e) => setSelectedOrderStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              <option value="All">Order Status: All</option>
              <option value="Pending">Pending</option>
              <option value="Preparing">Preparing</option>
              <option value="Ready">Ready</option>
              <option value="Served">Served</option>
              <option value="Waiting for Payment">Waiting for Payment</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Credit">Credit (Debt)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              <option value="All">Payment Status: All</option>
              <option value="PAID">PAID</option>
              <option value="PARTIALLY PAID">PARTIALLY PAID</option>
              <option value="UNPAID">UNPAID</option>
              <option value="CREDIT">CREDIT</option>
            </select>
          </div>

          {/* Service Included */}
          <div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              <option value="All">Service: All Services</option>
              <option value="Drinks">Drinks</option>
              <option value="Food">Food</option>
              <option value="Pool">Pool Pass</option>
              <option value="Sauna">Sauna Pass</option>
              <option value="Room">Room Charge</option>
              <option value="Apartment">Apartment Charge</option>
            </select>
          </div>

        </div>
      </div>

      {/* Orders List Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b uppercase font-bold text-[10px] tracking-wider ${
              darkMode ? 'bg-gray-800/80 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Table / Location</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Waiter</th>
                <th className="py-3.5 px-4">Services Included</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4">Order Status</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    <Receipt className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-sm">No orders matching search filter.</p>
                    <p className="text-xs">Try clearing filters or create a new order.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const balanceVal = order.balance > 0 ? order.balance : Math.max(0, order.total - (order.amountPaid || 0));

                  return (
                    <tr 
                      key={order.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/50 transition-colors ${
                        order.status === 'Cancelled' ? 'opacity-50 grayscale' : ''
                      }`}
                    >
                      {/* Order Number & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-gray-900 dark:text-white">
                          {order.orderNumber || `#${order.id}`}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Table / Deck */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {order.tableNumber || 'Direct POS Bar'}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {order.customerName || 'Walk-In Guest'}
                        </p>
                        {order.customerPhone && (
                          <p className="text-[10px] text-gray-500 flex items-center">
                            <Phone className="w-2.5 h-2.5 mr-0.5" />
                            {order.customerPhone}
                          </p>
                        )}
                      </td>

                      {/* Waiter */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                        {order.waiterName}
                      </td>

                      {/* Services Included */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(order.servicesIncluded || ['Drinks']).map((svc, i) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 whitespace-nowrap"
                            >
                              {svc}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">
                        ${order.total.toFixed(2)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ${(order.amountPaid || 0).toFixed(2)}
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        ${balanceVal.toFixed(2)}
                      </td>

                      {/* Order Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getOrderStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPaymentBadge(order.paymentStatus, balanceVal)}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* View Details */}
                          <button
                            title="View Full Order Details"
                            onClick={() => setActiveOrderForDetails(order)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Order (Table, Waiter, Items) */}
                          {order.status !== 'Cancelled' && (
                            <button
                              title="Edit Order (Table / Waiter / Items)"
                              onClick={() => setActiveOrderForEdit(order)}
                              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Receive Payment Modal */}
                          {order.status !== 'Cancelled' && (
                            <button
                              title="Receive Payment / Deposit"
                              onClick={() => setActiveOrderForPayment(order)}
                              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Add More Items */}
                          {order.status !== 'Cancelled' && (
                            <button
                              title="Add Items to Order"
                              onClick={() => setActiveOrderForAddItems(order)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Receipt */}
                          <button
                            title="Print Receipt"
                            onClick={() => onPrintReceipt(order)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Mark as Paid */}
                          {order.paymentStatus !== 'PAID' && order.status !== 'Cancelled' && (
                            <button
                              title="Quick Mark as Fully Paid"
                              onClick={() => handleQuickMarkPaid(order)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Mark as Credit Debt */}
                          {order.paymentStatus !== 'CREDIT' && order.paymentStatus !== 'PAID' && order.status !== 'Cancelled' && (
                            <button
                              title="Record as Credit / Debt"
                              onClick={() => handleQuickMarkCredit(order)}
                              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Order */}
                          {order.status !== 'Cancelled' && (
                            <button
                              title="Cancel Order & Return Stock & Refund Money"
                              onClick={() => {
                                if (confirm(`Cancel Order ${order.orderNumber || order.id}? All stock (including recipes & drink pairings) will be returned and money refunded.`)) {
                                  handleCancelOrder(order);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Order Completely */}
                          <button
                            title="Delete Order Completely (Restore Stock & Money)"
                            onClick={() => {
                              if (confirm(`Permanently DELETE Order ${order.orderNumber || order.id}? Order will be removed and all stock, recipe ingredients, drink pairings & cash fully restored.`)) {
                                onDeleteOrderAndReturnStock(order.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

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

      {/* Payment Modal */}
      {activeOrderForPayment && (
        <ReceivePaymentModal
          order={activeOrderForPayment}
          guestRooms={guestRooms}
          cashierName={cashierName}
          darkMode={darkMode}
          onClose={() => setActiveOrderForPayment(null)}
          onPaymentSubmitted={(updatedOrder) => {
            onUpdateOrder(updatedOrder);
            setActiveOrderForPayment(null);
            onPrintReceipt(updatedOrder);
          }}
        />
      )}

      {/* Add Items Modal */}
      {activeOrderForAddItems && (
        <AddItemModal
          order={activeOrderForAddItems}
          menuItems={menuItems}
          darkMode={darkMode}
          onClose={() => setActiveOrderForAddItems(null)}
          onItemsAdded={(updatedOrder, newKot) => {
            onUpdateOrder(updatedOrder, newKot);
            setActiveOrderForAddItems(null);
          }}
        />
      )}

      {/* Details Modal */}
      {activeOrderForDetails && (
        <OrderDetailsModal
          order={activeOrderForDetails}
          darkMode={darkMode}
          userRole={userRole}
          onClose={() => setActiveOrderForDetails(null)}
          onEditOrder={(ord) => {
            setActiveOrderForDetails(null);
            setActiveOrderForEdit(ord);
          }}
          onReceivePayment={(ord) => {
            setActiveOrderForDetails(null);
            setActiveOrderForPayment(ord);
          }}
          onAddItems={(ord) => {
            setActiveOrderForDetails(null);
            setActiveOrderForAddItems(ord);
          }}
          onPrintReceipt={onPrintReceipt}
          onPrintKot={onPrintKot}
          onCancelOrder={(ord) => {
            handleCancelOrder(ord);
            setActiveOrderForDetails(null);
          }}
          onDeleteOrder={(ordId) => {
            onDeleteOrderAndReturnStock(ordId);
            setActiveOrderForDetails(null);
          }}
        />
      )}

      {/* Edit Order Modal */}
      {activeOrderForEdit && (
        <EditOrderModal
          order={activeOrderForEdit}
          tables={tables}
          waiters={waiters}
          menuItems={menuItems}
          darkMode={darkMode}
          onClose={() => setActiveOrderForEdit(null)}
          onSaveOrderEdits={(updatedOrder) => {
            onSaveOrderEdits(updatedOrder);
            setActiveOrderForEdit(null);
          }}
          onCancelOrderAndReturnStock={(ord) => {
            onCancelOrderAndReturnStock(ord);
            setActiveOrderForEdit(null);
          }}
          onDeleteOrderAndReturnStock={(ordId) => {
            onDeleteOrderAndReturnStock(ordId);
            setActiveOrderForEdit(null);
          }}
        />
      )}

    </div>
  );
};
