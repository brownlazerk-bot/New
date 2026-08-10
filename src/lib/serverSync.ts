/**
 * Central Hotel Server Sync Client
 * Connects any client device (HP laptop, Dell, Mobile Phone, Tablet) to the Express backend server
 * ensuring all hotel data (menu items, orders, tables, shifts, users, stock logs, reports) is 
 * 100% synchronized across all logged-in devices in real-time.
 */

import { notifyDataChange } from './syncEngine';

const API_BASE = '/api/sync';

// Track recent local writes to prevent race condition overwrites
const lastLocalWriteTimestamps: Record<string, number> = {};

export function recordLocalWrite(serverKey: string): void {
  lastLocalWriteTimestamps[serverKey] = Date.now();
}

/**
 * Smartly merges local and incoming arrays by item ID to guarantee no newly created local records are lost.
 */
export function mergeArraysByKey(localData: any, incomingData: any): any {
  if (Array.isArray(localData) && Array.isArray(incomingData)) {
    if (localData.length === 0) return incomingData;
    if (incomingData.length === 0) return localData;

    const hasId = localData.some(i => i && typeof i === 'object' && i.id);
    if (!hasId) return incomingData;

    const map = new Map<string, any>();

    // Add incoming remote items first
    incomingData.forEach((item: any) => {
      if (item && typeof item === 'object' && item.id) {
        map.set(item.id, item);
      }
    });

    // Add or merge local items
    localData.forEach((item: any) => {
      if (item && typeof item === 'object' && item.id) {
        const existing = map.get(item.id);
        if (!existing) {
          // Local item exists that remote doesn't have yet -> keep it!
          map.set(item.id, item);
        } else {
          // Special protection for Order objects: NEVER downgrade a PAID order to UNPAID
          const isLocalOrderPaid = item.paymentStatus === 'PAID' || item.status === 'Paid';
          const isRemoteOrderPaid = existing.paymentStatus === 'PAID' || existing.status === 'Paid';

          if (isLocalOrderPaid && !isRemoteOrderPaid) {
            // Local is paid, remote is unpaid -> keep local paid order
            map.set(item.id, { ...existing, ...item, paymentStatus: item.paymentStatus, status: item.status, amountPaid: item.amountPaid, paidAt: item.paidAt });
            return;
          } else if (!isLocalOrderPaid && isRemoteOrderPaid) {
            // Remote is paid, local is unpaid -> keep remote paid order
            map.set(item.id, { ...item, ...existing, paymentStatus: existing.paymentStatus, status: existing.status, amountPaid: existing.amountPaid, paidAt: existing.paidAt });
            return;
          }

          // Compare timestamps if available
          const localTime = new Date(item.updatedAt || item.paidAt || item.lastRestocked || item.createdAt || 0).getTime();
          const existingTime = new Date(existing.updatedAt || existing.paidAt || existing.lastRestocked || existing.createdAt || 0).getTime();
          
          if (localTime >= existingTime) {
            map.set(item.id, { ...existing, ...item });
          } else {
            map.set(item.id, { ...item, ...existing });
          }
        }
      }
    });

    return Array.from(map.values());
  }
  return incomingData;
}

// Entity keys mapping to backend store
export const ENTITY_KEYS = {
  MENU_ITEMS: 'menuItems',
  TABLES: 'tables',
  WAITERS: 'waiters',
  ORDERS: 'orders',
  KITCHEN_TICKETS: 'kitchenTickets',
  STOCK_LOGS: 'stockLogs',
  SHIFTS: 'shifts',
  CURRENT_SHIFT: 'currentShift',
  GUEST_ROOMS: 'guestRooms',
  USERS: 'users',
  AUDIT_LOGS: 'auditLogs',
  EXPENSES: 'expenses',
  CASH_MOVEMENTS: 'cashMovements',
  DAILY_CLOSINGS: 'dailyClosings',
  PURCHASE_ORDERS: 'purchaseOrders',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  STOCK_MOVEMENTS: 'stockMovements',
  WASTE_RECORDS: 'wasteRecords',
  CATEGORIES: 'categories',
  INVENTORY_ITEMS: 'inventoryItems',
  BUSINESSES: 'businesses'
};

const LOCAL_KEY_MAP: Record<string, string> = {
  menuItems: 'hotel_menu_items_prod',
  tables: 'hotel_tables_prod',
  waiters: 'hotel_waiters_prod',
  orders: 'hotel_orders_prod',
  kitchenTickets: 'hotel_kitchen_tickets_prod',
  stockLogs: 'hotel_stock_logs_prod',
  shifts: 'hotel_shifts_prod',
  currentShift: 'hotel_current_shift_prod',
  guestRooms: 'hotel_guest_rooms_prod',
  users: 'hotel_users_prod',
  auditLogs: 'hotel_audit_logs_prod',
  expenses: 'hotel_expenses_prod',
  cashMovements: 'hotel_cash_movements_prod',
  dailyClosings: 'hotel_daily_closings_prod',
  purchaseOrders: 'hotel_purchase_orders_prod',
  ingredients: 'hotel_kitchen_ingredients_prod',
  recipes: 'hotel_recipes_prod',
  stockMovements: 'hotel_stock_movement_records_prod',
  wasteRecords: 'hotel_kitchen_waste_records_prod',
  categories: 'hotel_categories_prod',
  inventoryItems: 'hotel_inventory_items_prod',
  businesses: 'hotel_businesses_prod'
};

let isSyncing = false;

/**
 * Pulls all synchronized hotel database state from central server and updates localStorage.
 */
export async function pullServerState(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  try {
    const res = await fetch(`${API_BASE}/all`);
    if (!res.ok) throw new Error('Failed to reach sync server');
    
    const { success, data } = await res.json();
    if (success && data) {
      let hasChanges = false;

      Object.entries(LOCAL_KEY_MAP).forEach(([serverKey, localKey]) => {
        const incoming = data[serverKey];
        if (incoming !== undefined) {
          const rawLocal = localStorage.getItem(localKey);
          let localData: any = null;
          try {
            if (rawLocal) localData = JSON.parse(rawLocal);
          } catch (e) {}

          const lastWrite = lastLocalWriteTimestamps[serverKey] || 0;
          const isRecentLocalWrite = (Date.now() - lastWrite) < 10000;

          if (Array.isArray(incoming)) {
            // Prevent wiping out local data or initial seed data when server array is empty
            const isLocalEmpty = !localData || !Array.isArray(localData) || localData.length === 0;
            if (incoming.length === 0 && isLocalEmpty) {
              // Skip overwriting localStorage with "[]" when both are empty
              return;
            }

            const currentLocalArray = Array.isArray(localData) ? localData : [];
            const merged = mergeArraysByKey(currentLocalArray, incoming);
            const mergedStr = JSON.stringify(merged);
            const currentStr = JSON.stringify(currentLocalArray);
            const incomingStr = JSON.stringify(incoming);

            if (mergedStr !== currentStr && merged.length > 0) {
              localStorage.setItem(localKey, mergedStr);
              hasChanges = true;
            }

            // If local had items that remote was missing, push merged list back to server!
            if (merged.length > incoming.length || (isRecentLocalWrite && mergedStr !== incomingStr)) {
              pushKeyToServer(serverKey, merged);
            }
          } else {
            const incomingStr = JSON.stringify(incoming);
            if (incomingStr !== rawLocal && !isRecentLocalWrite && incomingStr !== '[]' && incomingStr !== 'null') {
              localStorage.setItem(localKey, incomingStr);
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        notifyDataChange('all');
      }
      return true;
    }
  } catch (err) {
    console.warn('[Server Sync] Fetch server state warning:', err);
  } finally {
    isSyncing = false;
  }
  return false;
}

/**
 * Push a single entity key update to the central Express server.
 */
export async function pushKeyToServer(entityKey: string, value: any): Promise<void> {
  recordLocalWrite(entityKey);
  try {
    await fetch(`${API_BASE}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: entityKey, value })
    });
  } catch (err) {
    console.warn(`[Server Sync] Push error for key ${entityKey}:`, err);
  }
}

/**
 * Pushes full local snapshot to central server (used on initial seed or bulk save).
 */
export async function pushFullStateToServer(fullState: Record<string, any>): Promise<void> {
  try {
    await fetch(`${API_BASE}/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullState)
    });
  } catch (err) {
    console.warn('[Server Sync] Push full state error:', err);
  }
}

/**
 * Initializes automatic background polling every 3 seconds to keep device 100% in sync with server.
 */
export function startServerSyncPolling(intervalMs: number = 3000): () => void {
  // First immediate pull
  pullServerState();

  const timer = setInterval(() => {
    pullServerState();
  }, intervalMs);

  const handleFocus = () => {
    pullServerState();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  return () => {
    clearInterval(timer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', handleFocus);
    }
  };
}
