import React, { useState } from 'react';
import { 
  Waves, Flame, Ticket, User, DollarSign, 
  Printer, CheckCircle2, ShoppingBag 
} from 'lucide-react';
import { MenuItem, Order, PaymentMethod, Shift } from '../types';
import { printPoolTokenTicket, printSaunaTokenTicket } from '../lib/serviceTokenPrinter';

interface PoolSaunaModuleProps {
  menuItems: MenuItem[];
  currentShift?: Shift | null;
  onTicketSold: (order: Order) => void;
  darkMode: boolean;
  openShiftModal?: () => void;
}

export const PoolSaunaModule: React.FC<PoolSaunaModuleProps> = ({
  menuItems,
  currentShift,
  onTicketSold,
  darkMode,
  openShiftModal
}) => {
  const poolItems = menuItems.filter(m => m.category === 'Pool Services');
  const saunaItems = menuItems.filter(m => m.category === 'Sauna Services');

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(poolItems[0] || null);
  const [ticketQuantity, setTicketQuantity] = useState<number>(1);
  const [visitorName, setVisitorName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  const totalAmount = (selectedItem?.price || 0) * ticketQuantity;

  const handleSellPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert('Please select a ticket pass service.');
      return;
    }

    const orderId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const cashierTitle = currentShift?.cashierName || 'Pool/Sauna Cashier';

    const newOrder: Order = {
      id: orderId,
      orderNumber: `#${orderId}`,
      waiterId: 'c-01',
      waiterName: 'Pool/Sauna Cashier',
      customerName: visitorName.trim() || 'Resort Visitor',
      servicesIncluded: [selectedItem.category],
      items: [
        {
          itemId: selectedItem.id,
          name: selectedItem.name,
          category: selectedItem.category,
          unitPrice: selectedItem.price,
          quantity: ticketQuantity,
          totalPrice: totalAmount,
          isFood: false
        }
      ],
      subtotal: totalAmount,
      discount: 0,
      total: totalAmount,
      amountPaid: totalAmount,
      balance: 0,
      paymentStatus: 'PAID',
      paymentMethod,
      paymentDetails: { method: paymentMethod, cashPaid: totalAmount },
      paymentHistory: [
        {
          id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date().toISOString(),
          amount: totalAmount,
          method: paymentMethod,
          cashierName: cashierTitle,
          note: 'Ticket pass full payment'
        }
      ],
      status: 'Paid',
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      shiftId: currentShift?.id || 'sh-default',
      cashierName: cashierTitle
    };

    onTicketSold(newOrder);

    // Auto-print Piscine or Sauna Service Token Pass
    const tokenData = {
      id: `${selectedItem.category === 'Pool Services' ? 'POOL' : 'SAUNA'}-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: newOrder.id,
      tableNumber: 'Pool & Sauna Desk',
      waiterName: cashierTitle,
      cashierName: cashierTitle,
      customerName: newOrder.customerName,
      orderTime: newOrder.createdAt,
      paymentStatus: 'PAID',
      paymentMethod,
      items: [
        {
          itemId: selectedItem.id,
          name: selectedItem.name,
          quantity: ticketQuantity,
          unitPrice: selectedItem.price,
          totalPrice: totalAmount,
          category: selectedItem.category
        }
      ]
    };

    if (selectedItem.category === 'Pool Services') {
      printPoolTokenTicket(tokenData, 'PISCINE PASS TOKEN');
    } else {
      printSaunaTokenTicket(tokenData, 'SAUNA & SPA PASS TOKEN');
    }

    // Reset form
    setVisitorName('');
    setTicketQuantity(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Waves className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Swimming Pool & Sauna Ticketing
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fast-issue entry passes, cabana rentals, and wellness steam session tickets.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Ticket Types Selection */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Pool Passes */}
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <Waves className="w-4 h-4 text-blue-500" />
              <span>Pool Entry Passes</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {poolItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                        : darkMode
                          ? 'bg-gray-900 border-gray-800 hover:border-blue-500/50'
                          : 'bg-white border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <span className="font-black text-base">${item.price.toFixed(2)}</span>
                    </div>
                    <p className={`text-xs mt-2 ${isSelected ? 'opacity-90' : 'text-gray-500'}`}>
                      Unit: {item.unit} Pass
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sauna Passes */}
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Sauna & Steam Sessions</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {saunaItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-600 text-white border-orange-700 shadow-md shadow-orange-500/20'
                        : darkMode
                          ? 'bg-gray-900 border-gray-800 hover:border-orange-500/50'
                          : 'bg-white border-gray-200 hover:border-orange-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <span className="font-black text-base">${item.price.toFixed(2)}</span>
                    </div>
                    <p className={`text-xs mt-2 ${isSelected ? 'opacity-90' : 'text-gray-500'}`}>
                      Unit: {item.unit} Pass
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Pass Issue Form */}
        <div className="lg:col-span-5">
          <div className={`p-6 rounded-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              <span>Issue Admission Pass</span>
            </h3>

            {selectedItem ? (
              <form onSubmit={handleSellPass} className="space-y-4">
                
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Selected Service</p>
                  <p className="font-black text-sm text-gray-900 dark:text-white mt-0.5">{selectedItem.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">${selectedItem.price.toFixed(2)} per ticket</p>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Visitor / Guest Name</label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter guest name"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Number of Passes</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={ticketQuantity}
                    onChange={(e) => setTicketQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Money">Mobile Money (MoMo)</option>
                    <option value="Room Charge">Room Charge</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Total Amount</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400">${totalAmount.toFixed(2)}</p>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/30 flex items-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Issue Pass Ticket</span>
                  </button>
                </div>

              </form>
            ) : (
              <p className="text-xs text-gray-500 py-8 text-center">Please select a ticket type from the left list.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
