import { KitchenTicket, Order } from '../types';

export type ServiceDepartment = 'Kitchen' | 'Pool' | 'Sauna' | 'Room' | 'Other';

export interface ServiceTokenData {
  id: string; // e.g. "KOT-1001", "POOL-8021", "SAUNA-3012", "ROOM-102"
  orderId?: string;
  orderNumber?: string;
  department: ServiceDepartment;
  tableNumber?: string;
  roomNumber?: string;
  waiterName?: string;
  cashierName?: string;
  customerName?: string;
  orderTime?: string;
  ticketType?: string;
  specialNotes?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items: {
    itemId?: string;
    name: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    notes?: string;
    category?: string;
  }[];
}

/**
 * Universal Service Token & Ticket Thermal Printer
 * Supports Kitchen (KOT), Swimming Pool (Piscine), Sauna & Spa, and Room Accommodation Vouchers
 */
export function printServiceTokenTicket(
  token: ServiceTokenData,
  ticketType: string = 'NEW ORDER'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print Service Token Ticket.');
    return;
  }

  // Format Time
  const orderDateObj = new Date(token.orderTime || Date.now());
  const timeFormatted = orderDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const dateFormatted = orderDateObj.toLocaleDateString('en-GB');

  // Location / Room / Table
  const locationVal = (
    token.roomNumber || token.tableNumber || 'DESK / COUNTER'
  ).toUpperCase();

  // Staff
  const staffVal = (
    token.waiterName || token.cashierName || 'STAFF'
  ).toUpperCase();

  const customerVal = (token.customerName || 'GUEST').toUpperCase();

  // Department Configuration
  let deptTitle = 'SERVICE TOKEN';
  let deptSub = 'ENTRY PASS & VOUCHER';
  let deptIcon = '🎟️';
  let headerColor = '#0f172a';
  let badgeColor = '#f59e0b';
  let rulesBoxHtml = '';

  if (token.department === 'Kitchen') {
    deptTitle = 'KITCHEN ORDER TICKET';
    deptSub = 'BON DE COMMANDE';
    deptIcon = '🍳';
    headerColor = '#9f1239'; // rose-800
    badgeColor = '#e11d48';
    rulesBoxHtml = `
      <div style="border: 1px dashed #000; padding: 6px; margin: 8px 0; font-size: 11px; text-align: center;">
        * KITCHEN PREPARATION ORDER *
      </div>
    `;
  } else if (token.department === 'Pool') {
    deptTitle = 'SWIMMING POOL PASS';
    deptSub = 'PISCINE SERVICE TOKEN';
    deptIcon = '🏊';
    headerColor = '#0369a1'; // sky-700
    badgeColor = '#0284c7';
    rulesBoxHtml = `
      <div style="border: 2px solid #000; padding: 6px; margin: 8px 0; font-size: 11px;">
        <div style="font-weight: 900; text-align: center; margin-bottom: 4px; text-decoration: underline;">
          AMATEGEKO Y'IKIDENDEZI / POOL RULES
        </div>
        1. Garagaza iyi token ku mucungagihano w'ikidendezi.<br/>
           (Present this token to Lifeguard / Pool Attendant).<br/>
        2. Wambare umwenda wo kwogeramo ukwiye (Proper swimwear required).<br/>
        3. Yemewe uyu munsi gusa (Valid for single entry today).
      </div>
    `;
  } else if (token.department === 'Sauna') {
    deptTitle = 'SAUNA & SPA PASS';
    deptSub = 'STEAM SESSION SERVICE TOKEN';
    deptIcon = '🔥';
    headerColor = '#c2410c'; // orange-700
    badgeColor = '#ea580c';
    rulesBoxHtml = `
      <div style="border: 2px solid #000; padding: 6px; margin: 8px 0; font-size: 11px;">
        <div style="font-weight: 900; text-align: center; margin-bottom: 4px; text-decoration: underline;">
          AMATEGEKO Y'A SAUNA / SAUNA RULES
        </div>
        1. Garagaza iyi token ku mucungagihano wa Sauna.<br/>
           (Present token to Sauna & Spa Attendant).<br/>
        2. Yemewe igihe cyagenewe serivisi gusa.<br/>
           (Valid for allocated session duration today).
      </div>
    `;
  } else if (token.department === 'Room') {
    deptTitle = 'ROOM SERVICE VOUCHER';
    deptSub = 'ACCOMMODATION & ROOM PASS';
    deptIcon = '🏨';
    headerColor = '#6b21a8'; // purple-800
    badgeColor = '#9333ea';
    rulesBoxHtml = `
      <div style="border: 2px solid #000; padding: 6px; margin: 8px 0; font-size: 11px;">
        <div style="font-weight: 900; text-align: center; margin-bottom: 4px; text-decoration: underline;">
          VOUCHER Y'ICUMBI / ROOM VOUCHER
        </div>
        1. Garagaza iyi voucher kuri Reception / Housekeeping.<br/>
           (Present voucher at Reception / Housekeeping desk).<br/>
        2. Check-out time is 11:00 AM.
      </div>
    `;
  }

  // Items List
  const itemsHtml = token.items.map(item => {
    const qty = item.quantity;
    const name = item.name.toUpperCase();
    const priceStr = item.totalPrice 
      ? ` - RWF ${item.totalPrice.toLocaleString()}`
      : item.unitPrice
        ? ` - RWF ${(item.unitPrice * qty).toLocaleString()}`
        : '';

    return `
      <div style="margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 6px;">
        <div style="font-size: 15px; font-weight: 900; line-height: 1.3;">
          ${qty} &times; ${name} ${priceStr}
        </div>
        ${item.notes ? `
          <div style="font-size: 11px; font-weight: 700; margin-top: 2px; padding-left: 6px; color: #444;">
            * Note: ${item.notes.toUpperCase()}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const cleanFilename = `${token.department}_TOKEN_${token.id}`.replace(/[^a-z0-9]/gi, '_');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${deptTitle} - ${token.id}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          @media print {
            .no-print { display: none !important; }
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          * {
            box-sizing: border-box;
          }
          html, body {
            width: 80mm;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
            font-size: 13px;
            line-height: 1.3;
            font-weight: 700;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ticket-body {
            width: 76mm;
            margin: 0 auto;
            padding: 2mm 1mm 2mm 1mm;
          }
          .text-center { text-align: center; }
          .font-black { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
          .border-double {
            border-top: 3px double #000000;
            border-bottom: 3px double #000000;
            padding: 6px 0;
            margin: 6px 0;
          }
          .border-dashed {
            border-top: 2px dashed #000000;
            margin: 8px 0;
          }
          .meta-row {
            font-size: 13px;
            font-weight: 900;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .highlight-title {
            font-size: 16px;
            font-weight: 900;
          }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      </head>
      <body>
        <!-- Top Toolbar for Chrome / AI Studio / New Tab Navigation -->
        <div class="no-print" style="position: sticky; top: 0; left: 0; right: 0; background: #0f172a; color: #ffffff; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 99999; font-family: sans-serif; border-bottom: 2px solid ${badgeColor}; margin-bottom: 8px;">
          <div style="font-weight: bold; font-size: 11px; color: #f59e0b; display: flex; align-items: center; gap: 4px;">
            <span>${deptIcon}</span>
            <span>TOKEN: ${token.id}</span>
          </div>
          <div style="display: flex; gap: 4px;">
            <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer;">
              🖨️ Print
            </button>
            <button onclick="downloadAsPDF()" style="background: #10b981; color: #ffffff; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer;">
              📥 PDF
            </button>
            <button onclick="window.close()" style="background: #334155; color: #cbd5e1; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; cursor: pointer;">
              ✕
            </button>
          </div>
        </div>

        <div id="service-token-printable-area" class="ticket-body">
          
          <!-- Double Header Box -->
          <div class="border-double text-center">
            <div class="font-black uppercase" style="font-size: 15px;">
              SEVEN TO SEVEN
            </div>
            <div class="font-bold uppercase" style="font-size: 11px;">
              Sky View Resort
            </div>
            <div class="font-black uppercase" style="font-size: 15px; margin-top: 3px;">
              ${deptTitle}
            </div>
            <div class="font-bold uppercase" style="font-size: 10px; margin-top: 1px;">
              ${deptSub} ${ticketType !== 'NEW ORDER' ? `(${ticketType})` : ''}
            </div>
          </div>

          <!-- Token Number Banner -->
          <div style="background: #000; color: #fff; text-align: center; padding: 4px; font-size: 16px; font-weight: 900; letter-spacing: 1px; margin: 6px 0;">
            TOKEN NO: ${token.id}
          </div>

          <!-- Metadata -->
          <div style="margin: 8px 0;">
            <div class="meta-row highlight-title">
              LOCATION : ${locationVal}
            </div>
            <div class="meta-row">
              GUEST : ${customerVal}
            </div>
            <div class="meta-row">
              STAFF : ${staffVal}
            </div>
            <div class="meta-row">
              DATE : ${dateFormatted} | ${timeFormatted}
            </div>
            ${token.paymentStatus ? `
              <div class="meta-row">
                PAYMENT : ${token.paymentStatus.toUpperCase()} ${token.paymentMethod ? `(${token.paymentMethod.toUpperCase()})` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Separator Line -->
          <div class="border-dashed"></div>

          <!-- Order Items List -->
          <div style="margin: 8px 0;">
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; text-decoration: underline;">
              SERVICES / ITEMS ORDERED:
            </div>
            ${itemsHtml}
          </div>

          ${token.specialNotes ? `
            <div style="border: 2px solid #000000; padding: 5px; margin: 8px 0; font-size: 12px; font-weight: 900;">
              NOTES / INSTRUCTIONS:
              <div style="font-size: 13px; text-transform: uppercase; margin-top: 2px;">
                ${token.specialNotes}
              </div>
            </div>
          ` : ''}

          <!-- Department Specific Rules & Instructions -->
          ${rulesBoxHtml}

          <!-- Bottom Separators & Resort Greeting -->
          <div class="border-dashed"></div>
          <div class="text-center" style="font-size: 11px; font-weight: 900; margin-top: 4px;">
            MURAKOZE CHANE! / THANK YOU!
          </div>
          <div style="border-top: 3px double #000000; margin-top: 6px;"></div>
        </div>

        <script>
          function downloadAsPDF() {
            const element = document.getElementById('service-token-printable-area');
            const noPrints = document.querySelectorAll('.no-print');
            noPrints.forEach(el => el.style.display = 'none');

            const opt = {
              margin:       [2, 2, 2, 2],
              filename:     '${cleanFilename}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, logging: false },
              jsPDF:        { unit: 'mm', format: [80, 200], orientation: 'portrait' }
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
}

/**
 * Print Kitchen Order Ticket (KOT)
 */
export function printKotThermalTicket(
  ticket: KitchenTicket,
  ticketType: string = 'NEW ORDER'
) {
  printServiceTokenTicket({
    id: ticket.id,
    orderId: ticket.orderId,
    department: 'Kitchen',
    tableNumber: ticket.tableNumber,
    waiterName: ticket.waiterName,
    customerName: ticket.customerName,
    orderTime: ticket.orderTime,
    ticketType: ticket.ticketType || ticketType,
    specialNotes: ticket.specialNotes,
    items: ticket.items
  }, ticketType);
}

/**
 * Print Swimming Pool / Piscine Pass Token
 */
export function printPoolTokenTicket(
  tokenData: Partial<ServiceTokenData> & { items: ServiceTokenData['items'] },
  ticketType: string = 'SWIMMING POOL PASS'
) {
  printServiceTokenTicket({
    id: tokenData.id || `POOL-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId: tokenData.orderId,
    department: 'Pool',
    tableNumber: tokenData.tableNumber || tokenData.roomNumber || 'Poolside',
    waiterName: tokenData.waiterName,
    cashierName: tokenData.cashierName,
    customerName: tokenData.customerName,
    orderTime: tokenData.orderTime || new Date().toISOString(),
    paymentStatus: tokenData.paymentStatus || 'PAID',
    paymentMethod: tokenData.paymentMethod,
    specialNotes: tokenData.specialNotes,
    items: tokenData.items
  }, ticketType);
}

/**
 * Print Sauna & Spa Pass Token
 */
export function printSaunaTokenTicket(
  tokenData: Partial<ServiceTokenData> & { items: ServiceTokenData['items'] },
  ticketType: string = 'SAUNA & SPA PASS'
) {
  printServiceTokenTicket({
    id: tokenData.id || `SAUNA-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId: tokenData.orderId,
    department: 'Sauna',
    tableNumber: tokenData.tableNumber || tokenData.roomNumber || 'Sauna Desk',
    waiterName: tokenData.waiterName,
    cashierName: tokenData.cashierName,
    customerName: tokenData.customerName,
    orderTime: tokenData.orderTime || new Date().toISOString(),
    paymentStatus: tokenData.paymentStatus || 'PAID',
    paymentMethod: tokenData.paymentMethod,
    specialNotes: tokenData.specialNotes,
    items: tokenData.items
  }, ticketType);
}

/**
 * Print Room / Accommodation Service Voucher
 */
export function printRoomTokenTicket(
  tokenData: Partial<ServiceTokenData> & { items: ServiceTokenData['items'] },
  ticketType: string = 'ROOM VOUCHER'
) {
  printServiceTokenTicket({
    id: tokenData.id || `ROOM-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId: tokenData.orderId,
    department: 'Room',
    roomNumber: tokenData.roomNumber || tokenData.tableNumber || 'Reception',
    waiterName: tokenData.waiterName,
    cashierName: tokenData.cashierName,
    customerName: tokenData.customerName,
    orderTime: tokenData.orderTime || new Date().toISOString(),
    paymentStatus: tokenData.paymentStatus || 'PAID',
    paymentMethod: tokenData.paymentMethod,
    specialNotes: tokenData.specialNotes,
    items: tokenData.items
  }, ticketType);
}

/**
 * Automatically inspects an order and prints service tokens for each service department
 * (Kitchen, Swimming Pool, Sauna & Spa, Room Services)
 */
export function printAllOrderServiceTokens(order: Order, ticketType: string = 'NEW ORDER') {
  // 1. Kitchen items
  const foodItems = order.items.filter(i => i.isFood || i.category === 'Food');
  if (foodItems.length > 0) {
    printKotThermalTicket({
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
      orderTime: order.createdAt,
      status: 'Pending'
    }, ticketType);
  }

  // 2. Pool items
  const poolItems = order.items.filter(i => i.category === 'Pool Services');
  if (poolItems.length > 0) {
    printPoolTokenTicket({
      orderId: order.id,
      tableNumber: order.tableNumber,
      waiterName: order.waiterName,
      cashierName: order.cashierName,
      customerName: order.customerName,
      orderTime: order.createdAt,
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
    });
  }

  // 3. Sauna items
  const saunaItems = order.items.filter(i => i.category === 'Sauna Services');
  if (saunaItems.length > 0) {
    printSaunaTokenTicket({
      orderId: order.id,
      tableNumber: order.tableNumber,
      waiterName: order.waiterName,
      cashierName: order.cashierName,
      customerName: order.customerName,
      orderTime: order.createdAt,
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
    });
  }

  // 4. Room items
  const roomItems = order.items.filter(i => i.category === 'Room Services' || i.category === 'Apartment Services');
  if (roomItems.length > 0) {
    printRoomTokenTicket({
      orderId: order.id,
      roomNumber: order.tableNumber,
      waiterName: order.waiterName,
      cashierName: order.cashierName,
      customerName: order.customerName,
      orderTime: order.createdAt,
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
    });
  }
}
