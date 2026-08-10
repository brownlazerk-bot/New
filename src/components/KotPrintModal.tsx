import React from 'react';
import { Printer, X, ChefHat } from 'lucide-react';
import { KitchenTicket } from '../types';
import { printKotThermalTicket } from '../lib/kotPrinter';

interface KotPrintModalProps {
  ticket: KitchenTicket;
  onClose: () => void;
  darkMode: boolean;
  ticketType?: 'NEW ORDER' | 'UPDATED ORDER' | 'CANCELLED ITEM';
}

export const KotPrintModal: React.FC<KotPrintModalProps> = ({
  ticket,
  onClose,
  darkMode,
  ticketType = 'NEW ORDER'
}) => {
  const handlePrint = () => {
    printKotThermalTicket(ticket, ticketType as 'NEW ORDER' | 'UPDATED ORDER' | 'CANCELLED ITEM');
  };

  const orderDateObj = new Date(ticket.orderTime || Date.now());
  const timeFormatted = orderDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const tableVal = ticket.tableNumber 
    ? ticket.tableNumber.toUpperCase() 
    : 'COUNTER';

  const waiterVal = (ticket.waiterName || 'STAFF').toUpperCase();

  let orderTypeVal = (ticket.orderType || 'DINE IN').toUpperCase();
  if (!ticket.orderType) {
    if (tableVal.includes('ROOM')) orderTypeVal = 'ROOM SERVICE';
    else if (tableVal.includes('POOL')) orderTypeVal = 'POOL SERVICE';
    else if (tableVal.includes('TAKE')) orderTypeVal = 'TAKE AWAY';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <ChefHat className="w-5 h-5" />
            <h3 className="font-bold text-base">Kitchen Order Ticket (KOT)</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm High-Contrast Thermal Receipt Preview */}
        <div className="flex justify-center my-2">
          <div 
            className="w-[300px] bg-white text-black font-mono text-[13px] leading-snug p-4 border-2 border-black rounded-sm shadow-md select-text"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Double Border Header */}
            <div className="border-y-2 border-black py-2 my-1 text-center">
              <h2 className="font-black text-sm uppercase tracking-wider text-black">
                SEVEN TO SEVEN
              </h2>
              <p className="font-bold text-xs uppercase text-black">
                Sky View Resort
              </p>
              <h3 className="font-black text-base uppercase tracking-wider text-black mt-0.5">
                KITCHEN ORDER {ticketType !== 'NEW ORDER' ? `(${ticketType})` : ''}
              </h3>
            </div>

            {/* Info Table */}
            <div className="my-3 space-y-1.5 font-black text-sm">
              <div className="text-base font-black">
                TABLE : {tableVal}
              </div>
              <div>
                WAITER : {waiterVal}
              </div>
              <div>
                ORDER : {orderTypeVal}
              </div>
              <div>
                TIME : {timeFormatted}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-dashed border-black my-3"></div>

            {/* Order Items */}
            <div className="my-3 space-y-3">
              {ticket.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-black text-base uppercase leading-snug text-black">
                    {item.quantity} &times; {item.name}
                  </div>
                  {item.notes && (
                    <div className="font-black text-xs text-black pl-2">
                      * Note: {item.notes.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {ticket.specialNotes && (
              <div className="border-2 border-black p-2 my-2 font-black text-xs">
                SPECIAL INSTRUCTIONS:
                <div className="uppercase font-black mt-0.5">{ticket.specialNotes}</div>
              </div>
            )}

            {/* Bottom Separators */}
            <div className="border-t-2 border-dashed border-black my-3"></div>
            <div className="border-t-2 border-black mt-1"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print KOT Ticket (80mm)</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 font-bold text-xs transition-all cursor-pointer"
          >
            Done / Close
          </button>
        </div>

      </div>
    </div>
  );
};
