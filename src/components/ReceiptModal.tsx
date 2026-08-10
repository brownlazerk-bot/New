import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';
import { formatCurrency } from '../lib/currency';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
  darkMode: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, darkMode }) => {
  const handlePrint = () => {
    const printContent = document.getElementById('thermal-receipt-printable');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print receipt.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title></title>
          <style>
            @page {
              size: 80mm 210mm;
              margin: 0mm !important;
            }
            @media print {
              @page {
                size: 80mm 210mm;
                margin: 0mm !important;
              }
              html, body {
                width: 72.1mm !important;
                max-width: 72.1mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
              }
            }
            * {
              box-sizing: border-box;
              color: #000000 !important;
              background-color: transparent !important;
              border-color: #000000 !important;
              text-shadow: none !important;
              box-shadow: none !important;
            }
            html, body {
              width: 72.1mm;
              max-width: 72.1mm;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
              font-size: 11px;
              line-height: 1.3;
              font-weight: 700;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .receipt-body {
              width: 72.1mm;
              max-width: 72.1mm;
              margin: 0 auto;
              padding: 2mm 0mm 2mm 0mm;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }

            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin: 6px 0;
            }
            .receipt-table th {
              border-top: 1px dashed #000000;
              border-bottom: 1px dashed #000000;
              padding: 4px 0;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .receipt-table td {
              padding: 3px 0;
              vertical-align: top;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            .divider-dashed {
              border-top: 1px dashed #000000;
              margin: 6px 0;
            }
            .divider-double {
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              margin: 6px 0;
              padding: 3px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-bottom: 3px;
            }
            .grand-total-row {
              font-size: 14px;
              font-weight: 900;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              padding: 4px 0;
              margin: 6px 0;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; left: 0; right: 0; background: #0f172a; color: #ffffff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 99999; font-family: sans-serif; border-bottom: 2px solid #f59e0b; margin-bottom: 10px;">
            <div style="font-weight: bold; font-size: 12px; color: #f59e0b;">
              RECEIPT #${receiptNo}
            </div>
            <div style="display: flex; gap: 6px;">
              <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                🖨️ Print
              </button>
              <button onclick="downloadAsPDF()" style="background: #10b981; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                📥 Download PDF
              </button>
              <button onclick="window.close()" style="background: #334155; color: #cbd5e1; border: none; padding: 6px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; cursor: pointer;">
                ✕
              </button>
            </div>
          </div>

          <div id="receipt-printable-area" class="receipt-body">
            ${printContent.innerHTML}
          </div>

          <script>
            function downloadAsPDF() {
              const element = document.getElementById('receipt-printable-area');
              const noPrints = document.querySelectorAll('.no-print');
              noPrints.forEach(el => el.style.display = 'none');

              const opt = {
                margin:       [2, 2, 2, 2],
                filename:     'Receipt_${receiptNo}.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: [80, 210], orientation: 'portrait' }
              };

              if (typeof html2pdf !== 'undefined') {
                html2pdf().set(opt).from(element).save().then(() => {
                  noPrints.forEach(el => el.style.display = 'flex');
                }).catch(err => {
                  noPrints.forEach(el => el.style.display = 'flex');
                  window.print();
                });
              } else {
                noPrints.forEach(el => el.style.display = 'flex');
                window.print();
              }
            }

            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const receiptNo = order.orderNumber || order.id;
  const orderDateObj = new Date(order.paidAt || order.createdAt);
  const dateStr = orderDateObj.toLocaleDateString('en-GB');
  const timeStr = orderDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const locationOrTable = order.tableNumber 
    ? `TABLE ${order.tableNumber.toUpperCase()}` 
    : order.paymentDetails?.roomOrAptNumber 
    ? `ROOM ${order.paymentDetails.roomOrAptNumber}` 
    : 'COUNTER / BAR';

  const amountPaid = order.paymentDetails?.cashPaid || order.amountPaid || order.total;
  const changeGiven = order.paymentDetails?.changeGiven || (amountPaid > order.total ? amountPaid - order.total : 0);
  const paymentMethod = (order.paymentMethod || order.paymentDetails?.method || 'CASH').toUpperCase();
  const waiterName = (order.waiterName || 'STAFF').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`relative max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-base">Payment Completed</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Professional Thermal Receipt Preview Card */}
        <div className="flex justify-center my-2">
          <div 
            id="thermal-receipt-printable" 
            className="w-[280px] bg-white text-black font-mono text-[11px] leading-relaxed p-3 border border-gray-400 rounded-sm shadow-md select-text"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Header / Business Information */}
            <div className="text-center space-y-0.5 mb-2">
              <h2 className="font-black text-base tracking-wider uppercase text-black">
                SEVEN TO SEVEN
              </h2>
              <p className="text-[10px] font-bold text-black uppercase tracking-wide">
                Sky View Resort
              </p>
              <p className="text-[10px] font-black text-black uppercase">
                HOTEL • RESTAURANT • BAR • LOUNGE
              </p>
              <p className="text-[10px] text-black">KAMONYI-RUNDA</p>
              <p className="text-[10px] font-black text-black">Pay or Call Waiter: 0799712642</p>
              <p className="text-[10px] font-black text-black">TIN: 156404753</p>
            </div>

            {/* Receipt Information Section */}
            <div className="border-t border-b border-dashed border-black py-2 my-2 space-y-1 text-[10px] font-bold">
              <div className="flex justify-between">
                <span>RECEIPT NO:</span>
                <span className="font-black">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>ORDER NO:</span>
                <span>{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME:</span>
                <span>{timeStr}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="uppercase font-black">{order.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TABLE / ROOM:</span>
                <span className="font-black uppercase">{locationOrTable}</span>
              </div>
              <div className="flex justify-between">
                <span>WAITER:</span>
                <span className="uppercase font-black">{waiterName}</span>
              </div>
            </div>

            {/* Items Table - Strict Column Auto-Wrap */}
            <div className="my-2">
              <table className="w-full border-collapse text-[10px] font-bold" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="border-b border-dashed border-black">
                    <th className="text-left font-black uppercase py-1" style={{ width: '52%' }}>Item Name</th>
                    <th className="text-center font-black uppercase py-1" style={{ width: '16%' }}>Qty</th>
                    <th className="text-right font-black uppercase py-1" style={{ width: '32%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="text-left font-black py-1.5 align-top pr-1" style={{ wordBreak: 'break-word' }}>
                        {item.name}
                        {item.notes && (
                          <div className="text-[9px] font-normal italic text-black">
                            * {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="text-center font-bold py-1.5 align-top">
                        {item.quantity}
                      </td>
                      <td className="text-right font-black py-1.5 align-top">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal / Payment Summary Section */}
            <div className="border-t border-dashed border-black pt-2 mt-2 space-y-1 text-[10px] font-bold">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Service Charge</span>
                <span>{order.serviceCharge ? formatCurrency(order.serviceCharge) : '0'}</span>
              </div>

              {!!order.otherCharges && order.otherCharges > 0 && (
                <div className="flex justify-between">
                  <span>Other Charges</span>
                  <span>+{formatCurrency(order.otherCharges)}</span>
                </div>
              )}

              {/* GRAND TOTAL */}
              <div className="border-t-2 border-b-2 border-black py-1.5 my-2 flex justify-between items-center text-xs font-black">
                <span className="uppercase tracking-wider">GRAND TOTAL</span>
                <span className="text-sm font-black text-black">{formatCurrency(order.total)}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-0.5 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>Paid Amount</span>
                  <span className="font-bold">{formatCurrency(amountPaid)}</span>
                </div>

                {changeGiven > 0 && (
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span className="font-black">{formatCurrency(changeGiven)}</span>
                  </div>
                )}

                {order.balance > 0 && (
                  <div className="flex justify-between font-black">
                    <span>Outstanding Balance</span>
                    <span>{formatCurrency(order.balance)}</span>
                  </div>
                )}

                <div className="flex justify-between font-black uppercase pt-1 border-t border-dotted border-black">
                  <span>Payment Method</span>
                  <span>: {paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="text-center pt-2 border-t border-dashed border-black mt-2 space-y-1">
              <p className="text-[10px] font-bold text-black">
                Served By : {waiterName}
              </p>
              <p className="text-[10px] font-black uppercase text-black pt-1">
                Thank you for visiting Seven to Seven (Sky View Resort).
              </p>
              <p className="text-[10px] font-bold text-black">
                We appreciate your business.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Customer Receipt (80mm)</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 font-bold text-xs transition-all cursor-pointer"
          >
            Done / New Order
          </button>
        </div>

      </div>
    </div>
  );
};
