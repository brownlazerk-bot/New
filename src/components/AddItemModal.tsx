import React, { useState } from 'react';
import { Search, Plus, Trash2, X, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Order, OrderItem, MenuItem, KitchenTicket } from '../types';
import { 
  printKotThermalTicket, 
  printPoolTokenTicket, 
  printSaunaTokenTicket, 
  printRoomTokenTicket 
} from '../lib/serviceTokenPrinter';

interface AddItemModalProps {
  order: Order;
  menuItems: MenuItem[];
  onClose: () => void;
  onItemsAdded: (updatedOrder: Order, newKot?: KitchenTicket) => void;
  darkMode: boolean;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  order,
  menuItems,
  onClose,
  onItemsAdded,
  darkMode
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newItems, setNewItems] = useState<OrderItem[]>([]);
  const [specialNote, setSpecialNote] = useState<string>('');

  const categories = [
    'All', 'Beers', 'Soft Drinks', 'Wines', 'Whisky', 
    'Cocktails', 'Juices', 'Water', 'Coffee', 'Tea', 
    'Food', 'Pool Services', 'Sauna Services'
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const addItemToPending = (item: MenuItem) => {
    const isOutOfStock = item.status === 'Out of Stock' || (typeof item.stockQuantity === 'number' && item.stockQuantity <= 0);
    if (isOutOfStock) {
      alert(`Sorry, "${item.name}" is out of stock / unavailable and cannot be added!`);
      return;
    }

    setNewItems(prev => {
      const idx = prev.findIndex(i => i.itemId === item.id);
      const existingInOrder = order.items.find(i => i.itemId === item.id)?.quantity || 0;
      const currentPending = idx > -1 ? prev[idx].quantity : 0;
      const totalRequested = existingInOrder + currentPending + 1;

      if (typeof item.stockQuantity === 'number' && totalRequested > item.stockQuantity) {
        alert(`Cannot add more "${item.name}". Total available stock limit is ${item.stockQuantity} ${item.unit || 'pcs'}.`);
        return prev;
      }

      if (idx > -1) {
        const copy = [...prev];
        const newQty = copy[idx].quantity + 1;
        copy[idx] = {
          ...copy[idx],
          quantity: newQty,
          totalPrice: newQty * copy[idx].unitPrice
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            category: item.category,
            unitPrice: item.price,
            quantity: 1,
            totalPrice: item.price,
            isFood: item.isFood || item.category === 'Food'
          }
        ];
      }
    });
  };

  const updatePendingQty = (itemId: string, delta: number) => {
    const targetItem = menuItems.find(m => m.id === itemId);

    setNewItems(prev => {
      return prev.map(item => {
        if (item.itemId === itemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          if (delta > 0 && targetItem && typeof targetItem.stockQuantity === 'number') {
            const existingInOrder = order.items.find(i => i.itemId === itemId)?.quantity || 0;
            if (existingInOrder + newQty > targetItem.stockQuantity) {
              alert(`Cannot increase quantity for "${targetItem.name}". Available stock limit is ${targetItem.stockQuantity} ${targetItem.unit || 'pcs'}.`);
              return item;
            }
          }

          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.unitPrice
          };
        }
        return item;
      }).filter(Boolean) as OrderItem[];
    });
  };

  const handleSaveAdditions = () => {
    if (newItems.length === 0) {
      alert('Please select at least one item to add.');
      return;
    }

    // Combine existing items with new items
    const combinedItems = [...order.items];
    const newServices = new Set<string>(order.servicesIncluded || []);

    newItems.forEach(newItem => {
      // Add service tag
      if (newItem.category === 'Food') newServices.add('Food');
      else if (newItem.category === 'Pool Services') newServices.add('Pool Services');
      else if (newItem.category === 'Sauna Services') newServices.add('Sauna Services');
      else newServices.add('Drinks');

      const existingIdx = combinedItems.findIndex(i => i.itemId === newItem.itemId);
      if (existingIdx > -1) {
        const updatedQty = combinedItems[existingIdx].quantity + newItem.quantity;
        combinedItems[existingIdx] = {
          ...combinedItems[existingIdx],
          quantity: updatedQty,
          totalPrice: updatedQty * combinedItems[existingIdx].unitPrice
        };
      } else {
        combinedItems.push(newItem);
      }
    });

    const addedSubtotal = newItems.reduce((s, i) => s + i.totalPrice, 0);

    const newSubtotal = order.subtotal + addedSubtotal;
    const newGrandTotal = Math.max(0, newSubtotal - (order.discount || 0));
    const newBalance = Math.max(0, newGrandTotal - (order.amountPaid || 0));

    let newStatus = order.status;
    let newPaymentStatus = order.paymentStatus;

    if (newBalance > 0 && order.paymentStatus === 'PAID') {
      newPaymentStatus = 'PARTIALLY PAID';
      newStatus = 'Partially Paid';
    }

    // Check if new food items generate a new KOT
    const newFoodItems = newItems.filter(i => i.isFood || i.category === 'Food');
    let newKot: KitchenTicket | undefined = undefined;

    if (newFoodItems.length > 0) {
      const kotId = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
      newKot = {
        id: kotId,
        orderId: order.id,
        tableNumber: order.tableNumber || 'Bar Order',
        waiterName: order.waiterName,
        customerName: order.customerName,
        items: newFoodItems.map(f => ({
          itemId: f.itemId,
          name: f.name,
          quantity: f.quantity,
          notes: f.notes
        })),
        orderTime: new Date().toISOString(),
        status: 'Pending',
        specialNotes: specialNote ? `Additional items order: ${specialNote}` : 'Additional items order'
      };

      // Auto-print 80mm ESC/POS KOT ticket for kitchen staff
      printKotThermalTicket(newKot, 'UPDATED ORDER');
    }

    // Check if new pool items generate a Pool Token
    const newPoolItems = newItems.filter(i => i.category === 'Pool Services');
    if (newPoolItems.length > 0) {
      printPoolTokenTicket({
        orderId: order.id,
        tableNumber: order.tableNumber || 'Poolside',
        waiterName: order.waiterName,
        customerName: order.customerName,
        paymentStatus: newPaymentStatus,
        items: newPoolItems.map(p => ({
          itemId: p.itemId,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          totalPrice: p.totalPrice,
          notes: p.notes
        }))
      }, 'UPDATED POOL PASS');
    }

    // Check if new sauna items generate a Sauna Token
    const newSaunaItems = newItems.filter(i => i.category === 'Sauna Services');
    if (newSaunaItems.length > 0) {
      printSaunaTokenTicket({
        orderId: order.id,
        tableNumber: order.tableNumber || 'Sauna Desk',
        waiterName: order.waiterName,
        customerName: order.customerName,
        paymentStatus: newPaymentStatus,
        items: newSaunaItems.map(s => ({
          itemId: s.itemId,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          totalPrice: s.totalPrice,
          notes: s.notes
        }))
      }, 'UPDATED SAUNA PASS');
    }

    // Check if new room items generate a Room Voucher Token
    const newRoomItems = newItems.filter(i => i.category === 'Room Services' || i.category === 'Apartment Services');
    if (newRoomItems.length > 0) {
      printRoomTokenTicket({
        orderId: order.id,
        roomNumber: order.tableNumber || 'Reception',
        waiterName: order.waiterName,
        customerName: order.customerName,
        paymentStatus: newPaymentStatus,
        items: newRoomItems.map(r => ({
          itemId: r.itemId,
          name: r.name,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          totalPrice: r.totalPrice,
          notes: r.notes
        }))
      }, 'UPDATED ROOM VOUCHER');
    }

    const updatedOrder: Order = {
      ...order,
      items: combinedItems,
      servicesIncluded: Array.from(newServices),
      subtotal: newSubtotal,
      total: newGrandTotal,
      balance: newBalance,
      status: newStatus,
      paymentStatus: newPaymentStatus,
      kotGenerated: order.kotGenerated || newKot !== undefined,
      kotId: newKot ? newKot.id : order.kotId
    };

    onItemsAdded(updatedOrder, newKot);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-3xl w-full rounded-2xl p-6 shadow-2xl border transition-colors flex flex-col max-h-[90vh] ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4 shrink-0">
          <div>
            <h3 className="font-bold text-lg">Add Items to Order {order.orderNumber || `#${order.id}`}</h3>
            <p className="text-xs text-gray-500">
              {order.tableNumber ? `Table: ${order.tableNumber}` : 'Direct Sale'} | Customer: {order.customerName || 'Walk-In'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto flex-1 pr-1">
          
          {/* Menu Search & List (Left 7 Cols) */}
          <div className="md:col-span-7 flex flex-col space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu to add..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <div className="flex space-x-1 overflow-x-auto no-scrollbar py-1">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${
                    selectedCategory === c ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
              {filteredMenuItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addItemToPending(item)}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-amber-500 cursor-pointer flex justify-between items-center text-xs bg-gray-50/50 dark:bg-gray-800/40"
                >
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-gray-500">${item.price.toFixed(2)} / {item.unit}</p>
                  </div>
                  <Plus className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Pending Additions Cart (Right 5 Cols) */}
          <div className="md:col-span-5 flex flex-col justify-between border-l border-gray-200 dark:border-gray-800 pl-4">
            <div>
              <div className="flex items-center space-x-1.5 pb-2 border-b border-gray-200 dark:border-gray-800 mb-2">
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs">New Items to Add</h4>
              </div>

              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {newItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">Tap menu items on left to add to order.</p>
                ) : (
                  newItems.map(item => (
                    <div key={item.itemId} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs flex justify-between items-center">
                      <div className="flex-1 pr-2">
                        <p className="font-bold line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-gray-500">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => updatePendingQty(item.itemId, -1)} className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 font-bold">-</button>
                        <span className="font-bold px-1 text-xs">{item.quantity}</span>
                        <button onClick={() => updatePendingQty(item.itemId, 1)} className="w-5 h-5 rounded bg-amber-500 text-white font-bold">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 mt-3 space-y-2">
              <input
                type="text"
                placeholder="Kitchen note for additions..."
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
              />

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdditions}
                  disabled={newItems.length === 0}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 shadow-md flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Order</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
