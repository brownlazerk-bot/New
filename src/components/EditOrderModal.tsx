import React, { useState } from 'react';
import { 
  X, Save, Trash2, Plus, RefreshCw, MapPin, User, Phone, 
  UtensilsCrossed, AlertTriangle, CheckCircle2, ShoppingBag, 
  RotateCcw, ShieldAlert, DollarSign, Edit
} from 'lucide-react';
import { Order, OrderItem, Table, Waiter, MenuItem } from '../types';
import { formatCurrency } from '../lib/currency';

interface EditOrderModalProps {
  order: Order;
  tables: Table[];
  waiters: Waiter[];
  menuItems: MenuItem[];
  darkMode: boolean;
  onClose: () => void;
  onSaveOrderEdits: (updatedOrder: Order) => void;
  onCancelOrderAndReturnStock: (order: Order) => void;
  onDeleteOrderAndReturnStock: (orderId: string) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  tables,
  waiters,
  menuItems,
  darkMode,
  onClose,
  onSaveOrderEdits,
  onCancelOrderAndReturnStock,
  onDeleteOrderAndReturnStock
}) => {
  // Table & Location Selection
  const [selectedTableId, setSelectedTableId] = useState<string>(order.tableId || '');
  const [customTableNumber, setCustomTableNumber] = useState<string>(order.tableNumber || '');
  
  // Waiter Selection
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(order.waiterId || '');

  // Customer Info
  const [customerName, setCustomerName] = useState<string>(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(order.customerPhone || '');

  // Order Items State
  const [items, setItems] = useState<OrderItem[]>([...order.items]);
  const [discount, setDiscount] = useState<number>(order.discount || 0);

  // Add Item Sub-View
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [itemSearch, setItemSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Confirmation Modals
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Recalculate Totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const amountPaid = order.amountPaid || 0;
  const balance = Math.max(0, total - amountPaid);

  // Handle Waiter Change
  const handleWaiterChange = (wId: string) => {
    setSelectedWaiterId(wId);
  };

  // Handle Table Selection
  const handleTableSelect = (tId: string) => {
    setSelectedTableId(tId);
    if (tId === 'custom') {
      setCustomTableNumber('Direct Bar / Takeaway');
    } else {
      const foundTable = tables.find(t => t.id === tId);
      if (foundTable) {
        setCustomTableNumber(foundTable.tableNumber);
      }
    }
  };

  // Update Item Quantity
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const itemInCart = items[index];
    const targetMenuItem = menuItems.find(m => m.id === itemInCart.itemId);
    if (targetMenuItem && typeof targetMenuItem.stockQuantity === 'number' && newQty > targetMenuItem.stockQuantity) {
      alert(`Cannot set quantity to ${newQty}. Maximum available stock for "${targetMenuItem.name}" is ${targetMenuItem.stockQuantity} ${targetMenuItem.unit || 'pcs'}.`);
      return;
    }

    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: newQty,
        totalPrice: newQty * copy[index].unitPrice
      };
      return copy;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Add Item to Order
  const handleAddItemToOrder = (menuItem: MenuItem) => {
    const isOutOfStock = menuItem.status === 'Out of Stock' || (typeof menuItem.stockQuantity === 'number' && menuItem.stockQuantity <= 0);
    if (isOutOfStock) {
      alert(`Sorry, "${menuItem.name}" is currently out of stock / unavailable and cannot be added to this order.`);
      return;
    }

    setItems(prev => {
      const existingIdx = prev.findIndex(i => i.itemId === menuItem.id);
      if (existingIdx > -1) {
        const currentQty = prev[existingIdx].quantity;
        if (typeof menuItem.stockQuantity === 'number' && currentQty + 1 > menuItem.stockQuantity) {
          alert(`Cannot add more "${menuItem.name}". Only ${menuItem.stockQuantity} ${menuItem.unit || 'pcs'} available in stock!`);
          return prev;
        }
        const copy = [...prev];
        const updatedQty = currentQty + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: updatedQty,
          totalPrice: updatedQty * copy[existingIdx].unitPrice
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            itemId: menuItem.id,
            name: menuItem.name,
            category: menuItem.category,
            unitPrice: menuItem.price,
            quantity: 1,
            totalPrice: menuItem.price,
            isFood: menuItem.isFood || menuItem.category === 'Food'
          }
        ];
      }
    });
  };

  // Save Edits Handler
  const handleSave = () => {
    if (items.length === 0) {
      alert('An order must contain at least one item. If you wish to cancel this order, use the "Cancel Order & Return Stock" button.');
      return;
    }

    const assignedWaiter = waiters.find(w => w.id === selectedWaiterId);
    const waiterName = assignedWaiter ? assignedWaiter.name : (order.waiterName || 'Cashier Direct');

    const updatedTableNumber = selectedTableId === 'custom' 
      ? customTableNumber || 'Direct Bar' 
      : (tables.find(t => t.id === selectedTableId)?.tableNumber || customTableNumber || 'Table');

    // Auto-derive payment status based on new balance
    let newPaymentStatus = order.paymentStatus;
    let newOrderStatus = order.status;

    if (balance === 0 && total > 0) {
      newPaymentStatus = 'PAID';
      newOrderStatus = 'Paid';
    } else if (amountPaid > 0 && balance > 0) {
      newPaymentStatus = 'PARTIALLY PAID';
      newOrderStatus = 'Partially Paid';
    } else if (amountPaid === 0) {
      newPaymentStatus = 'UNPAID';
      if (order.status === 'Paid') {
        newOrderStatus = 'Waiting for Payment';
      }
    }

    const updatedOrder: Order = {
      ...order,
      tableId: selectedTableId !== 'custom' ? selectedTableId : undefined,
      tableNumber: updatedTableNumber,
      waiterId: selectedWaiterId,
      waiterName: waiterName,
      customerName: customerName.trim() || 'Walk-In Guest',
      customerPhone: customerPhone.trim(),
      items: items,
      subtotal: subtotal,
      discount: discount,
      total: total,
      balance: balance,
      paymentStatus: newPaymentStatus,
      status: newOrderStatus
    };

    onSaveOrderEdits(updatedOrder);
    onClose();
  };

  // Categories for item search
  const categories = ['All', 'Beers', 'Soft Drinks', 'Wines', 'Whisky', 'Cocktails', 'Food', 'Pool Services', 'Sauna Services'];
  const filteredMenuItems = menuItems.filter(m => {
    const q = itemSearch.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-3xl w-full rounded-2xl p-6 shadow-2xl border transition-colors my-6 ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Edit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-lg">Edit Active Order: {order.orderNumber || `#${order.id}`}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                  order.status === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Reassign Table/Location, Waiter, Adjust Items, or Cancel Order with Direct Stock Restoration.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

          {/* Section 1: Location / Table & Waiter Reassignment */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
            <h4 className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>Location, Table & Staff Assignment</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Table Selector */}
              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">
                  Select Table / Seating Area
                </label>
                <select
                  value={selectedTableId || (customTableNumber ? 'custom' : '')}
                  onChange={(e) => handleTableSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
                >
                  <option value="">-- Choose Assigned Table --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.tableNumber} ({t.tableTag}) — {t.location || 'Indoor'} [{t.capacity} Seats]
                    </option>
                  ))}
                  <option value="custom">Custom Location / Direct Bar / Room</option>
                </select>

                {(selectedTableId === 'custom' || !selectedTableId) && (
                  <input
                    type="text"
                    placeholder="Enter custom location e.g. Pool Cabana #2, Terrace Booth..."
                    value={customTableNumber}
                    onChange={(e) => setCustomTableNumber(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
                  />
                )}
              </div>

              {/* Waiter Selector */}
              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">
                  Assigned Waiter / Staff
                </label>
                <select
                  value={selectedWaiterId}
                  onChange={(e) => handleWaiterChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
                >
                  <option value="">-- Select Waiter --</option>
                  {waiters.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.shift || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">Customer Name</label>
                <input
                  type="text"
                  placeholder="Walk-In Guest Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">Customer Phone</label>
                <input
                  type="text"
                  placeholder="+250 78X XXX XXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items & Quantities */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center space-x-1">
                <ShoppingBag className="w-4 h-4" />
                <span>Order Items ({items.length})</span>
              </h4>

              <button
                type="button"
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingItem ? 'Close Menu Picker' : '+ Add More Items'}</span>
              </button>
            </div>

            {/* Add Item Drawer */}
            {isAddingItem && (
              <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Search menu item to add..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                  {filteredMenuItems.map(m => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40 hover:bg-amber-500/10 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{m.name}</p>
                        <p className="text-[10px] text-gray-500">{m.category} • Stock: {m.stockQuantity}</p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(m.price)}</span>
                        <button
                          type="button"
                          onClick={() => handleAddItemToOrder(m)}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-black text-[10px] hover:bg-emerald-700"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Items Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-800 text-xs">
              <div className="bg-gray-100 dark:bg-gray-800 p-2.5 font-bold grid grid-cols-12 text-gray-500 text-[10px] uppercase">
                <span className="col-span-5">Item Name</span>
                <span className="col-span-3 text-center">Unit Price</span>
                <span className="col-span-2 text-center">Quantity</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="p-2.5 grid grid-cols-12 items-center bg-white dark:bg-gray-900">
                  <div className="col-span-5">
                    <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                    <span className="text-[10px] text-gray-400 font-mono">{item.category}</span>
                  </div>

                  <div className="col-span-3 text-center font-bold">
                    {formatCurrency(item.unitPrice)}
                  </div>

                  <div className="col-span-2 flex items-center justify-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 font-bold hover:bg-gray-300 text-gray-800 dark:text-gray-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-extrabold w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 font-bold hover:bg-gray-300 text-gray-800 dark:text-gray-200 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    <span className="font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(item.totalPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Remove Item from Order (Returns Stock)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Financial Summary */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 pt-1">
              <span>Discount</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 text-right font-bold text-emerald-600"
              />
            </div>
            <div className="flex justify-between font-black text-sm text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Updated Total</span>
              <span className="text-amber-500">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs">
              <span className="text-emerald-600">Amount Paid So Far</span>
              <span className="text-emerald-600">{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between font-black text-xs">
              <span className="text-rose-600">Balance Remaining</span>
              <span className="text-rose-600">{formatCurrency(balance)}</span>
            </div>
          </div>

          {/* Section 3: Dangerous Actions (Cancel / Delete Order with Stock Return) */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider">Order Cancellation & Stock Restoration</h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  Cancelling or deleting this order will immediately return all item quantities back to menu inventory and release any assigned table.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Cancel Order & Return Stock</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-rose-400 font-bold text-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Order Completely</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex space-x-3 pt-5 mt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-200"
          >
            Discard Changes
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Order Changes</span>
          </button>
        </div>

      </div>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 text-rose-500 mb-3">
              <RotateCcw className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base">Confirm Order Cancellation</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to cancel Order <span className="font-mono font-bold text-amber-500">{order.orderNumber || order.id}</span>?
              <br /><br />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Inventory Action: All {order.items.length} item(s) will be directly restored to stock inventory.
              </span>
              <br />
              <span className="font-bold text-purple-600 dark:text-purple-400">
                ✓ Table Action: Assigned table will be set to "Available".
              </span>
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs"
              >
                No, Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  onCancelOrderAndReturnStock(order);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
              >
                Yes, Cancel & Return Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ORDER CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 text-rose-500 mb-3">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base">Confirm Complete Deletion</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              This will permanently delete Order <span className="font-mono font-bold text-amber-500">{order.orderNumber || order.id}</span> from the database.
              <br /><br />
              Stock items will be automatically returned to inventory prior to deletion.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteOrderAndReturnStock(order.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
