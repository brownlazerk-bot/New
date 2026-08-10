import { Order, Employee, SalaryAdvance, NotificationItem } from '../types';
import { 
  loadOrders, saveOrders, 
  loadEmployees, 
  loadSalaryAdvances, saveSalaryAdvances,
  loadNotifications, saveNotifications,
  addAuditLog 
} from './storage';
import { formatCurrency } from './currency';

export type EmployeeChargeReason = 
  | 'Employee Consumption' 
  | 'Unpaid Customer Walkout Loss' 
  | 'Service Guard Liability (Pool/Sauna)' 
  | 'Staff Breakages & Damages' 
  | 'Other';

/**
 * Charge an order or unpaid customer bill balance directly to an employee's salary account.
 * This registers an automatic salary advance/deduction that will be subtracted ("minus to salary")
 * during the monthly payroll run.
 */
export function chargeOrderToEmployee(
  orderId: string,
  employeeId: string,
  reason: EmployeeChargeReason,
  note?: string,
  chargedBy?: string
): { success: boolean; message: string; advance?: SalaryAdvance } {
  const orders = loadOrders();
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    return { success: false, message: 'Order not found in database.' };
  }

  const order = orders[orderIndex];
  const employees = loadEmployees();
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    return { success: false, message: 'Employee not found.' };
  }

  const chargeAmount = order.balance > 0 ? order.balance : Math.max(0, order.total - order.amountPaid);
  if (chargeAmount <= 0) {
    return { success: false, message: 'Order has zero balance to charge.' };
  }

  // Current month YYYY-MM
  const currentMonth = new Date().toISOString().slice(0, 7);

  // 1. Update order record
  const updatedOrder: Order = {
    ...order,
    customerName: `Staff Charge: ${employee.fullName} (${employee.employeeId})`,
    customerPhone: employee.phone,
    paymentStatus: 'CREDIT',
    status: 'Credit',
    paymentMethod: 'Credit',
    paymentDetails: {
      method: 'Credit',
      guestName: employee.fullName,
      guestPhone: employee.phone
    }
  };

  orders[orderIndex] = updatedOrder;
  saveOrders(orders);

  // 2. Create Salary Advance Deduction record
  const advances = loadSalaryAdvances();
  const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).slice(0, 3).join(', ');

  const newAdvance: SalaryAdvance = {
    id: `adv-loss-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    amount: chargeAmount,
    reason: `[${reason}] Order ${order.orderNumber || `#${order.id.slice(-6)}`} - ${itemsSummary}${note ? ` (${note})` : ''}`,
    month: currentMonth,
    requestDate: new Date().toISOString(),
    status: 'Approved',
    approvedBy: chargedBy || 'Manager System',
    paidAt: new Date().toISOString()
  };

  saveSalaryAdvances([newAdvance, ...advances]);

  // 3. Log Audit Trail
  addAuditLog({
    userId: 'system',
    userName: chargedBy || 'Manager System',
    userRole: 'Manager',
    userEmail: '',
    action: 'DISBURSE_SALARY_ADVANCE',
    category: 'Sales',
    details: `Charged order ${order.orderNumber || order.id} (${formatCurrency(chargeAmount)}) to employee ${employee.fullName} as ${reason}.`
  });

  return {
    success: true,
    message: `Successfully charged ${formatCurrency(chargeAmount)} to ${employee.fullName}. Deducted in ${currentMonth} payroll.`,
    advance: newAdvance
  };
}

/**
 * 1st of the Month Automated Payroll & Salary Payment Notification Trigger
 * Checks if today is the 1st of the month (or can be forced) and generates
 * high-priority system notifications for salary disbursement.
 */
export function checkAndTriggerFirstOfMonthPayrollAlert(forceTrigger: boolean = false): void {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM

  // Only trigger automatically if dayOfMonth === 1 or if forceTrigger is true
  if (dayOfMonth !== 1 && !forceTrigger) {
    return;
  }

  const notifications = loadNotifications();
  const notificationTag = `PAYROLL_REMINDER_1ST_${monthKey}`;
  
  // Prevent duplicate notifications for the same month unless forced
  const existingAlert = notifications.find(n => n.id.includes(notificationTag));
  if (existingAlert && !forceTrigger) {
    return;
  }

  const employees = loadEmployees().filter(e => e.status === 'Active');
  const advances = loadSalaryAdvances().filter(a => a.month === monthKey && a.status === 'Approved');

  const totalBaseSalary = employees.reduce((sum, e) => sum + e.basicSalary, 0);
  const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalNetEst = Math.max(0, totalBaseSalary - totalAdvances);

  const newNotification: NotificationItem = {
    id: `${notificationTag}-${Date.now()}`,
    title: `🗓️ 1st of the Month Payroll Payment Alert (${monthKey})`,
    message: `Salary disbursement is due today for ${employees.length} active staff. Total Base: ${formatCurrency(totalBaseSalary)} | Auto-Deductions (Advances & Loss Charges): -${formatCurrency(totalAdvances)} | Estimated Net Payout: ${formatCurrency(totalNetEst)}. Please process payments in HR & Payroll.`,
    category: 'Payments',
    channels: ['In-App'],
    status: 'Unread',
    deliveryStatus: 'Sent',
    priority: 'Critical',
    createdAt: new Date().toISOString()
  };

  saveNotifications([newNotification, ...notifications]);
}
