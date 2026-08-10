import { MenuItem, Order, StockAdjustmentLog } from '../types';

export interface ItemStockMovement {
  itemId: string;
  itemName: string;
  category: string;
  productSection?: string;
  unit: string;
  price: number;
  openingStock: number;       // Ububiko bwa Mbere (Opening Stock before target date)
  receivedStock: number;      // Ibyinjiye / Purchases (Stock In on target date)
  adjustmentsIn: number;      // Stock Adjustments (+)
  soldStock: number;          // Ibyasohotse / Sales (Dispatched on target date, paid + pending)
  paidQty: number;            // Paid dispatched qty
  pendingQty: number;         // Pending dispatched qty in open tables
  adjustmentsOut: number;     // Stock Adjustments (-) / Waste / Damaged
  adjustments: number;        // Net adjustments (adjustmentsIn - adjustmentsOut)
  closingStock: number;       // Ububiko Busigaye (Closing stock at end of target date)
  currentStock: number;       // Live stock quantity right now
  dispatchedValue: number;    // Sales total value (soldStock * price)
}

/**
 * Calculates accurate stock movements (Opening Stock, Stock In, Stock Out, Adjustments, Closing Stock)
 * for any given date string (YYYY-MM-DD) using standard ledger formula:
 * Closing Stock = Opening Stock + Received (Stock In) - Sold (Stock Out) ± Adjustments
 */
export function calculateStockMovementsForDate(
  menuItems: MenuItem[],
  stockLogs: StockAdjustmentLog[],
  orders: Order[],
  targetDateStr: string // "YYYY-MM-DD"
): ItemStockMovement[] {
  // Parse target date boundaries in local time
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const targetDayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  const targetDayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

  return menuItems.map(item => {
    let salesAfter = 0;
    let stockInAfter = 0;
    let stockOutAfter = 0;

    let salesOnDate = 0;
    let paidQtyOnDate = 0;
    let pendingQtyOnDate = 0;

    let purchasesOnDate = 0;
    let returnsOnDate = 0;
    let adjustmentsInOnDate = 0;

    let wasteOnDate = 0;
    let damagedOnDate = 0;
    let adjustmentsOutOnDate = 0;

    // 1. Calculate Order Dispatches (Sales / Dispatched Items)
    orders.forEach(order => {
      if (order.status === 'Cancelled') return;
      if (!order.createdAt) return;

      const orderTime = new Date(order.createdAt).getTime();
      const isPaid = order.paymentStatus === 'PAID' || order.status === 'Paid';

      order.items.forEach(orderItem => {
        if (orderItem.itemId === item.id || (orderItem.name && item.name && orderItem.name.toLowerCase() === item.name.toLowerCase())) {
          const qty = orderItem.quantity || 0;

          if (orderTime > targetDayEnd) {
            salesAfter += qty;
          } else if (orderTime >= targetDayStart && orderTime <= targetDayEnd) {
            salesOnDate += qty;
            if (isPaid) {
              paidQtyOnDate += qty;
            } else {
              pendingQtyOnDate += qty;
            }
          }
        }
      });
    });

    // 2. Calculate Stock Logs (Purchases, Restocks, Waste, Damaged, Adjustments, Returns)
    stockLogs.forEach(log => {
      if (log.itemId === item.id || (log.itemName && item.name && log.itemName.toLowerCase() === item.name.toLowerCase())) {
        if (!log.timestamp) return;
        const logTime = new Date(log.timestamp).getTime();
        const change = log.quantityChange || 0;

        if (logTime > targetDayEnd) {
          if (log.type === 'Purchase' || log.type === 'Return' || (log.type === 'Adjustment' && change > 0)) {
            stockInAfter += Math.abs(change);
          } else if (log.type === 'Waste' || log.type === 'Damaged' || (log.type === 'Adjustment' && change < 0)) {
            stockOutAfter += Math.abs(change);
          }
        } else if (logTime >= targetDayStart && logTime <= targetDayEnd) {
          if (log.type === 'Purchase') {
            purchasesOnDate += Math.abs(change);
          } else if (log.type === 'Return') {
            returnsOnDate += Math.abs(change);
          } else if (log.type === 'Adjustment') {
            if (change > 0) adjustmentsInOnDate += change;
            else adjustmentsOutOnDate += Math.abs(change);
          } else if (log.type === 'Waste') {
            wasteOnDate += Math.abs(change);
          } else if (log.type === 'Damaged') {
            damagedOnDate += Math.abs(change);
          }
        }
      }
    });

    const receivedStock = purchasesOnDate + returnsOnDate;
    const adjustmentsIn = adjustmentsInOnDate;
    const adjustmentsOut = wasteOnDate + damagedOnDate + adjustmentsOutOnDate;
    const adjustments = adjustmentsIn - adjustmentsOut;

    const currentStock = item.stockQuantity || 0;

    // Working backward from current live stock to closing stock at target date end
    const closingStock = currentStock - stockInAfter + salesAfter + stockOutAfter;

    // Opening Stock = Closing Stock - Received (Stock In) + Sold (Stock Out) - Adjustments
    const stockInOnDate = receivedStock + adjustmentsIn;
    const stockOutOnDate = salesOnDate + adjustmentsOut;

    const openingStock = closingStock - stockInOnDate + stockOutOnDate;

    return {
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      unit: item.unit || 'Bottle',
      price: item.price || 0,
      openingStock: Math.max(0, openingStock),
      receivedStock: Math.max(0, receivedStock),
      adjustmentsIn: Math.max(0, adjustmentsIn),
      soldStock: Math.max(0, salesOnDate),
      paidQty: paidQtyOnDate,
      pendingQty: pendingQtyOnDate,
      adjustmentsOut: Math.max(0, adjustmentsOut),
      adjustments,
      closingStock: Math.max(0, closingStock),
      currentStock,
      dispatchedValue: Math.max(0, salesOnDate) * (item.price || 0)
    };
  });
}
