export type Category = 
  | 'Beers'
  | 'Soft Drinks'
  | 'Wines'
  | 'Whisky'
  | 'Cocktails'
  | 'Juices'
  | 'Water'
  | 'Coffee'
  | 'Tea'
  | 'Food'
  | 'Pool Services'
  | 'Sauna Services'
  | 'Room Services'
  | 'Apartment Services'
  | 'Other Services';

export type ProductSection = 
  | 'Bar Menu' 
  | 'Kitchen Menu' 
  | 'Swimming Pool' 
  | 'Sauna' 
  | 'Room Services' 
  | 'Apartment Services' 
  | 'Other Services';

export type ItemStatus = 'Available' | 'Out of Stock';

export interface AccompanyingDrink {
  id?: string;
  menuItemId?: string; // Optional linked drink MenuItem ID from stock / bar menu
  drinkName: string;   // e.g. "Cold Coca-Cola 300ml", "Heineken Beer", "House Wine Glass"
  quantity: number;    // e.g. 1
  unit?: string;       // e.g. 'Bottle', 'Glass', 'Can', 'Cup', 'Shot'
  extraPrice?: number; // Optional additional price (0 = included/free accompaniment)
  notes?: string;      // e.g., "Served chilled with ice and lemon", "Recommended pairing"
}

export interface RecipeIngredient {
  id?: string;
  recipeId?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number; // Required quantity per 1 portion/serving (e.g. 250 g or 0.25 Kg)
  unit: string; // e.g. 'g', 'Kg', 'ml', 'Litre', 'Piece', 'Bottle', 'Can', 'Pack'
  costPerUnit?: number; // Cost in RWF per unit
  wastePercentage?: number; // e.g. 5 (%)
  yieldPercentage?: number; // e.g. 95 (%)
  preparationNotes?: string;
  optional?: boolean;
  active?: boolean;
}

export interface RecipeVersionRecord {
  version: number;
  updatedAt: string;
  updatedBy: string;
  changeSummary?: string;
  ingredients: RecipeIngredient[];
  accompanyingDrinks?: AccompanyingDrink[];
  instructions?: string;
  yieldServings?: number;
}

export interface Recipe {
  id: string; // e.g. "REC-101"
  businessId?: string;
  code: string; // e.g. "REC-101"
  name: string; // e.g. "Chicken Rice Recipe"
  linkedMenuItemId?: string; // ID of the linked MenuItem
  linkedMenuItemName?: string;
  instructions?: string;
  yieldServings: number; // default 1
  ingredients: RecipeIngredient[];
  accompanyingDrinks?: AccompanyingDrink[];
  status: 'Active' | 'Inactive';
  version: number;
  history?: RecipeVersionRecord[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Business {
  id: string; // e.g. "biz-01"
  name: string; // e.g. "Serene Hotel & Restaurant"
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
}

export type KitchenIngredientCategory = 
  | 'Meat & Poultry' 
  | 'Grains & Rice' 
  | 'Vegetables & Produce' 
  | 'Spices & Oils' 
  | 'Dairy & Eggs' 
  | 'Seafood' 
  | 'Beverage Raw Materials'
  | 'Other Raw Materials';

export interface KitchenIngredient {
  id: string; // e.g. "ing-101"
  businessId?: string;
  code?: string;
  name: string; // e.g. "Chicken Meat", "White Rice", "Cooking Oil", "Tomatoes"
  category: KitchenIngredientCategory;
  stockQuantity: number; // Current stock balance in store
  unit: string; // Default store unit (e.g., 'Kg', 'Litre', 'Piece', 'Box', 'Tray')
  purchaseUnit?: string; // e.g. 'Kg', 'Box', 'Litre'
  recipeUnit?: string; // e.g. 'g', 'ml', 'Piece', 'Bottle'
  conversionRate?: number; // e.g. 1000 (1 Kg = 1000 g), 24 (1 Box = 24 Bottles)
  costPerUnit: number; // e.g. 4500 RWF per Kg/unit
  averageCost?: number; // Average purchase cost
  minStockAlert: number; // Low stock alert threshold
  maxStock?: number; // Maximum stock threshold
  storageLocation?: string; // e.g. "Main Cold Room #1", "Kitchen Dry Store"
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  lastRestocked?: string;
  supplier?: string;
  notes?: string;
}

export type StockMovementType = 
  | 'Purchase' 
  | 'Opening Stock' 
  | 'Kitchen Consumption' 
  | 'Recipe Consumption' 
  | 'Stock Adjustment' 
  | 'Waste' 
  | 'Spoilage' 
  | 'Expired Items' 
  | 'Transfer' 
  | 'Production' 
  | 'Return' 
  | 'Supplier Return' 
  | 'Manual Correction' 
  | 'Inventory Count';

export interface StockMovementRecord {
  id: string; // e.g. "MOV-9001"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  timestamp: string; // ISO string
  ingredientId: string;
  ingredientName: string;
  movementType: StockMovementType;
  quantityIn: number; // 0 if outgoing
  quantityOut: number; // 0 if incoming
  remainingBalance: number;
  unit: string;
  cost: number; // Total value of movement in RWF
  referenceNumber?: string; // e.g., Order ID, KOT ID, PO Number, Waste ID
  recipeId?: string;
  menuItemId?: string;
  menuItemName?: string;
  user: string;
  department: string; // e.g., 'Restaurant POS', 'Bar POS', 'Room Service', 'Kitchen', 'Main Store'
  reason?: string;
  notes?: string;
  shiftId?: string;
  businessDate?: string;
}

export type WasteType = 
  | 'Burnt' 
  | 'Expired' 
  | 'Broken' 
  | 'Spoiled' 
  | 'Cooking Error' 
  | 'Returned Plate' 
  | 'Over Production';

export interface KitchenWasteRecord {
  id: string; // e.g. "WST-1001"
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  ingredientId: string;
  ingredientName: string;
  wasteType: WasteType;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  reportedBy: string; // Chef / Staff name
  approvedBy?: string; // Manager / Chef
  reason: string;
  department: string;
  notes?: string;
  shiftId?: string;
  businessDate?: string;
}

export interface MenuItem {
  id: string;
  businessId?: string;
  code?: string;
  barcode?: string;
  name: string;
  category: Category;
  productSection?: ProductSection;
  foodCategory?: string;
  price: number; // Selling price (RWF)
  costPrice?: number; // Cost price (RWF)
  tax?: number; // Tax percentage e.g. 18
  kitchenDepartment?: string; // e.g. 'Hot Kitchen', 'Grill', 'Pastry', 'Bar'
  stockQuantity: number; // Bar Stock (active selling) or Kitchen Stock
  mainStockQuantity?: number; // Main Beverage Stock (warehouse / store)
  unit: string; // e.g. 'Bottle', 'Glass', 'Serving', 'Ticket', 'Cup', 'Shot', 'Portion', 'Pass', 'Hour', 'Service'
  status: ItemStatus;
  active?: boolean;
  image?: string;
  isFood?: boolean;
  prepTime?: string;
  linkedKitchenItem?: string;
  description?: string;
  minStockAlert?: number;
  hasRecipe?: boolean;
  recipeId?: string; // Foreign key linking to standalone Recipe
  recipe?: RecipeIngredient[];
  accompanyingDrinks?: AccompanyingDrink[];
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning' | 'Out of Service';

export interface Table {
  id: string;
  tableNumber: string; // e.g., "T-01" or "1"
  tableName?: string; // Optional e.g., "VIP Corner Booth"
  tableTag: string; // Unique Table Tag e.g. "TB-001"
  capacity: number;
  location?: string; // Indoor, Outdoor, VIP, Poolside, Terrace, Garden, Bar, etc.
  qrCode?: string; // Optional QR code value or URL
  description?: string;
  status: TableStatus;
  active?: boolean; // Active / Deactivated
  currentOrderId?: string;
  assignedWaiterId?: string;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  createdBy?: string;
  updatedBy?: string;
}

export interface Waiter {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  shift: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  active: boolean;
}

export type KitchenTicketStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served';

export interface KitchenTicket {
  id: string; // e.g., "KOT-1001"
  orderId: string;
  tableNumber: string;
  waiterName: string;
  customerName?: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    notes?: string;
    category?: string;
  }[];
  orderTime: string; // ISO string
  status: KitchenTicketStatus;
  shiftId?: string;
  businessDate?: string;
  specialNotes?: string;
  orderType?: string;
  ticketType?: 'NEW ORDER' | 'UPDATED ORDER' | 'CANCELLED ITEM';
  createdAt?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  category: Category;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  isFood?: boolean;
  notes?: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Mobile Money' | 'Room Charge' | 'Apartment Charge' | 'Credit' | 'Mixed';

export type OrderStatus = 
  | 'Pending' 
  | 'Preparing' 
  | 'Ready' 
  | 'Served' 
  | 'Waiting for Payment' 
  | 'Partially Paid' 
  | 'Paid' 
  | 'Credit' 
  | 'Cancelled';

export type PaymentStatus = 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'CREDIT';

export interface GuestRoom {
  id: string;
  type: 'Room' | 'Apartment';
  number: string; // e.g. "Room 104" or "Apt B2"
  guestName: string;
  checkInDate: string;
  status: 'Occupied' | 'Vacant';
  balance: number;
}

export interface PaymentTransaction {
  id: string;
  timestamp: string;
  amount: number;
  method: PaymentMethod;
  cashierName: string;
  note?: string;
  cashPaid?: number;
  changeGiven?: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  cashPaid?: number;
  cardPaid?: number;
  mobileMoneyPaid?: number;
  roomChargeAmount?: number;
  selectedRoomId?: string;
  roomOrAptNumber?: string;
  guestName?: string;
  guestPhone?: string;
  changeGiven?: number;
  referenceNumber?: string;
}

export interface Order {
  id: string; // e.g., "ORD-8821"
  orderNumber?: string;
  tableId?: string;
  tableNumber?: string;
  waiterId: string;
  waiterName: string;
  customerName?: string;
  customerPhone?: string;
  guestRoomId?: string;
  servicesIncluded: string[]; // e.g., ['Drinks', 'Food', 'Pool', 'Sauna', 'Rooms']
  items: OrderItem[];
  subtotal: number;
  discount: number;
  serviceCharge?: number;
  otherCharges?: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentDetails?: PaymentDetails;
  paymentHistory?: PaymentTransaction[];
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  paidAt?: string; // ISO
  shiftId: string;
  businessDate?: string;
  cashierName: string;
  kotGenerated?: boolean;
  kotId?: string;
}

export interface StockAdjustmentLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'Purchase' | 'Sale' | 'Adjustment' | 'Waste' | 'Damaged' | 'Return' | 'Transfer';
  quantityChange: number; // positive for addition, negative for deduction
  previousStock: number;
  newStock: number;
  sourceLocation?: 'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock' | 'Supplier';
  targetLocation?: 'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock';
  reason?: string;
  timestamp: string;
  actor: string;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  category: Category;
  quantity: number;
  unitCost: number;
  totalCost: number;
  destination: 'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock';
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-1001"
  poNumber: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  supplierName: string;
  department: 'Bar / Beverage' | 'Kitchen';
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Received' | 'Cancelled';
  paymentStatus: 'Paid' | 'Unpaid';
  createdByName: string;
  receivedAt?: string;
  receivedByName?: string;
  notes?: string;
}

export interface ShiftSummary {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  mobileMoneySales: number;
  creditSales: number;
  discountsTotal: number;
  taxesTotal: number;
  serviceChargesTotal: number;
  expensesTotal: number;
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  totalOrdersCount: number;
  cancelledOrdersCount: number;
  voidedOrdersCount: number;
  kitchenOrdersCount: number;
  inventoryConsumptionCost: number;
  estimatedProfit: number;
}

export interface Shift {
  id: string; // e.g. "sh-250"
  shiftNumber: number; // e.g. 250
  businessDate: string; // YYYY-MM-DD or e.g. "10 August 2026"
  cashierName: string; // Compatible with legacy
  cashierId: string;
  openedAt: string; // ISO timestamp
  closedAt?: string; // ISO timestamp
  openedBy: string; // User who opened shift
  openedById?: string;
  closedBy?: string; // User who closed shift
  closedById?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  openingCash: number;
  closingCashExpected?: number;
  closingCashActual?: number;
  difference?: number; // Actual - Expected
  status: 'Open' | 'Closed';
  notes?: string;
  summary?: ShiftSummary;
}

export interface DailyReportData {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  cashierName: string;
  
  // Bar metrics
  totalDrinkSales: number;
  drinksSoldQty: number;
  bestSellingDrinks: { name: string; qty: number; revenue: number }[];
  currentStockValue: number;
  lowStockItemsCount: number;

  // Food metrics
  totalFoodOrders: number;
  foodRevenue: number;

  // Pool metrics
  poolRevenue: number;
  poolVisitorsCount: number;

  // Sauna metrics
  saunaRevenue: number;
  saunaVisitorsCount: number;

  // Hotel charges
  roomRevenue: number;
  apartmentRevenue: number;

  // Total summary
  totalOrders: number;
  paidOrdersCount: number;
  unpaidOrdersCount: number;
  creditOrdersCount: number;
  partialPaymentsTotal: number;
  outstandingBalanceTotal: number;
  totalTransactions: number;
  grossRevenue: number;
  discounts: number;
  netRevenue: number;

  // Payment Breakdown
  cashCollected: number;
  cardCollected: number;
  mobileMoneyCollected: number;
  creditCollected: number;
  outstandingRoomCharges: number;
  
  // Expenses & Cash Ledger additions
  totalExpenses?: number;
  netRevenueAfterExpenses?: number;
}

export type ExpenseDepartment = 'Bar' | 'Kitchen' | 'Pool & Sauna' | 'Rooms' | 'Maintenance' | 'Administration' | 'General';

export interface Expense {
  id: string; // e.g. "EXP-1001"
  expenseNumber: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  department: ExpenseDepartment;
  category: string; // e.g. "Purchased Meat", "Purchased Vegetables", "Purchased Drinks", "Generator Fuel", "Electricity", "Water", "Internet", "Repairs", "Staff Lunch", "Transport", "Cleaning Materials"
  description: string;
  requestedBy: string;
  approvedBy: string;
  amount: number;
  reason: string;
  attachmentName?: string;
  shiftId?: string;
}

export type CashMovementType = 
  | 'Opening Cash' 
  | 'Sales Income' 
  | 'Credit Payment Received' 
  | 'Expense Paid' 
  | 'Refund' 
  | 'Order Cancellation / Refund'
  | 'Closing Cash'
  | 'Manual Adjustment';

export interface CashMovement {
  id: string; // e.g. "CSH-5001"
  timestamp: string; // ISO
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  amount: number; // positive for cash in, negative for cash out
  movementType: CashMovementType;
  reason: string;
  notes?: string;
  user: string;
  shiftId?: string;
  businessDate?: string;
  referenceId?: string; // Order ID, Expense ID, or Shift ID
}

export interface DailyClosingRecord {
  id: string; // e.g. "DCR-1001"
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO
  closedBy: string; // Cashier / Manager
  shiftId: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  mobileMoneySales: number;
  creditSales: number;
  expensesTotal: number;
  creditCollectedTotal: number;
  outstandingCredit: number;
  cashDeposited: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  differenceReason?: string;
  approvedBy: string;
  varianceStatus: 'Approved' | 'Pending Review' | 'Rejected';
}

export interface CreditReportItem {
  id: string;
  orderId: string;
  receiptNumber: string;
  customerName: string;
  customerPhone: string;
  transactionDate: string; // ISO or YYYY-MM-DD
  dueDate?: string;
  totalBill: number;
  amountPaid: number;
  outstandingBalance: number;
  status: 'Outstanding' | 'Partially Paid' | 'Fully Paid';
  waiterName?: string;
  cashierName?: string;
  department?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  paymentHistory?: PaymentTransaction[];
}

export type SystemRole = 
  | 'Super Admin'
  | 'Admin'
  | 'Manager'
  | 'Cashier'
  | 'Kitchen'
  | 'Storekeeper'
  | 'Receptionist'
  | 'Accountant'
  | 'Housekeeping'
  | 'Waiter';

export type UserRole = SystemRole;

export interface AppUser {
  id: string;
  businessId?: string;
  fullName: string;
  email: string;
  phone: string;
  role: SystemRole;
  status: 'Active' | 'Inactive' | 'Suspended';
  passwordHash: string;
  pinCode?: string; // 4-digit quick PIN for POS terminal login
  createdAt: string;
  lastLoginAt?: string;
  isSuperAdmin?: boolean; // Hidden internal system marker
}

export type User = AppUser;

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  action: string;
  category: 'Auth' | 'User Management' | 'Inventory' | 'Sales' | 'System' | 'Reports' | 'Tables' | 'Approvals' | 'WhatsApp' | 'Notifications';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// ==========================================
// WHATSAPP & REPORT AUTOMATION TYPES
// ==========================================

export interface WhatsAppSettings {
  apiUrl: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  enabled: boolean;
  connected: boolean;
  lastVerifiedAt?: string;
  defaultSenderNumber?: string;
}

export interface WhatsAppRecipient {
  id: string;
  fullName: string;
  phoneNumber: string; // e.g., +25078XXXXXXX
  position: string; // e.g., Owner, Manager, Accountant, Kitchen Head
  department: string; // e.g., Management, Finance, Kitchen, Bar, Housekeeping
  active: boolean;
  notes?: string;
  createdAt: string;
}

export type ReportType =
  | 'Daily Sales Report'
  | 'Kitchen Sales Report'
  | 'Kitchen Inventory Report'
  | 'Kitchen Consumption Report'
  | 'Bar Sales Report'
  | 'Pool Sales Report'
  | 'Cashier Closing Report'
  | 'Shift Report'
  | 'Profit & Loss Report'
  | 'Stock Movement Report'
  | 'Low Stock Report'
  | 'Purchase Report'
  | 'Expense Report'
  | 'Audit Log Report'
  | 'Employee Attendance Report'
  | 'Reservation Report'
  | 'Customer Report';

export type DeliveryMethod = 'WhatsApp' | 'Email' | 'SMS';

export type ScheduleFrequency =
  | 'Immediately'
  | 'Every Hour'
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Yearly'
  | 'Custom Cron Schedule';

export type ReportFormat = 'PDF' | 'Excel' | 'CSV' | 'Image' | 'Summary Text';

export interface ReportDeliveryRule {
  id: string;
  ruleName: string;
  reportType: ReportType;
  deliveryMethods: DeliveryMethod[];
  recipientIds: string[]; // List of WhatsAppRecipient IDs
  schedule: ScheduleFrequency;
  time: string; // HH:mm format, e.g. "23:00"
  daysOfWeek?: number[]; // [1..7] for Weekly
  dayOfMonth?: number; // 1..31 for Monthly
  customCron?: string;
  format: ReportFormat;
  customTemplate?: string;
  status: 'Active' | 'Inactive';
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export interface ReportDeliveryHistory {
  id: string;
  ruleId?: string;
  reportName: string;
  recipientName: string;
  whatsappNumber: string;
  deliveryMethod: DeliveryMethod;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: 'Delivered' | 'Failed' | 'Pending';
  retryCount: number;
  errorMessage?: string;
  attachmentName?: string;
  format: ReportFormat;
  messagePreview?: string;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  templateText: string;
  availableVariables: string[];
  updatedAt: string;
}

// ==========================================
// REAL-TIME NOTIFICATION CENTER TYPES
// ==========================================

export type NotificationChannel = 'WhatsApp' | 'Email' | 'SMS' | 'In-App' | 'Push';

export type NotificationCategory =
  | 'Sales'
  | 'Purchases'
  | 'Kitchen'
  | 'Inventory'
  | 'Hotel'
  | 'Bar'
  | 'Pool & Sauna'
  | 'Cashier'
  | 'Accounting'
  | 'Staff'
  | 'Security'
  | 'Audit Logs'
  | 'Maintenance'
  | 'Reservations'
  | 'Customers'
  | 'Payments';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  recipientName?: string;
  recipientPhone?: string;
  status: 'Unread' | 'Read';
  deliveryStatus: 'Sent' | 'Failed' | 'Queued';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
  retryCount?: number;
  errorDetails?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRule {
  id: string;
  name: string;
  category: NotificationCategory;
  conditionField: string; // e.g. "sale_amount", "stock_level", "expense_amount"
  operator: '>' | '<' | '==' | '>=' | '<=' | 'contains' | 'any_event';
  thresholdValue: string | number;
  channels: NotificationChannel[];
  recipientIds: string[];
  enabled: boolean;
  messageTemplate: string;
  createdAt: string;
}

// ==========================================
// APPROVAL WORKFLOW ENGINE TYPES
// ==========================================

export type ApprovalModule =
  | 'Purchases'
  | 'Expenses'
  | 'Inventory Adjustments'
  | 'Recipe Changes'
  | 'Menu Price Changes'
  | 'Discounts'
  | 'Refunds'
  | 'Order Cancellation'
  | 'Payroll'
  | 'Supplier Payments'
  | 'Customer Credit'
  | 'Cash Withdrawals'
  | 'Cash Deposits'
  | 'User Permissions'
  | 'Accounting Journal Entries';

export type ApprovalLevelName = 'Level 1 (Supervisor)' | 'Level 2 (Manager)' | 'Level 3 (Owner)';

export interface ApprovalRule {
  id: string;
  ruleName: string;
  module: ApprovalModule;
  conditionField: string; // e.g., "amount", "discount_percent", "quantity", "price"
  operator: '>' | '<' | '>=' | '<=' | '==' | 'any_change';
  thresholdValue: number | string; // e.g., 1000000
  approvalLevels: ApprovalLevelName[];
  assignedRoles?: SystemRole[];
  assignedUserIds?: string[];
  enabled: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ApprovalLevelStatus {
  level: ApprovalLevelName;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';
  approverId?: string;
  approverName?: string;
  approverRole?: string;
  decisionNotes?: string;
  decidedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  referenceNo: string; // e.g., APR-2026-0042
  module: ApprovalModule;
  title: string;
  requestedBy: string;
  requestedByRole: string;
  requestedById?: string;
  date: string;
  time: string;
  amount?: number;
  reason: string;
  details?: Record<string, any>;
  attachments?: string[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested' | 'Forwarded';
  currentLevelIndex: number;
  levels: ApprovalLevelStatus[];
  history: {
    action: string;
    actor: string;
    actorRole: string;
    timestamp: string;
    notes?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// HR & Salary Payroll Management Types
export interface Employee {
  id: string;
  employeeId: string; // e.g., "EMP-1001"
  fullName: string;
  department: 'Bar' | 'Kitchen' | 'Service / Waiters' | 'Reception' | 'Housekeeping' | 'Accounting' | 'Management' | 'Security' | 'Maintenance';
  role: string;
  phone: string;
  email?: string;
  nationalId?: string;
  joiningDate: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Casual';
  status: 'Active' | 'On Leave' | 'Suspended' | 'Terminated';
  basicSalary: number; // monthly in RWF/local currency
  housingAllowance?: number;
  transportAllowance?: number;
  otherBonus?: number;
  pensionRate?: number; // e.g., 3% RSSB
  taxRate?: number; // e.g., PAYE tax rate %
  otherDeductions?: number;
  bankName?: string;
  bankAccount?: string;
  mobileMoneyNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  amount: number;
  reason: string;
  month: string; // YYYY-MM
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Deducted' | 'Rejected';
  approvedBy?: string;
  paidAt?: string;
}

export interface PayrollRecord {
  id: string;
  payrollPeriod: string; // e.g. "2026-08"
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  overtimePay: number;
  bonus: number;
  grossSalary: number;
  rssbPension: number;
  payeTax: number;
  salaryAdvanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: 'Unpaid' | 'Processing' | 'Paid';
  paymentMethod?: 'Bank Transfer' | 'Mobile Money' | 'Cash';
  paymentReference?: string;
  paidAt?: string;
  processedBy?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  daysWorked: number;
  absentDays: number;
  leaveDays: number;
  overtimeHours: number;
  notes?: string;
}

