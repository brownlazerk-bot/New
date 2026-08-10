import React from 'react';
import { 
  X, Printer, DollarSign, ChefHat, User, Phone, 
  Calendar, Clock, Receipt, CreditCard, Building, ShieldCheck, Waves, Flame
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, KitchenTicket } from '../types';
import { 
  printKotThermalTicket, 
  printPoolTokenTicket, 
  printSaunaTokenTicket, 
  printRoomTokenTicket 
} from '../lib/serviceTokenPrinter';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onReceivePayment: (order: Order) => void;
  onAddItems: (order: Order) => void;
  onPrintReceipt: (order: Order) => void;
  onPrintKot?: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
  darkMode: boolean;
  userRole: 'Cashier' | 'Manager';
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onReceivePayment,
  onAddItems,
  onPrintReceipt,
  onPrintKot,
  onCancelOrder,
  onEditOrder,
  darkMode,
  userRole
}) => {
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
        return 'bg-amber-500 text-white shadow-xs';
      case 'Partially Paid':
        return 'bg-orange-500 text-white shadow-xs';
      case 'Paid':
        return 'bg-emerald-600 text-white shadow-xs';
      case 'Credit':
        return 'bg-indigo-600 text-white shadow-xs';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500 text-white font-black';
      case 'PARTIALLY PAID':
        return 'bg-amber-500 text-white font-black';
      case 'CREDIT':
        return 'bg-indigo-600 text-white font-black';
      case 'UNPAID':
        return 'bg-rose-600 text-white font-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-2xl w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg">{order.orderNumber || `#${order.id}`}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${getOrderStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Created: {new Date(order.createdAt).toLocaleString()} | Cashier: {order.cashierName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Waiter Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs mb-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Table / Deck</p>
            <p className="font-bold text-gray-900 dark:text-white">{order.tableNumber || 'Direct POS Bar'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Name</p>
            <p className="font-bold text-gray-900 dark:text-white">{order.customerName || 'Walk-In Guest'}</p>
            {order.customerPhone && <p className="text-[10px] text-gray-500">{order.customerPhone}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned Waiter</p>
            <p className="font-bold text-gray-900 dark:text-white">{order.waiterName}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] mt-0.5 ${getPaymentStatusBadge(order.paymentStatus)}`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Services Included Badges */}
        {order.servicesIncluded && order.servicesIncluded.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Services Included in Order</p>
            <div className="flex flex-wrap gap-1.5">
              {order.servicesIncluded.map((svc, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/30">
                  {svc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="mb-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">Order Items</h4>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 max-h-[200px] overflow-y-auto">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-[10px] text-gray-500">Category: {item.category} | ${item.unitPrice.toFixed(2)} ea</p>
                  {item.notes && <p className="text-[10px] italic text-amber-600">Note: {item.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">x{item.quantity}</p>
                  <p className="font-black text-amber-600 dark:text-amber-400">${item.totalPrice.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2 text-xs mb-4">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount</span>
              <span>-${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Grand Total</span>
            <span className="text-amber-500">${order.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold pt-1">
            <span className="text-emerald-600">Total Paid</span>
            <span className="text-emerald-600">${(order.amountPaid || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-rose-600 dark:text-rose-400">Balance Remaining</span>
            <span className="text-rose-600 dark:text-rose-400">${(order.balance || Math.max(0, order.total - order.amountPaid)).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment History Timeline (if any) */}
        {order.paymentHistory && order.paymentHistory.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Payment History / Installments</p>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              {order.paymentHistory.map((t, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                  <div>
                    <span className="font-bold">${t.amount.toFixed(2)}</span> ({t.method}) via {t.cashierName}
                    {t.note && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t.note}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => { onClose(); onReceivePayment(order); }}
            className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Pay / Deposit</span>
          </button>

          {onEditOrder && order.status !== 'Cancelled' && (
            <button
              onClick={() => { onClose(); onEditOrder(order); }}
              className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Edit Order</span>
            </button>
          )}

          <button
            onClick={() => { onClose(); onAddItems(order); }}
            className="py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>+ Add Items</span>
          </button>

          <button
            onClick={() => onPrintReceipt(order)}
            className="py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>

          {/* Kitchen KOT Button */}
          {order.items.some(i => i.isFood || i.category === 'Food') && (
            <button
              onClick={() => {
                const foodItems = order.items.filter(i => i.isFood || i.category === 'Food');
                const kot: KitchenTicket = {
                  id: order.kotId || `KOT-${Math.floor(1000 + Math.random() * 9000)}`,
                  orderId: order.id,
                  tableNumber: order.tableNumber || 'COUNTER',
                  waiterName: order.waiterName || 'Staff',
                  customerName: order.customerName,
                  items: foodItems.map(f => ({
                    itemId: f.itemId,
                    name: f.name,
                    quantity: f.quantity,
                    notes: f.notes
                  })),
                  orderTime: order.createdAt || new Date().toISOString(),
                  status: 'Pending'
                };
                printKotThermalTicket(kot, 'RE-PRINT');
              }}
              className="py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
              title="Print Kitchen Order Ticket"
            >
              <ChefHat className="w-4 h-4 text-rose-500" />
              <span>Print KOT</span>
            </button>
          )}

          {/* Piscine Pool Token Button */}
          {order.items.some(i => i.category === 'Pool Services') && (
            <button
              onClick={() => {
                const poolItems = order.items.filter(i => i.category === 'Pool Services');
                printPoolTokenTicket({
                  orderId: order.id,
                  tableNumber: order.tableNumber || 'Poolside',
                  waiterName: order.waiterName,
                  cashierName: order.cashierName,
                  customerName: order.customerName,
                  paymentStatus: order.paymentStatus,
                  paymentMethod: order.paymentMethod,
                  items: poolItems.map(p => ({
                    itemId: p.itemId,
                    name: p.name,
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    totalPrice: p.totalPrice,
                    notes: p.notes
                  }))
                }, 'PISCINE PASS TOKEN');
              }}
              className="py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
              title="Print Swimming Pool Token Pass"
            >
              <Waves className="w-4 h-4 text-sky-500" />
              <span>Pool Token</span>
            </button>
          )}

          {/* Sauna & Spa Token Button */}
          {order.items.some(i => i.category === 'Sauna Services') && (
            <button
              onClick={() => {
                const saunaItems = order.items.filter(i => i.category === 'Sauna Services');
                printSaunaTokenTicket({
                  orderId: order.id,
                  tableNumber: order.tableNumber || 'Sauna Desk',
                  waiterName: order.waiterName,
                  cashierName: order.cashierName,
                  customerName: order.customerName,
                  paymentStatus: order.paymentStatus,
                  paymentMethod: order.paymentMethod,
                  items: saunaItems.map(s => ({
                    itemId: s.itemId,
                    name: s.name,
                    quantity: s.quantity,
                    unitPrice: s.unitPrice,
                    totalPrice: s.totalPrice,
                    notes: s.notes
                  }))
                }, 'SAUNA PASS TOKEN');
              }}
              className="py-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
              title="Print Sauna & Spa Token Pass"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Sauna Token</span>
            </button>
          )}

          {/* Room Service Voucher Button */}
          {order.items.some(i => i.category === 'Room Services' || i.category === 'Apartment Services') && (
            <button
              onClick={() => {
                const roomItems = order.items.filter(i => i.category === 'Room Services' || i.category === 'Apartment Services');
                printRoomTokenTicket({
                  orderId: order.id,
                  roomNumber: order.tableNumber || 'Reception',
                  waiterName: order.waiterName,
                  cashierName: order.cashierName,
                  customerName: order.customerName,
                  paymentStatus: order.paymentStatus,
                  paymentMethod: order.paymentMethod,
                  items: roomItems.map(r => ({
                    itemId: r.itemId,
                    name: r.name,
                    quantity: r.quantity,
                    unitPrice: r.unitPrice,
                    totalPrice: r.totalPrice,
                    notes: r.notes
                  }))
                }, 'ROOM SERVICE VOUCHER');
              }}
              className="py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer"
              title="Print Room Service Voucher"
            >
              <Building className="w-4 h-4 text-purple-500" />
              <span>Room Voucher</span>
            </button>
          )}

          {userRole === 'Manager' || order.status !== 'Paid' ? (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to cancel this order? All stock items will be returned to inventory.')) {
                  onCancelOrder(order);
                  onClose();
                }
              }}
              className="py-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold text-xs cursor-pointer"
            >
              Cancel Order
            </button>
          ) : (
            <button onClick={onClose} className="py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-xs font-bold cursor-pointer">
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
