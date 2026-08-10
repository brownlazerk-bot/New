import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { DailyReportData, Order, Shift } from '../types';
import { formatCurrency } from './currency';

export function printReportHTML(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print reports.');
    return;
  }

  const cleanFilename = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .report-container {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1f2937;
            background-color: #f8fafc;
          }
          .toolbar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            background: #0f172a;
            color: #ffffff;
            padding: 10px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 99999;
            border-bottom: 2px solid #f59e0b;
          }
          .toolbar-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 800;
            font-size: 14px;
          }
          .toolbar-btn {
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
          }
          .btn-print {
            background: #f59e0b;
            color: #0f172a;
          }
          .btn-print:hover {
            background: #d97706;
          }
          .btn-pdf {
            background: #10b981;
            color: #ffffff;
          }
          .btn-pdf:hover {
            background: #059669;
          }
          .btn-close {
            background: #334155;
            color: #cbd5e1;
          }
          .btn-close:hover {
            background: #475569;
            color: #ffffff;
          }
          .report-container {
            max-width: 1000px;
            margin: 20px auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          h1, h2, h3 { color: #111827; margin-bottom: 8px; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #f3f4f6; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; }
          .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: bold; }
          .card-value { font-size: 20px; font-weight: bold; color: #111827; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; font-weight: 600; }
          td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #f9fafb; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <div class="toolbar-title">
            <span style="color: #f59e0b;">SEVEN TO SEVEN</span>
            <span style="color: #94a3b8;">| ${title}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="window.print()" class="toolbar-btn btn-print">
              🖨️ Print Document
            </button>
            <button onclick="downloadAsPDF()" class="toolbar-btn btn-pdf">
              📥 Download PDF
            </button>
            <button onclick="window.close()" class="toolbar-btn btn-close">
              ✕ Close
            </button>
          </div>
        </div>

        <div id="report-printable-area" class="report-container">
          ${htmlContent}
        </div>

        <script>
          function downloadAsPDF() {
            const element = document.getElementById('report-printable-area');
            const noPrints = document.querySelectorAll('.no-print');
            noPrints.forEach(el => el.style.display = 'none');

            const opt = {
              margin:       [5, 5, 5, 5],
              filename:     '${cleanFilename}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, logging: false },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (typeof html2pdf !== 'undefined') {
              html2pdf().set(opt).from(element).save().then(() => {
                noPrints.forEach(el => el.style.display = 'flex');
              }).catch(err => {
                console.error(err);
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
            }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportDailyReportPDF(report: DailyReportData) {
  const doc = new jsPDF();

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SKY VIEW RESORT APARTMENT', 14, 18);
  
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'normal');
  doc.text('DAILY BAR & CASHIER FINANCIAL REPORT', 14, 26);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report Date: ${report.date}  |  Generated At: ${new Date(report.generatedAt).toLocaleString()}`, 14, 33);
  doc.text(`Cashier-in-Charge: ${report.cashierName}`, 14, 39);

  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 43, 196, 43);

  let y = 50;

  // Financial Summary
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 14, y);
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  const metrics = [
    ['Gross Revenue:', formatCurrency(report.grossRevenue), 'Total Transactions:', `${report.totalTransactions}`],
    ['Discounts Applied:', formatCurrency(report.discounts), 'NET REVENUE:', formatCurrency(report.netRevenue)],
    ['Cash Collected:', formatCurrency(report.cashCollected), 'Card Collected:', formatCurrency(report.cardCollected)],
    ['Mobile Money:', formatCurrency(report.mobileMoneyCollected), 'Room/Apt Charges:', formatCurrency(report.outstandingRoomCharges)],
    ['Current Stock Value:', formatCurrency(report.currentStockValue), '', ''],
  ];

  metrics.forEach(([lbl1, val1, lbl2, val2]) => {
    doc.text(lbl1, 14, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val1, 55, y);

    doc.setFont('Helvetica', 'normal');
    doc.text(lbl2, 110, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val2, 160, y);

    doc.setFont('Helvetica', 'normal');
    y += 6;
  });

  y += 4;
  doc.line(14, y, 196, y);
  y += 8;

  // Departmental Revenues
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. DEPARTMENTAL REVENUE BREAKDOWN', 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  const deptBreakdown = [
    ['Bar (Drink Sales):', `${formatCurrency(report.totalDrinkSales)} (${report.drinksSoldQty} units)`],
    ['Restaurant (Food Orders):', `${formatCurrency(report.foodRevenue)} (${report.totalFoodOrders} orders)`],
    ['Swimming Pool Passes:', `${formatCurrency(report.poolRevenue)} (${report.poolVisitorsCount} passes)`],
    ['Sauna & Steam Sessions:', `${formatCurrency(report.saunaRevenue)} (${report.saunaVisitorsCount} sessions)`],
    ['Hotel Guest Room Charges:', formatCurrency(report.roomRevenue)],
    ['Apartment Suite Charges:', formatCurrency(report.apartmentRevenue)],
  ];

  deptBreakdown.forEach(([dept, amount]) => {
    doc.text(dept, 14, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(amount, 90, y);
    doc.setFont('Helvetica', 'normal');
    y += 6;
  });

  y += 4;
  doc.line(14, y, 196, y);
  y += 8;

  // Best Selling Drinks
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. TOP SELLING DRINKS', 14, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('Item Name', 14, y);
  doc.text('Qty Sold', 120, y);
  doc.text('Total Revenue', 160, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('Helvetica', 'normal');
  if (report.bestSellingDrinks.length === 0) {
    doc.text('No drink sales recorded for this date.', 14, y);
    y += 6;
  } else {
    report.bestSellingDrinks.forEach((item) => {
      doc.text(item.name, 14, y);
      doc.text(`${item.qty}`, 120, y);
      doc.text(formatCurrency(item.revenue), 160, y);
      y += 5;
    });
  }

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('*** Official Hotel System Generated Financial Record - No Manual Signature Required ***', 14, y);

  doc.save(`Daily_Report_Bar_${report.date}.pdf`);
}

export function exportDailyReportExcel(report: DailyReportData) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['SKY VIEW RESORT APARTMENT'],
    ['DAILY BAR & CASHIER FINANCIAL REPORT'],
    [`Report Date`, report.date],
    [`Generated At`, new Date(report.generatedAt).toLocaleString()],
    [`Cashier Name`, report.cashierName],
    [],
    ['FINANCIAL SUMMARY METRIC', 'VALUE (RWF)'],
    ['Gross Revenue', report.grossRevenue],
    ['Discounts Applied', report.discounts],
    ['NET REVENUE', report.netRevenue],
    [],
    ['PAYMENT METHOD BREAKDOWN', 'COLLECTED AMOUNT (RWF)'],
    ['Cash Collected', report.cashCollected],
    ['Card Payment', report.cardCollected],
    ['Mobile Money (MoMo)', report.mobileMoneyCollected],
    ['Room & Apartment Charges', report.outstandingRoomCharges],
    [],
    ['DEPARTMENTAL REVENUES', 'REVENUE (RWF)', 'VOLUME'],
    ['Bar (Drink Sales)', report.totalDrinkSales, `${report.drinksSoldQty} units`],
    ['Restaurant (Food Orders)', report.foodRevenue, `${report.totalFoodOrders} orders`],
    ['Swimming Pool', report.poolRevenue, `${report.poolVisitorsCount} passes`],
    ['Sauna & Steam', report.saunaRevenue, `${report.saunaVisitorsCount} sessions`],
    ['Room Charges', report.roomRevenue, '-'],
    ['Apartment Charges', report.apartmentRevenue, '-'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');

  // Bestsellers Sheet
  const bestData = [
    ['TOP SELLING DRINKS'],
    ['Drink Name', 'Quantity Sold', 'Total Revenue (RWF)'],
    ...report.bestSellingDrinks.map(b => [b.name, b.qty, b.revenue])
  ];
  const wsBest = XLSX.utils.aoa_to_sheet(bestData);
  XLSX.utils.book_append_sheet(wb, wsBest, 'Top Drinks');

  XLSX.writeFile(wb, `Daily_Report_Bar_${report.date}.xlsx`);
}

export function exportGenericExcel(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]) {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportGenericPDF(title: string, subtitle: string, headers: string[], rows: (string | number)[][], filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SKY VIEW RESORT APARTMENT', 14, 15);
  
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), 14, 22);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${subtitle} | Date: ${new Date().toLocaleDateString()}`, 14, 28);
  
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 31, 283, 31);

  let y = 37;
  const colWidth = Math.floor(269 / Math.max(1, headers.length));

  // Table Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  headers.forEach((h, idx) => {
    doc.text(h, 14 + (idx * colWidth), y);
  });
  
  y += 3;
  doc.line(14, y, 283, y);
  y += 5;

  // Rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  
  rows.forEach((row) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    row.forEach((cell, idx) => {
      const text = String(cell ?? '');
      doc.text(text.length > 26 ? text.substring(0, 24) + '...' : text, 14 + (idx * colWidth), y);
    });
    y += 5;
  });

  doc.save(`${filename}.pdf`);
}

export function exportShiftReportPDF(shift: Shift, orders: Order[]) {
  const shiftOrders = orders.filter(o => o.shiftId === shift.id);
  const paidOrders = shiftOrders.filter(o => o.status === 'Paid' || o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY PAID');
  
  const cashSales = paidOrders.reduce((sum, o) => sum + (o.paymentDetails?.cashPaid || 0) - (o.paymentDetails?.changeGiven || 0), 0);
  const cardSales = paidOrders.reduce((sum, o) => sum + (o.paymentDetails?.cardPaid || 0), 0);
  const momoSales = paidOrders.reduce((sum, o) => sum + (o.paymentDetails?.mobileMoneyPaid || 0), 0);
  const roomSales = paidOrders.reduce((sum, o) => sum + (o.paymentDetails?.roomChargeAmount || 0), 0);
  const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);

  const doc = new jsPDF();

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SKY VIEW RESORT APARTMENT', 14, 18);
  
  doc.setFontSize(13);
  doc.text(`CASHIER SHIFT REGISTER CLOSING REPORT - SHIFT #${shift.shiftNumber || shift.id}`, 14, 26);
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Business Date: ${shift.businessDate}  |  Status: ${shift.status}`, 14, 33);
  doc.text(`Cashier: ${shift.cashierName}  |  Opened: ${new Date(shift.openedAt).toLocaleString()}`, 14, 39);
  if (shift.closedAt) {
    doc.text(`Closed At: ${new Date(shift.closedAt).toLocaleString()}  |  Closed By: ${shift.closedBy || shift.cashierName}`, 14, 45);
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 49, 196, 49);

  let y = 56;

  // Float & Tally Metrics
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('1. CASH DRAWER TALLY & RECONCILIATION', 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  const metrics = [
    ['Opening Float Cash:', formatCurrency(shift.openingCash), 'Cash Collected:', formatCurrency(cashSales)],
    ['POS Card Payments:', formatCurrency(cardSales), 'Mobile Money:', formatCurrency(momoSales)],
    ['Room Charges:', formatCurrency(roomSales), 'TOTAL SHIFT SALES:', formatCurrency(totalSales)],
    ['Expected Cash in Drawer:', formatCurrency(shift.closingCashExpected || 0), 'Actual Cash Counted:', formatCurrency(shift.closingCashActual || 0)],
    ['Variance / Discrepancy:', formatCurrency(shift.difference || 0), 'Total Orders Processed:', `${shiftOrders.length}`]
  ];

  metrics.forEach(([lbl1, val1, lbl2, val2]) => {
    doc.text(lbl1, 14, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val1, 62, y);

    doc.setFont('Helvetica', 'normal');
    doc.text(lbl2, 110, y);
    doc.setFont('Helvetica', 'bold');
    doc.text(val2, 160, y);

    doc.setFont('Helvetica', 'normal');
    y += 6;
  });

  if (shift.notes) {
    y += 2;
    doc.setFont('Helvetica', 'italic');
    doc.text(`Closing Notes: ${shift.notes}`, 14, y);
    y += 6;
  }

  y += 4;
  doc.line(14, y, 196, y);
  y += 8;

  // Shift Orders
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. SHIFT ORDER TRANSACTIONS', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.text('Order #', 14, y);
  doc.text('Table/Room', 50, y);
  doc.text('Method', 90, y);
  doc.text('Status', 130, y);
  doc.text('Total', 165, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  shiftOrders.slice(0, 25).forEach(o => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(o.orderNumber || o.id, 14, y);
    doc.text(o.tableNumber ? `Table ${o.tableNumber}` : o.paymentDetails?.roomOrAptNumber ? `Room ${o.paymentDetails.roomOrAptNumber}` : 'Counter', 50, y);
    doc.text(o.paymentMethod || 'Cash', 90, y);
    doc.text(o.status, 130, y);
    doc.text(formatCurrency(o.total), 165, y);
    y += 5;
  });

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('*** Official Cashier Shift Register Closing Document ***', 14, y);

  doc.save(`Shift_${shift.shiftNumber || shift.id}_Report.pdf`);
}

