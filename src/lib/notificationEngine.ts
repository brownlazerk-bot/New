import { 
  NotificationCategory, 
  NotificationChannel, 
  NotificationItem, 
  Order, 
  KitchenIngredient, 
  Shift, 
  ApprovalRequest 
} from '../types';
import { 
  addNotificationItem, 
  loadNotificationRules, 
  loadWhatsAppRecipients 
} from './storage';
import { sendWhatsAppMessage } from './whatsappService';

export function triggerSystemNotification(
  category: NotificationCategory,
  title: string,
  message: string,
  priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium',
  channels: NotificationChannel[] = ['WhatsApp', 'In-App'],
  recipientPhone?: string,
  recipientName?: string,
  metadata?: Record<string, any>
): NotificationItem {
  
  // 1. Save in-app notification item
  const item = addNotificationItem({
    title,
    message,
    category,
    channels,
    recipientName,
    recipientPhone,
    status: 'Unread',
    deliveryStatus: 'Sent',
    priority,
    metadata
  });

  // 2. Dispatch to WhatsApp if enabled
  if (channels.includes('WhatsApp')) {
    const recipients = loadWhatsAppRecipients();
    const targetPhone = recipientPhone || recipients.find(r => r.active)?.phoneNumber;
    if (targetPhone) {
      sendWhatsAppMessage(targetPhone, `🏨 SKY VIEW RESORT\n${title}\n\n${message}`);
    }
  }

  return item;
}

// ===============================================
// PRE-BUILT REAL-TIME EVENT HOOKS
// ===============================================

export function notifySaleCompleted(order: Order, cashierName: string): void {
  const amount = order.total || 0;
  const isLargeSale = amount >= 500000;
  
  const title = isLargeSale ? '🎉 High-Value Sale Completed' : '✅ New Sale Completed';
  const priority = isLargeSale ? 'High' : 'Medium';

  const orderTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString();

  const message = `Invoice: ${order.orderNumber || order.id}\nCashier: ${cashierName}\nAmount: ${amount.toLocaleString()} RWF\nPayment: ${order.paymentMethod || 'Cash'}\nTime: ${orderTime}\nTable/Loc: ${order.tableNumber || 'POS Terminal'}`;

  triggerSystemNotification('Sales', title, message, priority, ['WhatsApp', 'In-App'], undefined, undefined, { orderId: order.id, amount });
}

export function notifyLowStock(ingredient: KitchenIngredient): void {
  const isZero = ingredient.stockQuantity <= 0;
  const title = isZero ? `❌ Out of Stock: ${ingredient.name}` : `⚠️ Low Stock Alert: ${ingredient.name}`;
  const priority = isZero ? 'Critical' : 'High';

  const message = `Item: ${ingredient.name}\nCurrent Stock: ${ingredient.stockQuantity} ${ingredient.unit}\nMinimum Required: ${ingredient.minStockAlert} ${ingredient.unit}\nPurchase Recommended: Yes`;

  triggerSystemNotification('Inventory', title, message, priority, ['WhatsApp', 'In-App', 'SMS'], undefined, undefined, { ingredientId: ingredient.id, stock: ingredient.stockQuantity });
}

export function notifyKitchenOrderCreated(tableNo: string, itemCount: number, itemsSummary: string): void {
  const title = '🍽️ New Kitchen Ticket Received';
  const message = `Table: ${tableNo}\nItems: ${itemCount} item(s)\nSummary: ${itemsSummary}\nStatus: Sent to Kitchen Display`;

  triggerSystemNotification('Kitchen', title, message, 'Medium', ['In-App'], undefined, undefined, { tableNo });
}

export function notifyKitchenReady(tableNo: string, orderId: string): void {
  const title = '✅ Kitchen Ready for Service';
  const message = `Order for Table ${tableNo} is ready for pick up and service.`;

  triggerSystemNotification('Kitchen', title, message, 'High', ['In-App'], undefined, undefined, { tableNo, orderId });
}

export function notifyWasteRecorded(ingredientName: string, quantity: number, unit: string, reason: string, cost: number): void {
  const title = '🗑️ Kitchen Waste Recorded';
  const message = `Ingredient: ${ingredientName}\nQuantity: ${quantity} ${unit}\nReason: ${reason}\nCost: ${cost.toLocaleString()} RWF`;

  triggerSystemNotification('Kitchen', title, message, 'High', ['WhatsApp', 'In-App'], undefined, undefined, { ingredientName, cost });
}

export function notifyShiftClosedWithVariance(shift: Shift, expectedCash: number, actualCash: number, diff: number): void {
  const hasShortage = diff < 0;
  const title = hasShortage ? '⚠️ Cashier Shift Cash Shortage Alert' : '📊 Cashier Shift Closed';
  const priority = hasShortage ? 'Critical' : 'Medium';

  const startBal = shift.openingCash || 0;
  const cName = shift.cashierName || 'Cashier';

  const message = `Cashier: ${cName}\nShift ID: ${shift.id}\nOpening Cash: ${startBal.toLocaleString()} RWF\nExpected Cash: ${expectedCash.toLocaleString()} RWF\nActual Cash: ${actualCash.toLocaleString()} RWF\nDifference: ${diff.toLocaleString()} RWF`;

  triggerSystemNotification('Cashier', title, message, priority, ['WhatsApp', 'In-App'], undefined, undefined, { shiftId: shift.id, diff });
}

export function notifyApprovalRequestCreated(apprReq: ApprovalRequest): void {
  const title = `🔔 Pending Approval: ${apprReq.module}`;
  const message = `Reference: ${apprReq.referenceNo}\nTitle: ${apprReq.title}\nRequested By: ${apprReq.requestedBy}\nAmount: ${apprReq.amount ? `${apprReq.amount.toLocaleString()} RWF` : 'N/A'}\nReason: ${apprReq.reason}`;

  triggerSystemNotification('Security', title, message, 'Critical', ['WhatsApp', 'In-App'], undefined, undefined, { referenceNo: apprReq.referenceNo, id: apprReq.id });
}
