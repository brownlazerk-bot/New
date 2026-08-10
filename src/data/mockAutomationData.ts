import { 
  WhatsAppSettings, 
  WhatsAppRecipient, 
  ReportDeliveryRule, 
  ReportDeliveryHistory, 
  MessageTemplate, 
  NotificationItem, 
  NotificationRule, 
  ApprovalRule, 
  ApprovalRequest 
} from '../types';

export const INITIAL_WHATSAPP_SETTINGS: WhatsAppSettings = {
  apiUrl: 'https://graph.facebook.com/v18.0',
  accessToken: 'EAAG1234567890_MOCK_WHATSAPP_BUSINESS_TOKEN_SKYVIEW',
  phoneNumberId: '109827364512390',
  businessAccountId: '987654321012345',
  webhookVerifyToken: 'sky_view_resort_webhook_2026',
  enabled: true,
  connected: true,
  lastVerifiedAt: new Date().toISOString(),
  defaultSenderNumber: '+250780000000'
};

export const INITIAL_WHATSAPP_RECIPIENTS: WhatsAppRecipient[] = [
  {
    id: 'rec-1',
    fullName: 'System Owner',
    phoneNumber: '+250780000000',
    position: 'Property Owner / Executive',
    department: 'Management',
    active: true,
    notes: 'Receives high-value sales alerts, P&L reports, and Level 3 approvals.',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'rec-2',
    fullName: 'General Manager',
    phoneNumber: '+250790000000',
    position: 'General Manager',
    department: 'Operations',
    active: true,
    notes: 'Receives daily closing reports, shift variances, and Level 2 approvals.',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'rec-3',
    fullName: 'Chief Accountant',
    phoneNumber: '+250720000000',
    position: 'Finance Lead',
    department: 'Finance',
    active: true,
    notes: 'Receives daily sales, expense reports, and cash closing summaries.',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'rec-4',
    fullName: 'Kitchen Manager',
    phoneNumber: '+250730000000',
    position: 'Head Chef & Kitchen Manager',
    department: 'Kitchen',
    active: true,
    notes: 'Receives kitchen sales, inventory alerts, consumption reports, and waste alerts.',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const INITIAL_REPORT_RULES: ReportDeliveryRule[] = [
  {
    id: 'rule-daily-sales',
    ruleName: 'Daily Evening Sales Summary',
    reportType: 'Daily Sales Report',
    deliveryMethods: ['WhatsApp', 'Email'],
    recipientIds: ['rec-1', 'rec-2', 'rec-3'],
    schedule: 'Daily',
    time: '23:00',
    format: 'PDF',
    customTemplate: `🏨 SKY VIEW RESORT
📅 Daily Sales Report
Date: {{date}}
Sales: {{sales}} RWF
Expenses: {{expenses}} RWF
Profit: {{profit}} RWF
Attached is the complete PDF report.`,
    status: 'Active',
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'rule-kitchen-inventory',
    ruleName: 'Kitchen Inventory & Stock Balance',
    reportType: 'Kitchen Inventory Report',
    deliveryMethods: ['WhatsApp'],
    recipientIds: ['rec-2', 'rec-4'],
    schedule: 'Daily',
    time: '21:30',
    format: 'Excel',
    customTemplate: `🏨 SKY VIEW RESORT
🍳 Kitchen Inventory & Stock Report
Date: {{date}}
Low Stock Items: {{low_stock_count}}
Total Inventory Value: {{total_value}} RWF
Please review attached Excel sheet for reorder recommendations.`,
    status: 'Active',
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    nextRun: new Date(Date.now() + 7200000).toISOString(),
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'rule-profit-loss',
    ruleName: 'Weekly Executive P&L Report',
    reportType: 'Profit & Loss Report',
    deliveryMethods: ['WhatsApp', 'Email'],
    recipientIds: ['rec-1', 'rec-3'],
    schedule: 'Weekly',
    time: '20:00',
    daysOfWeek: [7], // Sunday
    format: 'PDF',
    customTemplate: `🏨 SKY VIEW RESORT
📊 Weekly Executive Financial Performance
Period: Week ending {{date}}
Gross Revenue: {{sales}} RWF
Operating Expenses: {{expenses}} RWF
Net Profit: {{profit}} RWF
Full detailed breakdown attached.`,
    status: 'Active',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const INITIAL_REPORT_HISTORY: ReportDeliveryHistory[] = [
  {
    id: 'hist-001',
    ruleId: 'rule-daily-sales',
    reportName: 'Daily Sales Report',
    recipientName: 'System Owner',
    whatsappNumber: '+250780000000',
    deliveryMethod: 'WhatsApp',
    date: '2026-08-05',
    time: '23:00:02',
    status: 'Delivered',
    retryCount: 0,
    attachmentName: 'Daily_Sales_Report_2026-08-05.pdf',
    format: 'PDF',
    messagePreview: '🏨 SKY VIEW RESORT - Daily Sales Report 2026-08-05: Sales 1,850,000 RWF',
    createdAt: '2026-08-05T23:00:02.000Z'
  },
  {
    id: 'hist-002',
    ruleId: 'rule-kitchen-inventory',
    reportName: 'Kitchen Inventory Report',
    recipientName: 'Kitchen Manager',
    whatsappNumber: '+250730000000',
    deliveryMethod: 'WhatsApp',
    date: '2026-08-05',
    time: '21:30:10',
    status: 'Delivered',
    retryCount: 0,
    attachmentName: 'Kitchen_Inventory_2026-08-05.xlsx',
    format: 'Excel',
    messagePreview: '🏨 SKY VIEW RESORT - Kitchen Inventory Report: 3 items below minimum threshold.',
    createdAt: '2026-08-05T21:30:10.000Z'
  }
];

export const INITIAL_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl-sale-completed',
    name: 'Sale Completed Real-Time Template',
    category: 'Sales',
    templateText: `🏨 SKY VIEW RESORT
✅ New Sale Completed

Invoice:
{{invoice_number}}

Cashier:
{{cashier}}

Amount:
{{amount}} RWF

Payment:
{{payment_method}}

Time:
{{time}}

Location:
{{location}}`,
    availableVariables: ['invoice_number', 'cashier', 'amount', 'payment_method', 'time', 'location', 'date'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tmpl-low-stock',
    name: 'Low Stock Alert Template',
    category: 'Inventory',
    templateText: `⚠️ Low Stock Alert

Item:
{{item_name}}

Current Stock:
{{current_stock}} {{unit}}

Minimum Stock:
{{min_stock}} {{unit}}

Purchase Recommended:
{{recommended}}`,
    availableVariables: ['item_name', 'current_stock', 'min_stock', 'unit', 'recommended'],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'tmpl-approval-needed',
    name: 'Approval Request Pending Template',
    category: 'Approvals',
    templateText: `🔔 SKY VIEW RESORT APPROVAL REQUIRED

Reference:
{{reference_no}}

Module:
{{module}}

Requested By:
{{requested_by}}

Amount / Details:
{{details}}

Reason:
{{reason}}

Please open the SKY VIEW ERP App to Approve or Reject.`,
    availableVariables: ['reference_no', 'module', 'requested_by', 'details', 'reason', 'time'],
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'notif-large-sale',
    name: 'Large Sale Alert (> 500,000 RWF)',
    category: 'Sales',
    conditionField: 'sale_amount',
    operator: '>',
    thresholdValue: 500000,
    channels: ['WhatsApp', 'In-App'],
    recipientIds: ['rec-1', 'rec-2', 'rec-3'],
    enabled: true,
    messageTemplate: '🎉 High-Value Transaction Alert! Sale #{{invoice_number}} of {{amount}} RWF completed by {{cashier}}.',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'notif-low-stock',
    name: 'Critical Inventory Low Stock Alert',
    category: 'Inventory',
    conditionField: 'stock_level',
    operator: '<=',
    thresholdValue: 'min_stock',
    channels: ['WhatsApp', 'In-App'],
    recipientIds: ['rec-2', 'rec-4'],
    enabled: true,
    messageTemplate: '⚠️ Low Stock Alert: {{item_name}} stock is down to {{current_stock}} {{unit}} (Min: {{min_stock}} {{unit}}).',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'notif-out-of-stock',
    name: 'Out of Stock Alert',
    category: 'Inventory',
    conditionField: 'stock_level',
    operator: '==',
    thresholdValue: 0,
    channels: ['WhatsApp', 'SMS', 'In-App'],
    recipientIds: ['rec-1', 'rec-2', 'rec-4'],
    enabled: true,
    messageTemplate: '❌ Out of Stock Alert: {{item_name}} is at 0 {{unit}}. Kitchen or Bar sales may be impacted!',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'notif-waste',
    name: 'Kitchen Waste Incident Alert',
    category: 'Kitchen',
    conditionField: 'waste_cost',
    operator: '>',
    thresholdValue: 10000,
    channels: ['WhatsApp', 'In-App'],
    recipientIds: ['rec-1', 'rec-2', 'rec-4'],
    enabled: true,
    messageTemplate: '🗑️ Kitchen Waste Recorded: {{item_name}} ({{quantity}} {{unit}}). Reason: {{reason}}. Cost: {{cost}} RWF.',
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'notif-cash-difference',
    name: 'Cashier Shift Cash Variance Alert',
    category: 'Cashier',
    conditionField: 'cash_difference',
    operator: '<',
    thresholdValue: 0,
    channels: ['WhatsApp', 'In-App'],
    recipientIds: ['rec-1', 'rec-2', 'rec-3'],
    enabled: true,
    messageTemplate: '⚠️ Shift Cash Shortage Alert! Cashier {{cashier}} closed shift with a variance of {{difference}} RWF.',
    createdAt: '2026-01-01T08:00:00.000Z'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-item-001',
    title: 'High-Value Sale Completed',
    message: 'Invoice INV-000458 of 650,000 RWF paid via Mobile Money at Restaurant POS.',
    category: 'Sales',
    channels: ['WhatsApp', 'In-App'],
    recipientName: 'System Owner',
    recipientPhone: '+250780000000',
    status: 'Unread',
    deliveryStatus: 'Sent',
    priority: 'High',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    metadata: { invoice: 'INV-000458', amount: 650000 }
  },
  {
    id: 'notif-item-002',
    title: 'Low Stock Alert: Chicken Meat',
    message: 'Chicken Meat current balance is 3.2 Kg, below minimum required threshold of 10 Kg.',
    category: 'Inventory',
    channels: ['WhatsApp', 'In-App'],
    recipientName: 'Kitchen Manager',
    recipientPhone: '+250730000000',
    status: 'Unread',
    deliveryStatus: 'Sent',
    priority: 'High',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    metadata: { item: 'Chicken Meat', stock: 3.2, min: 10 }
  },
  {
    id: 'notif-item-003',
    title: 'Approval Request Pending',
    message: 'Purchase Order PO-2026-012 for 1,450,000 RWF requires Level 2 & Level 3 approval.',
    category: 'Purchases',
    channels: ['WhatsApp', 'In-App'],
    recipientName: 'General Manager',
    recipientPhone: '+250790000000',
    status: 'Unread',
    deliveryStatus: 'Sent',
    priority: 'Critical',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    metadata: { referenceNo: 'PO-2026-012', amount: 1450000 }
  }
];

export const INITIAL_APPROVAL_RULES: ApprovalRule[] = [
  {
    id: 'rule-appr-purchase',
    ruleName: 'High Purchase Order Authorization (> 1,000,000 RWF)',
    module: 'Purchases',
    conditionField: 'amount',
    operator: '>',
    thresholdValue: 1000000,
    approvalLevels: ['Level 2 (Manager)', 'Level 3 (Owner)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  },
  {
    id: 'rule-appr-expense',
    ruleName: 'Expense Approval Rule (> 200,000 RWF)',
    module: 'Expenses',
    conditionField: 'amount',
    operator: '>',
    thresholdValue: 200000,
    approvalLevels: ['Level 3 (Owner)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  },
  {
    id: 'rule-appr-discount',
    ruleName: 'POS High Discount Authorization (> 20%)',
    module: 'Discounts',
    conditionField: 'discount_percent',
    operator: '>',
    thresholdValue: 20,
    approvalLevels: ['Level 2 (Manager)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  },
  {
    id: 'rule-appr-recipe',
    ruleName: 'Recipe Composition Change Approval',
    module: 'Recipe Changes',
    conditionField: 'recipe_modified',
    operator: 'any_change',
    thresholdValue: 1,
    approvalLevels: ['Level 2 (Manager)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  },
  {
    id: 'rule-appr-price',
    ruleName: 'Menu Item Price Change Authorization',
    module: 'Menu Price Changes',
    conditionField: 'price_changed',
    operator: 'any_change',
    thresholdValue: 1,
    approvalLevels: ['Level 3 (Owner)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  },
  {
    id: 'rule-appr-inventory',
    ruleName: 'Large Inventory Manual Adjustment (> 10 Kg / Units)',
    module: 'Inventory Adjustments',
    conditionField: 'quantity',
    operator: '>',
    thresholdValue: 10,
    approvalLevels: ['Level 2 (Manager)'],
    enabled: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'System Owner'
  }
];

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'apr-req-001',
    referenceNo: 'APR-2026-001',
    module: 'Purchases',
    title: 'Purchase Order #PO-2026-012 for Prime Meat Supplier',
    requestedBy: 'Storekeeper Jean',
    requestedByRole: 'Storekeeper',
    date: '2026-08-06',
    time: '11:15',
    amount: 1450000,
    reason: 'Monthly beef, chicken, and lamb bulk restock for main resort restaurant.',
    details: {
      supplier: 'Kigali Meat & Poultry Distributors',
      itemCount: 4,
      items: 'Chicken Breast 150kg, Beef Fillet 100kg, Lamb Chops 50kg'
    },
    status: 'Pending',
    currentLevelIndex: 0,
    levels: [
      {
        level: 'Level 2 (Manager)',
        status: 'Pending'
      },
      {
        level: 'Level 3 (Owner)',
        status: 'Pending'
      }
    ],
    history: [
      {
        action: 'Request Created',
        actor: 'Storekeeper Jean',
        actorRole: 'Storekeeper',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        notes: 'Submitted PO for bulk kitchen meat inventory.'
      }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'apr-req-002',
    referenceNo: 'APR-2026-002',
    module: 'Expenses',
    title: 'Generator Diesel Fuel Bulk Purchase',
    requestedBy: 'Operations Manager',
    requestedByRole: 'Manager',
    date: '2026-08-06',
    time: '09:30',
    amount: 380000,
    reason: 'Refill 300L diesel fuel tank for standby power generator ahead of weekend events.',
    details: {
      category: 'Utilities & Maintenance',
      vendor: 'SP Petroleum Nyarutarama'
    },
    status: 'Approved',
    currentLevelIndex: 1,
    levels: [
      {
        level: 'Level 3 (Owner)',
        status: 'Approved',
        approverName: 'System Owner',
        approverRole: 'Super Admin',
        decisionNotes: 'Approved. High priority for weekend weddings and conference bookings.',
        decidedAt: new Date(Date.now() - 7200000).toISOString()
      }
    ],
    history: [
      {
        action: 'Request Created',
        actor: 'Operations Manager',
        actorRole: 'Manager',
        timestamp: new Date(Date.now() - 10800000).toISOString()
      },
      {
        action: 'Approved',
        actor: 'System Owner',
        actorRole: 'Super Admin',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        notes: 'Approved fuel budget.'
      }
    ],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  }
];
