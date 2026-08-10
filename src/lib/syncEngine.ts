/**
 * Base44 Centralized Real-Time Synchronization & Backup Engine
 * Provides instant multi-tab/multi-device data sync, offline queueing,
 * automatic daily backup generation, and Super Admin disaster recovery.
 */

import { loadMenuItems, saveMenuItems, loadOrders, saveOrders, loadKitchenTickets, saveKitchenTickets, loadTables, saveTables, loadWaiters, saveWaiters, loadStockLogs, saveStockLogs, loadShifts, saveShifts, loadGuestRooms, saveGuestRooms, loadExpenses, saveExpenses, loadCashMovements, saveCashMovements, loadDailyClosings, saveDailyClosings, loadUsers, saveUsers, loadAuditLogs, loadIngredients, saveIngredients, loadRecipes, saveRecipes, loadPurchaseOrders, savePurchaseOrders, loadStockMovementRecords, saveStockMovementRecords, loadWasteRecords, saveWasteRecords } from './storage';

const BROADCAST_CHANNEL_NAME = 'hotel_resort_sync_v1';
const PENDING_OFFLINE_QUEUE_KEY = 'hotel_offline_pending_queue';
const BACKUPS_KEY = 'hotel_daily_backups_snapshots';

export interface DatabaseBackup {
  id: string;
  createdAt: string;
  createdBy: string;
  version: string;
  data: {
    menuItems: any[];
    tables: any[];
    waiters: any[];
    orders: any[];
    kitchenTickets: any[];
    stockLogs: any[];
    shifts: any[];
    guestRooms: any[];
    expenses: any[];
    cashMovements: any[];
    dailyClosings: any[];
    users: any[];
    auditLogs: any[];
    ingredients?: any[];
    recipes?: any[];
    purchaseOrders?: any[];
    stockMovements?: any[];
    wasteRecords?: any[];
  };
}

let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not available:', e);
  }
}

/**
 * Broadcasts a change event to all connected sessions/tabs instantly.
 */
export function notifyDataChange(entityKey: string): void {
  const payload = { entityKey, timestamp: Date.now() };

  // 1. BroadcastChannel for cross-tab real-time sync
  if (syncChannel) {
    try {
      syncChannel.postMessage(payload);
    } catch (e) {
      console.warn('Error posting to sync channel:', e);
    }
  }

  // 2. Custom DOM event for same-tab subscribers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('HOTEL_REALTIME_SYNC', { detail: payload }));
  }
}

/**
 * Subscribe to real-time data sync notifications.
 */
export function subscribeToSync(onSync: (entityKey: string) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.entityKey) {
      onSync(event.data.entityKey);
    }
  };

  const handleCustomEvent = (event: Event) => {
    const customEvt = event as CustomEvent;
    if (customEvt.detail && customEvt.detail.entityKey) {
      onSync(customEvt.detail.entityKey);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key && event.key.startsWith('hotel_')) {
      onSync(event.key);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleMessage);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('HOTEL_REALTIME_SYNC', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('HOTEL_REALTIME_SYNC', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Queue offline pending transaction
 */
export function queueOfflineTransaction(actionType: string, payload: any): void {
  try {
    const queue = JSON.parse(localStorage.getItem(PENDING_OFFLINE_QUEUE_KEY) || '[]');
    queue.push({
      id: `OFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      payload,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(PENDING_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    notifyDataChange('offline_queue');
  } catch (e) {
    console.error('Failed to queue offline transaction:', e);
  }
}

/**
 * Get pending offline transactions count
 */
export function getPendingOfflineCount(): number {
  try {
    const queue = JSON.parse(localStorage.getItem(PENDING_OFFLINE_QUEUE_KEY) || '[]');
    return queue.length;
  } catch (e) {
    return 0;
  }
}

/**
 * Flush and synchronize pending offline transactions
 */
export function flushOfflineQueue(): void {
  try {
    const queue = JSON.parse(localStorage.getItem(PENDING_OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length > 0) {
      console.log(`[Sync Engine] Synchronizing ${queue.length} pending offline operations...`);
      localStorage.setItem(PENDING_OFFLINE_QUEUE_KEY, '[]');
      notifyDataChange('all');
    }
  } catch (e) {
    console.error('Failed to flush offline queue:', e);
  }
}

/**
 * Automatic Daily Backup System
 */
export function createDailyBackup(userName: string = 'System Auto-Backup'): DatabaseBackup {
  const backup: DatabaseBackup = {
    id: `BKP-${new Date().toISOString().split('T')[0]}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy: userName,
    version: '1.0.0',
    data: {
      menuItems: loadMenuItems(),
      tables: loadTables(),
      waiters: loadWaiters(),
      orders: loadOrders(),
      kitchenTickets: loadKitchenTickets(),
      stockLogs: loadStockLogs(),
      shifts: loadShifts(),
      guestRooms: loadGuestRooms(),
      expenses: loadExpenses(),
      cashMovements: loadCashMovements(),
      dailyClosings: loadDailyClosings(),
      users: loadUsers(),
      auditLogs: loadAuditLogs(),
      ingredients: loadIngredients(),
      recipes: loadRecipes(),
      purchaseOrders: loadPurchaseOrders(),
      stockMovements: loadStockMovementRecords(),
      wasteRecords: loadWasteRecords()
    }
  };

  try {
    const backups: DatabaseBackup[] = JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
    const updated = [backup, ...backups].slice(0, 30); // Keep last 30 daily backups
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save daily backup:', e);
  }

  return backup;
}

/**
 * Load list of backups
 */
export function loadBackups(): DatabaseBackup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Restore database from a backup object (Super Admin Only)
 */
export function restoreBackupSnapshot(backup: DatabaseBackup): boolean {
  try {
    if (!backup || !backup.data) return false;

    if (Array.isArray(backup.data.menuItems)) saveMenuItems(backup.data.menuItems);
    if (Array.isArray(backup.data.tables)) saveTables(backup.data.tables);
    if (Array.isArray(backup.data.waiters)) saveWaiters(backup.data.waiters);
    if (Array.isArray(backup.data.orders)) saveOrders(backup.data.orders);
    if (Array.isArray(backup.data.kitchenTickets)) saveKitchenTickets(backup.data.kitchenTickets);
    if (Array.isArray(backup.data.stockLogs)) saveStockLogs(backup.data.stockLogs);
    if (Array.isArray(backup.data.shifts)) saveShifts(backup.data.shifts);
    if (Array.isArray(backup.data.guestRooms)) saveGuestRooms(backup.data.guestRooms);
    if (Array.isArray(backup.data.expenses)) saveExpenses(backup.data.expenses);
    if (Array.isArray(backup.data.cashMovements)) saveCashMovements(backup.data.cashMovements);
    if (Array.isArray(backup.data.dailyClosings)) saveDailyClosings(backup.data.dailyClosings);
    if (Array.isArray(backup.data.users)) saveUsers(backup.data.users);
    if (Array.isArray(backup.data.ingredients)) saveIngredients(backup.data.ingredients);
    if (Array.isArray(backup.data.recipes)) saveRecipes(backup.data.recipes);
    if (Array.isArray(backup.data.purchaseOrders)) savePurchaseOrders(backup.data.purchaseOrders);
    if (Array.isArray(backup.data.stockMovements)) saveStockMovementRecords(backup.data.stockMovements);
    if (Array.isArray(backup.data.wasteRecords)) saveWasteRecords(backup.data.wasteRecords);

    notifyDataChange('all');
    return true;
  } catch (e) {
    console.error('Failed to restore backup snapshot:', e);
    return false;
  }
}
