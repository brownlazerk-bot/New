/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MenuItem, Table, Waiter, Order, KitchenTicket, 
  StockAdjustmentLog, Shift, GuestRoom, UserRole, KitchenTicketStatus, TableStatus, AppUser,
  Expense, CashMovement, DailyClosingRecord, PurchaseOrder, KitchenIngredient, RecipeIngredient,
  StockMovementRecord, KitchenWasteRecord, Recipe, AccompanyingDrink
} from './types';
import { 
  loadMenuItems, saveMenuItems, loadTables, saveTables, 
  loadWaiters, saveWaiters, loadOrders, saveOrders, 
  loadKitchenTickets, saveKitchenTickets, loadStockLogs, saveStockLogs, 
  loadShifts, saveShifts, loadCurrentShift, saveCurrentShift,
  loadGuestRooms, saveGuestRooms, resetAllDataToDefault,
  loadCurrentUser, saveCurrentUser, clearCurrentUser, addAuditLog,
  loadExpenses, saveExpenses, addExpense,
  loadCashMovements, saveCashMovements, addCashMovement,
  loadDailyClosings, saveDailyClosings, addDailyClosing,
  loadPurchaseOrders, savePurchaseOrders, loadIngredients, saveIngredients,
  loadStockMovementRecords, saveStockMovementRecords, addStockMovementRecord,
  loadWasteRecords, saveWasteRecords, addWasteRecord,
  loadRecipes, saveRecipes
} from './lib/storage';
import { convertRecipeQtyToStoreQty, calculateEffectiveRecipeQty } from './lib/unitConversion';
import { exportShiftReportPDF } from './lib/exporter';

import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { PosTerminal } from './components/PosTerminal';
import { TablesGrid } from './components/TablesGrid';
import { KitchenTickets } from './components/KitchenTickets';
import { PoolSaunaModule } from './components/PoolSaunaModule';
import { StockManagement } from './components/StockManagement';
import { ShiftManager } from './components/ShiftManager';
import { DailyReportView } from './components/DailyReportView';
import { ManagerSettings } from './components/ManagerSettings';
import { ReceiptModal } from './components/ReceiptModal';
import { OrderCenterList } from './components/OrderCenterList';
import { LoginView } from './components/LoginView';
import { UserManagement } from './components/UserManagement';
import { AuditLogView } from './components/AuditLogView';
import { ProductServiceManager } from './components/ProductServiceManager';
import { IngredientsModule } from './components/IngredientsModule';
import { RecipeModule } from './components/RecipeModule';
import { MenuModule } from './components/MenuModule';
import { WhatsAppAutomationCenter } from './components/WhatsAppAutomationCenter';
import { HRManagement } from './components/HRManagement';
import { NotificationCenter } from './components/NotificationCenter';
import { ApprovalWorkflowCenter } from './components/ApprovalWorkflowCenter';
import { InAppNotificationDrawer } from './components/InAppNotificationDrawer';
import { ManualReportSendModal } from './components/ManualReportSendModal';
import { subscribeToSync, createDailyBackup, flushOfflineQueue } from './lib/syncEngine';
import { startServerSyncPolling, pullServerState } from './lib/serverSync';
import { startSupabaseSyncPolling, pullAllFromSupabase } from './lib/supabaseSync';
import { WifiOff, RefreshCw, Bell, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from './lib/currency';

import { Language } from './lib/translations';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [language, setLanguage] = useState<Language>('rw');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('Cashier');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);

  // Core Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([]);
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [guestRooms, setGuestRooms] = useState<GuestRoom[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosingRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [ingredients, setIngredients] = useState<KitchenIngredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovementRecord[]>([]);
  const [wasteRecords, setWasteRecords] = useState<KitchenWasteRecord[]>([]);

  // Receipt & Notification Drawer State
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [manualReportModal, setManualReportModal] = useState<{ isOpen: boolean; title: string }>({
    isOpen: false,
    title: 'Daily Sales Report'
  });

  // Helper to refresh all data states from storage
  const refreshAllStateFromStorage = () => {
    setMenuItems(loadMenuItems());
    setTables(loadTables());
    setWaiters(loadWaiters());
    setOrders(loadOrders());
    setKitchenTickets(loadKitchenTickets());
    setStockLogs(loadStockLogs());
    setShifts(loadShifts());
    setCurrentShift(loadCurrentShift());
    setGuestRooms(loadGuestRooms());
    setExpenses(loadExpenses());
    setCashMovements(loadCashMovements());
    setDailyClosings(loadDailyClosings());
    setPurchaseOrders(loadPurchaseOrders());
    setIngredients(loadIngredients());
    setRecipes(loadRecipes());
    setStockMovements(loadStockMovementRecords());
    setWasteRecords(loadWasteRecords());
  };

  // Load Initial Data, Sync Engine, Online/Offline & Auto-Backup
  useEffect(() => {
    const loggedInUser = loadCurrentUser();
    if (loggedInUser) {
      setCurrentUser(loggedInUser);
      setUserRole(loggedInUser.role === 'Super Admin' || loggedInUser.role === 'Admin' || loggedInUser.role === 'Manager' ? 'Manager' : 'Cashier');
    }

    refreshAllStateFromStorage();

    // Trigger daily backup
    try {
      createDailyBackup(loggedInUser?.fullName || 'System Auto-Backup');
    } catch (e) {
      // Backup fallback
    }

    // Subscribe to real-time sync across connected tabs/windows & devices
    const unsubscribeSync = subscribeToSync((_entityKey) => {
      refreshAllStateFromStorage();
    });

    // Start central Express server polling (syncs HP, Dell, Phone, etc.)
    const stopServerPolling = startServerSyncPolling(3000);

    // Start Supabase Cloud polling if configured
    const stopSupabasePolling = startSupabaseSyncPolling(4000);

    // Initial pull from central database & Supabase
    const loadDatabaseWithFeedback = async () => {
      setIsDbLoading(true);
      setDbSyncError(null);
      try {
        await pullServerState();
        await pullAllFromSupabase();
        refreshAllStateFromStorage();
      } catch (err: any) {
        setDbSyncError(err.message || 'Error connecting to database server');
      } finally {
        setIsDbLoading(false);
      }
    };

    loadDatabaseWithFeedback();

    // Handle online/offline network transitions
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
      pullServerState().then(() => refreshAllStateFromStorage());
      pullAllFromSupabase().then(() => refreshAllStateFromStorage());
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeSync();
      stopServerPolling();
      stopSupabasePolling();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Inactivity Auto-Logout Timer (15 Minutes)
  useEffect(() => {
    if (!currentUser) return;
    let timeoutId: any;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        addAuditLog({
          userId: currentUser.id,
          userName: currentUser.fullName,
          userRole: currentUser.role,
          userEmail: currentUser.email,
          action: 'Auto-Logout',
          category: 'Auth',
          details: 'User automatically logged out due to 15 minutes of inactivity'
        });
        clearCurrentUser();
        setCurrentUser(null);
        alert('Security Alert: You have been logged out due to 15 minutes of inactivity.');
      }, 15 * 60 * 1000);
    };

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);

    resetInactivityTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keydown', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    if (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Manager') {
      setUserRole('Manager');
    } else {
      setUserRole('Cashier');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'User Logout',
        category: 'Auth',
        details: 'User logged out of session'
      });
    }
    clearCurrentUser();
    setCurrentUser(null);
  };

  // Sync to Storage on State Changes
  const updateMenuItemsState = (newItems: MenuItem[]) => {
    setMenuItems(newItems);
    saveMenuItems(newItems);
  };

  const updateTablesState = (newTables: Table[]) => {
    setTables(newTables);
    saveTables(newTables);
  };

  const updateWaitersState = (newWaiters: Waiter[]) => {
    setWaiters(newWaiters);
    saveWaiters(newWaiters);
  };

  const updateOrdersState = (newOrders: Order[]) => {
    setOrders(newOrders);
    saveOrders(newOrders);
  };

  const updateKitchenTicketsState = (newTickets: KitchenTicket[]) => {
    setKitchenTickets(newTickets);
    saveKitchenTickets(newTickets);
  };

  const updateStockLogsState = (newLogs: StockAdjustmentLog[]) => {
    setStockLogs(newLogs);
    saveStockLogs(newLogs);
  };

  const updateShiftsState = (newShifts: Shift[]) => {
    setShifts(newShifts);
    saveShifts(newShifts);
  };

  const updateCurrentShiftState = (shift: Shift | null) => {
    setCurrentShift(shift);
    saveCurrentShift(shift);
  };

  const updateGuestRoomsState = (newRooms: GuestRoom[]) => {
    setGuestRooms(newRooms);
    saveGuestRooms(newRooms);
  };

  const updateExpensesState = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    saveExpenses(newExpenses);
  };

  const handleAddExpense = (exp: Omit<Expense, 'id' | 'expenseNumber' | 'timestamp'>) => {
    const created = addExpense(exp);
    setExpenses(loadExpenses());
    
    // Also record cash movement if expense was paid in cash
    addCashMovement({
      amount: -Math.abs(exp.amount),
      movementType: 'Expense Paid',
      reason: `Expense [${exp.category}]: ${exp.description}`,
      user: exp.approvedBy || exp.requestedBy || 'Staff',
      shiftId: currentShift?.id,
      referenceId: created.id
    });
    setCashMovements(loadCashMovements());
    return created;
  };

  const updateCashMovementsState = (newMovements: CashMovement[]) => {
    setCashMovements(newMovements);
    saveCashMovements(newMovements);
  };

  const updateIngredientsState = (newIngs: KitchenIngredient[]) => {
    setIngredients(newIngs);
    saveIngredients(newIngs);
  };

  const handleSaveIngredients = (newIngs: KitchenIngredient[]) => {
    updateIngredientsState(newIngs);
  };

  const handleSaveRecipesList = (newRecipes: Recipe[]) => {
    setRecipes(newRecipes);
    saveRecipes(newRecipes);
  };

  const handleSaveRecipe = (menuItemId: string, recipe: RecipeIngredient[], accompanyingDrinks?: AccompanyingDrink[]) => {
    const updated = menuItems.map(m => {
      if (m.id === menuItemId) {
        return {
          ...m,
          hasRecipe: recipe.length > 0 || (accompanyingDrinks && accompanyingDrinks.length > 0),
          recipe: recipe,
          ...(accompanyingDrinks ? { accompanyingDrinks } : {})
        };
      }
      return m;
    });
    updateMenuItemsState(updated);
    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Save Dish Recipe',
        category: 'Inventory',
        details: `Saved ${recipe.length} ingredients & ${accompanyingDrinks?.length || 0} accompanying drinks for ${menuItems.find(m => m.id === menuItemId)?.name || menuItemId}`
      });
    }
  };

  // Helper to handle waste record creation
  const handleAddWasteRecord = (waste: Omit<KitchenWasteRecord, 'id' | 'timestamp' | 'date'>) => {
    const created = addWasteRecord(waste);
    setWasteRecords(loadWasteRecords());

    // Deduct ingredient stock automatically
    let currentIngs = loadIngredients();
    const idx = currentIngs.findIndex(g => g.id === waste.ingredientId);
    if (idx > -1) {
      const ing = currentIngs[idx];
      const storeQtyDeducted = convertRecipeQtyToStoreQty(
        waste.quantity,
        waste.unit,
        ing.unit,
        ing.conversionRate
      );
      const newStock = Math.max(0, ing.stockQuantity - storeQtyDeducted);
      const isOut = newStock <= 0;
      const isLow = !isOut && newStock <= ing.minStockAlert;

      currentIngs[idx] = {
        ...ing,
        stockQuantity: newStock,
        status: isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Available')
      };
      updateIngredientsState(currentIngs);

      // Record Stock Movement Record for Waste
      addStockMovementRecord({
        ingredientId: ing.id,
        ingredientName: ing.name,
        movementType: waste.wasteType === 'Expired' ? 'Expired Items' : 'Waste',
        quantityIn: 0,
        quantityOut: storeQtyDeducted,
        remainingBalance: newStock,
        unit: ing.unit,
        cost: waste.totalCost,
        referenceNumber: created.id,
        user: waste.reportedBy || currentUser?.fullName || 'Staff',
        department: waste.department || 'Kitchen',
        reason: `${waste.wasteType} Waste: ${waste.reason}`,
        notes: waste.notes
      });
      setStockMovements(loadStockMovementRecords());
    }

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Record Kitchen Waste',
        category: 'Inventory',
        details: `Recorded ${waste.quantity} ${waste.unit} waste for ${waste.ingredientName} (${waste.wasteType})`
      });
    }

    return created;
  };

  // Helper to deduct or restore raw ingredients for ordered items with recipes
  const processOrderRecipeDeductions = (
    orderItems: { itemId: string; name?: string; quantity: number }[],
    mode: 'deduct' | 'restore',
    referenceId?: string,
    departmentName: string = 'Restaurant POS'
  ) => {
    let currentIngs = loadIngredients();
    let hasChanges = false;

    orderItems.forEach(item => {
      const menuItem = menuItems.find(m => m.id === item.itemId);
      if (menuItem && menuItem.hasRecipe && menuItem.recipe && menuItem.recipe.length > 0) {
        menuItem.recipe.forEach(recItem => {
          if (recItem.active === false) return; // Skip inactive recipe items

          const ingIndex = currentIngs.findIndex(
            g => g.id === recItem.ingredientId || g.name.toLowerCase() === recItem.ingredientName.toLowerCase()
          );
          if (ingIndex > -1) {
            hasChanges = true;
            const ing = currentIngs[ingIndex];

            // 1. Calculate effective quantity required including waste/yield
            const effectiveRecipeQtyPerPortion = calculateEffectiveRecipeQty(
              recItem.quantity,
              recItem.wastePercentage || 0,
              recItem.yieldPercentage || 100
            );
            const totalRecipeQtyRequired = effectiveRecipeQtyPerPortion * item.quantity;

            // 2. Convert from recipe unit to ingredient store unit
            const storeQtyAmount = convertRecipeQtyToStoreQty(
              totalRecipeQtyRequired,
              recItem.unit,
              ing.unit,
              ing.conversionRate
            );

            const prevStock = ing.stockQuantity;
            const newStock = mode === 'deduct'
              ? Math.max(0, prevStock - storeQtyAmount)
              : prevStock + storeQtyAmount;

            const isOut = newStock <= 0;
            const isLow = !isOut && newStock <= ing.minStockAlert;

            currentIngs[ingIndex] = {
              ...ing,
              stockQuantity: newStock,
              status: isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Available')
            };

            // 3. Log Stock Movement Record
            const movementCost = storeQtyAmount * ing.costPerUnit;
            addStockMovementRecord({
              ingredientId: ing.id,
              ingredientName: ing.name,
              movementType: mode === 'deduct' ? 'Recipe Consumption' : 'Return',
              quantityIn: mode === 'restore' ? storeQtyAmount : 0,
              quantityOut: mode === 'deduct' ? storeQtyAmount : 0,
              remainingBalance: newStock,
              unit: ing.unit,
              cost: movementCost,
              referenceNumber: referenceId,
              recipeId: recItem.recipeId || menuItem.id,
              menuItemId: menuItem.id,
              menuItemName: menuItem.name,
              user: currentUser?.fullName || 'Cashier',
              department: departmentName,
              reason: mode === 'deduct' 
                ? `Auto recipe deduction for ${item.quantity}x ${menuItem.name}`
                : `Order Reversal/Cancellation restore for ${item.quantity}x ${menuItem.name}`
            });
          }
        });
      }
    });

    if (hasChanges) {
      updateIngredientsState(currentIngs);
      setStockMovements(loadStockMovementRecords());
    }
  };

  const handleAddCashMovement = (mov: Omit<CashMovement, 'id' | 'timestamp' | 'date' | 'time'>) => {
    const created = addCashMovement(mov);
    setCashMovements(loadCashMovements());
    return created;
  };

  const updateDailyClosingsState = (newClosings: DailyClosingRecord[]) => {
    setDailyClosings(newClosings);
    saveDailyClosings(newClosings);
  };

  // Play audio chime feedback
  const playSound = (type: 'order' | 'kitchen') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'order' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(type === 'order' ? 880 : 587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio fallback
    }
  };

  // Handle Order Completion from POS or Pool/Sauna
  const handleOrderCompleted = (completedOrder: Order, newKot?: KitchenTicket) => {
    playSound('order');

    // 1. Add Order
    const updatedOrders = [completedOrder, ...orders];
    updateOrdersState(updatedOrders);

    // 2. Automatic Drink Stock Deduction
    let updatedMenuItems = [...menuItems];
    let newLogs: StockAdjustmentLog[] = [...stockLogs];

    completedOrder.items.forEach((item) => {
      const targetIndex = updatedMenuItems.findIndex(m => m.id === item.itemId);
      if (targetIndex > -1) {
        const prevStock = updatedMenuItems[targetIndex].stockQuantity;
        const newStock = Math.max(0, prevStock - item.quantity);
        const isNowOut = newStock === 0;

        updatedMenuItems[targetIndex] = {
          ...updatedMenuItems[targetIndex],
          stockQuantity: newStock,
          status: isNowOut ? 'Out of Stock' : updatedMenuItems[targetIndex].status
        };

        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random()}`,
          itemId: item.itemId,
          itemName: item.name,
          type: 'Sale',
          quantityChange: -item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          reason: `Auto-deducted from Order ${completedOrder.id}`,
          timestamp: new Date().toISOString(),
          actor: completedOrder.cashierName
        });
      }
    });

    updateMenuItemsState(updatedMenuItems);
    updateStockLogsState(newLogs);

    // Automatic Recipe Ingredients Deduction for Kitchen Dishes
    processOrderRecipeDeductions(completedOrder.items, 'deduct');

    // 3. Automatic Kitchen Order Ticket (Bon de Commande) handling
    if (newKot) {
      playSound('kitchen');
      updateKitchenTicketsState([newKot, ...kitchenTickets]);
    }

    // 4. Update Table Status if table was assigned
    const tableIdentifierId = completedOrder.tableId;
    const tableIdentifierNum = completedOrder.tableNumber;
    if (tableIdentifierId || tableIdentifierNum) {
      const isOrderPaid = completedOrder.paymentStatus === 'PAID' || completedOrder.status === 'Paid';

      const updatedTables = tables.map(t => {
        const matchesTable = (tableIdentifierId && t.id === tableIdentifierId) || (tableIdentifierNum && t.tableNumber === tableIdentifierNum);
        if (matchesTable) {
          if (isOrderPaid) {
            const otherUnpaid = orders.some(
              o => o.id !== completedOrder.id &&
                   ((tableIdentifierId && o.tableId === tableIdentifierId) || (tableIdentifierNum && o.tableNumber === tableIdentifierNum)) &&
                   o.paymentStatus !== 'PAID' &&
                   o.status !== 'Paid' &&
                   o.status !== 'Cancelled'
            );
            if (!otherUnpaid) {
              return {
                ...t,
                status: 'Available' as TableStatus,
                currentOrderId: undefined
              };
            }
          } else {
            return {
              ...t,
              status: 'Occupied' as TableStatus,
              currentOrderId: completedOrder.id
            };
          }
        }
        return t;
      });
      updateTablesState(updatedTables);
    }

    // 5. Update Guest Room Balance if Room/Apartment Charge
    if (completedOrder.paymentDetails?.selectedRoomId) {
      const updatedRooms = guestRooms.map(r => {
        if (r.id === completedOrder.paymentDetails?.selectedRoomId) {
          return {
            ...r,
            balance: r.balance + completedOrder.total
          };
        }
        return r;
      });
      updateGuestRoomsState(updatedRooms);
    }

    // 6. Audit Log
    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'New Order Completed',
        category: 'Sales',
        details: `Created order #${completedOrder.id} (${completedOrder.servicesIncluded?.join(', ') || 'Bar Order'}) for ${completedOrder.total} RWF - Status: ${completedOrder.status}`
      });
    }

    // 7. Show Printable Thermal Receipt Modal
    setReceiptOrder(completedOrder);
  };

  // Helper to Return Stock to Inventory for an order (Menu items + Accompanying Drinks + Raw Recipe Ingredients)
  const restoreOrderStockToInventory = (orderToCancel: Order, reasonText: string) => {
    let updatedMenuItems = [...menuItems];
    let newLogs: StockAdjustmentLog[] = [...stockLogs];

    orderToCancel.items.forEach((item) => {
      const targetIndex = updatedMenuItems.findIndex(m => m.id === item.itemId);
      if (targetIndex > -1) {
        const menuItem = updatedMenuItems[targetIndex];
        const prevStock = menuItem.stockQuantity;
        const newStock = prevStock + item.quantity;

        updatedMenuItems[targetIndex] = {
          ...menuItem,
          stockQuantity: newStock,
          status: newStock > 0 ? 'Available' : menuItem.status
        };

        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random()}`,
          itemId: item.itemId,
          itemName: item.name,
          type: 'Return',
          quantityChange: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          reason: `${reasonText} (Order #${orderToCancel.orderNumber || orderToCancel.id})`,
          timestamp: new Date().toISOString(),
          actor: currentShift?.cashierName || currentUser?.fullName || 'System'
        });

        // Restore Accompanying Drink Pairings attached to this dish if any
        if (menuItem.accompanyingDrinks && menuItem.accompanyingDrinks.length > 0) {
          menuItem.accompanyingDrinks.forEach(drink => {
            const drinkQtyToRestore = (drink.quantity || 1) * item.quantity;
            const drinkIndex = updatedMenuItems.findIndex(m => 
              (drink.menuItemId && m.id === drink.menuItemId) ||
              m.name.toLowerCase() === drink.drinkName.toLowerCase()
            );
            if (drinkIndex > -1) {
              const dMenuItem = updatedMenuItems[drinkIndex];
              const dPrevStock = dMenuItem.stockQuantity;
              const dNewStock = dPrevStock + drinkQtyToRestore;

              updatedMenuItems[drinkIndex] = {
                ...dMenuItem,
                stockQuantity: dNewStock,
                status: dNewStock > 0 ? 'Available' : dMenuItem.status
              };

              newLogs.unshift({
                id: `log-drk-${Date.now()}-${Math.random()}`,
                itemId: dMenuItem.id,
                itemName: dMenuItem.name,
                type: 'Return',
                quantityChange: drinkQtyToRestore,
                previousStock: dPrevStock,
                newStock: dNewStock,
                reason: `Accompanying Drink Restored (${drink.drinkName} for ${item.name} #${orderToCancel.orderNumber || orderToCancel.id})`,
                timestamp: new Date().toISOString(),
                actor: currentShift?.cashierName || currentUser?.fullName || 'System'
              });
            }
          });
        }
      }
    });

    updateMenuItemsState(updatedMenuItems);
    updateStockLogsState(newLogs);

    // Restore raw ingredients for dishes with recipes
    processOrderRecipeDeductions(orderToCancel.items, 'restore', orderToCancel.id);
  };

  // Helper to release table if no other active unpaid order exists on it
  const releaseTableIfEmpty = (tableId?: string, tableNumber?: string) => {
    if (!tableId && !tableNumber) return;
    const remainingUnpaidOrders = orders.filter(
      o => ((tableId && o.tableId === tableId) || (tableNumber && o.tableNumber === tableNumber)) &&
           o.status !== 'Cancelled' &&
           o.status !== 'Paid' &&
           o.paymentStatus !== 'PAID'
    );
    if (remainingUnpaidOrders.length <= 1) {
      const updatedTables = tables.map(t => {
        if ((tableId && t.id === tableId) || (tableNumber && t.tableNumber === tableNumber)) {
          return {
            ...t,
            status: 'Available' as TableStatus,
            currentOrderId: undefined
          };
        }
        return t;
      });
      updateTablesState(updatedTables);
    }
  };

  // 1. Cancel Order with Complete Stock, Recipe, Drink, Cash Reversal & KOT Cancellation
  const handleCancelOrderAndReturnStock = (orderToCancel: Order) => {
    playSound('order');

    // Return Stock & Money if not already cancelled
    if (orderToCancel.status !== 'Cancelled') {
      // 1. Restore Stock (Menu items + accompanying drinks + raw recipe ingredients)
      restoreOrderStockToInventory(orderToCancel, 'Direct Stock Restoration on Order Cancellation');

      // 2. Money / Cash Reversal entry in cash ledger
      if (orderToCancel.amountPaid > 0) {
        addCashMovement({
          amount: -Math.abs(orderToCancel.amountPaid),
          movementType: 'Order Cancellation / Refund',
          reason: `Refund/Payment Reversal for Cancelled Order #${orderToCancel.orderNumber || orderToCancel.id}`,
          notes: `Reversed ${formatCurrency(orderToCancel.amountPaid)} paid via ${orderToCancel.paymentMethod || 'Cash'}`,
          user: currentUser?.fullName || orderToCancel.cashierName || 'Cashier',
          shiftId: orderToCancel.shiftId || currentShift?.id || 'SHIFT',
          businessDate: orderToCancel.businessDate || new Date().toISOString().split('T')[0],
          referenceId: orderToCancel.id
        });
        setCashMovements(loadCashMovements());
      }

      // 3. Kitchen Ticket (KOT) Cancellation
      const updatedKots = kitchenTickets.map(kt => {
        if (kt.orderId === orderToCancel.id || (orderToCancel.kotId && kt.id === orderToCancel.kotId)) {
          return { ...kt, status: 'Cancelled' as KitchenTicketStatus };
        }
        return kt;
      });
      updateKitchenTicketsState(updatedKots);

      // 4. Guest Room Balance Reversal if room charge
      if (orderToCancel.guestRoomId || orderToCancel.paymentDetails?.selectedRoomId) {
        const roomId = orderToCancel.guestRoomId || orderToCancel.paymentDetails?.selectedRoomId;
        const updatedRooms = guestRooms.map(r => {
          if (r.id === roomId) {
            return { ...r, balance: Math.max(0, r.balance - orderToCancel.total) };
          }
          return r;
        });
        updateGuestRoomsState(updatedRooms);
      }
    }

    // Release Table
    if (orderToCancel.tableId || orderToCancel.tableNumber) {
      releaseTableIfEmpty(orderToCancel.tableId, orderToCancel.tableNumber);
    }

    // Update Order Status
    const updatedOrder: Order = {
      ...orderToCancel,
      status: 'Cancelled',
      paymentStatus: 'UNPAID',
      amountPaid: 0,
      balance: 0,
      updatedAt: new Date().toISOString()
    };

    const updatedOrders = orders.map(o => o.id === orderToCancel.id ? updatedOrder : o);
    updateOrdersState(updatedOrders);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Cancel Order & Return Everything',
        category: 'Sales',
        details: `Cancelled order #${orderToCancel.orderNumber || orderToCancel.id} - Menu stock, recipe ingredients, drink pairings, money payment & KOT restored/cancelled.`
      });
    }
  };

  // 2. Delete Order completely with Full Stock, Recipe, Drink & Cash Reversal
  const handleDeleteOrderAndReturnStock = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status !== 'Cancelled') {
      // 1. Restore Stock (Menu items + accompanying drinks + raw recipe ingredients)
      restoreOrderStockToInventory(targetOrder, 'Stock Restored on Order Deletion');

      // 2. Cash / Payment Reversal
      if (targetOrder.amountPaid > 0) {
        addCashMovement({
          amount: -Math.abs(targetOrder.amountPaid),
          movementType: 'Order Cancellation / Refund',
          reason: `Refund/Payment Reversal for Deleted Order #${targetOrder.orderNumber || targetOrder.id}`,
          notes: `Reversed ${formatCurrency(targetOrder.amountPaid)} paid via ${targetOrder.paymentMethod || 'Cash'}`,
          user: currentUser?.fullName || targetOrder.cashierName || 'Cashier',
          shiftId: targetOrder.shiftId || currentShift?.id || 'SHIFT',
          businessDate: targetOrder.businessDate || new Date().toISOString().split('T')[0],
          referenceId: targetOrder.id
        });
        setCashMovements(loadCashMovements());
      }

      // 3. Guest Room Balance Reversal
      if (targetOrder.guestRoomId || targetOrder.paymentDetails?.selectedRoomId) {
        const roomId = targetOrder.guestRoomId || targetOrder.paymentDetails?.selectedRoomId;
        const updatedRooms = guestRooms.map(r => {
          if (r.id === roomId) {
            return { ...r, balance: Math.max(0, r.balance - targetOrder.total) };
          }
          return r;
        });
        updateGuestRoomsState(updatedRooms);
      }

      // 4. Release Table
      if (targetOrder.tableId || targetOrder.tableNumber) {
        releaseTableIfEmpty(targetOrder.tableId, targetOrder.tableNumber);
      }
    }

    // 5. Remove or Cancel associated KOTs
    const updatedKots = kitchenTickets.filter(kt => kt.orderId !== orderId && kt.id !== targetOrder.kotId);
    updateKitchenTicketsState(updatedKots);

    // 6. Delete Order Completely
    const updatedOrders = orders.filter(o => o.id !== orderId);
    updateOrdersState(updatedOrders);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Delete Order & Return Everything',
        category: 'Sales',
        details: `Deleted order #${targetOrder.orderNumber || targetOrder.id} completely - Stock, recipe ingredients, drink pairings & cash money fully restored.`
      });
    }
  };

  // 3. Save Comprehensive Order Edits (Table, Waiter, Items, Customer)
  const handleSaveOrderEdits = (updatedOrder: Order) => {
    playSound('order');

    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    if (!oldOrder) return;

    // Check item quantity changes & adjust stock accordingly
    let updatedMenuItems = [...menuItems];
    let newLogs: StockAdjustmentLog[] = [...stockLogs];

    // Find items that were changed or removed
    oldOrder.items.forEach(oldItem => {
      const newItem = updatedOrder.items.find(i => i.itemId === oldItem.itemId);
      const newQty = newItem ? newItem.quantity : 0;
      const diff = newQty - oldItem.quantity; // positive means added, negative means returned

      if (diff !== 0) {
        const targetIdx = updatedMenuItems.findIndex(m => m.id === oldItem.itemId);
        if (targetIdx > -1) {
          const prevStock = updatedMenuItems[targetIdx].stockQuantity;
          const newStock = Math.max(0, prevStock - diff);

          updatedMenuItems[targetIdx] = {
            ...updatedMenuItems[targetIdx],
            stockQuantity: newStock,
            status: newStock === 0 ? 'Out of Stock' : 'Available'
          };

          newLogs.unshift({
            id: `log-${Date.now()}-${Math.random()}`,
            itemId: oldItem.itemId,
            itemName: oldItem.name,
            type: diff < 0 ? 'Return' : 'Sale',
            quantityChange: -diff,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Order Edit #${updatedOrder.orderNumber || updatedOrder.id} (${diff < 0 ? 'Item Returned to Stock' : 'Item Added'})`,
            timestamp: new Date().toISOString(),
            actor: currentShift?.cashierName || currentUser?.fullName || 'System'
          });
        }
      }
    });

    // Find brand new items added in edit
    updatedOrder.items.forEach(newItem => {
      const existsInOld = oldOrder.items.some(i => i.itemId === newItem.itemId);
      if (!existsInOld) {
        const targetIdx = updatedMenuItems.findIndex(m => m.id === newItem.itemId);
        if (targetIdx > -1) {
          const prevStock = updatedMenuItems[targetIdx].stockQuantity;
          const newStock = Math.max(0, prevStock - newItem.quantity);

          updatedMenuItems[targetIdx] = {
            ...updatedMenuItems[targetIdx],
            stockQuantity: newStock,
            status: newStock === 0 ? 'Out of Stock' : 'Available'
          };

          newLogs.unshift({
            id: `log-${Date.now()}-${Math.random()}`,
            itemId: newItem.itemId,
            itemName: newItem.name,
            type: 'Sale',
            quantityChange: -newItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Order Edit #${updatedOrder.orderNumber || updatedOrder.id} (New Item Added)`,
            timestamp: new Date().toISOString(),
            actor: currentShift?.cashierName || currentUser?.fullName || 'System'
          });
        }
      }
    });

    updateMenuItemsState(updatedMenuItems);
    updateStockLogsState(newLogs);

    // Table Reassignment handling
    if (oldOrder.tableId !== updatedOrder.tableId) {
      let updatedTables = [...tables];

      // Release old table if no other active order
      if (oldOrder.tableId) {
        const remainingOnOld = orders.filter(o => o.id !== oldOrder.id && o.tableId === oldOrder.tableId && o.status !== 'Cancelled' && o.status !== 'Paid');
        if (remainingOnOld.length === 0) {
          updatedTables = updatedTables.map(t => t.id === oldOrder.tableId ? { ...t, status: 'Available' as TableStatus, currentOrderId: undefined } : t);
        }
      }

      // Assign new table
      if (updatedOrder.tableId) {
        updatedTables = updatedTables.map(t => t.id === updatedOrder.tableId ? { ...t, status: 'Occupied' as TableStatus, currentOrderId: updatedOrder.id, assignedWaiterId: updatedOrder.waiterId } : t);
      }

      updateTablesState(updatedTables);
    }

    // Save updated order
    const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    updateOrdersState(updatedOrders);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Edit Order',
        category: 'Sales',
        details: `Edited order #${updatedOrder.orderNumber || updatedOrder.id}: Table updated to ${updatedOrder.tableNumber}, Waiter: ${updatedOrder.waiterName}, Total: ${updatedOrder.total}`
      });
    }
  };

  // Handle Updating Existing Order (Payments, Added Items, Status Changes)
  const handleUpdateOrder = (updatedOrder: Order, newKot?: KitchenTicket) => {
    playSound('order');
    const oldOrder = orders.find(o => o.id === updatedOrder.id);
    
    // If order is changed to Cancelled, trigger stock restoration
    if (updatedOrder.status === 'Cancelled' && oldOrder && oldOrder.status !== 'Cancelled') {
      restoreOrderStockToInventory(updatedOrder, 'Restored stock on order cancellation');
      if (updatedOrder.tableId || updatedOrder.tableNumber) {
        releaseTableIfEmpty(updatedOrder.tableId, updatedOrder.tableNumber);
      }
    }

    // Auto-release Table when order becomes PAID
    const isOrderPaidNow = updatedOrder.paymentStatus === 'PAID' || updatedOrder.status === 'Paid';
    const targetTableId = updatedOrder.tableId || oldOrder?.tableId;
    const targetTableNum = updatedOrder.tableNumber || oldOrder?.tableNumber;

    if (isOrderPaidNow && (targetTableId || targetTableNum)) {
      const remainingUnpaidOnTable = orders.filter(
        o => o.id !== updatedOrder.id &&
             ((targetTableId && o.tableId === targetTableId) || (targetTableNum && o.tableNumber === targetTableNum)) &&
             o.paymentStatus !== 'PAID' &&
             o.status !== 'Paid' &&
             o.status !== 'Cancelled'
      );

      if (remainingUnpaidOnTable.length === 0) {
        const updatedTables = tables.map(t => {
          if ((targetTableId && t.id === targetTableId) || (targetTableNum && t.tableNumber === targetTableNum)) {
            return {
              ...t,
              status: 'Available' as TableStatus,
              currentOrderId: undefined
            };
          }
          return t;
        });
        updateTablesState(updatedTables);
      }
    }

    const exists = orders.some(o => o.id === updatedOrder.id);
    const updatedOrders = exists
      ? orders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
      : [updatedOrder, ...orders];
    updateOrdersState(updatedOrders);

    if (newKot) {
      playSound('kitchen');
      updateKitchenTicketsState([newKot, ...kitchenTickets]);
    }

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Update Order',
        category: 'Sales',
        details: `Updated order #${updatedOrder.id} status to ${updatedOrder.status} / Payment: ${updatedOrder.paymentStatus}`
      });
    }
  };

  // Kitchen Ticket Status Updates
  const handleUpdateKitchenStatus = (ticketId: string, newStatus: KitchenTicketStatus) => {
    const updated = kitchenTickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t);
    updateKitchenTicketsState(updated);
  };

  // Table Status Update
  const handleUpdateTableStatus = (tableId: string, newStatus: TableStatus, waiterId?: string) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: newStatus,
          assignedWaiterId: waiterId || t.assignedWaiterId,
          currentOrderId: newStatus === 'Available' ? undefined : t.currentOrderId
        };
      }
      return t;
    });
    updateTablesState(updated);
  };

  // Open Table Order in POS
  const handleOpenTableOrder = (table: Table) => {
    setActiveTab('pos');
  };

  // Stock Adjustment Manual Action
  const handleUpdateStock = (
    itemId: string, 
    qtyChange: number, 
    type: StockAdjustmentLog['type'], 
    reason: string
  ) => {
    const targetIdx = menuItems.findIndex(m => m.id === itemId);
    if (targetIdx === -1) return;

    const prevStock = menuItems[targetIdx].stockQuantity;
    const newStock = Math.max(0, prevStock + qtyChange);

    const updatedItems = [...menuItems];
    updatedItems[targetIdx] = {
      ...updatedItems[targetIdx],
      stockQuantity: newStock,
      status: newStock > 0 ? 'Available' : 'Out of Stock'
    };

    const newLog: StockAdjustmentLog = {
      id: `log-${Date.now()}`,
      itemId,
      itemName: menuItems[targetIdx].name,
      type,
      quantityChange: qtyChange,
      previousStock: prevStock,
      newStock,
      reason,
      timestamp: new Date().toISOString(),
      actor: currentShift?.cashierName || currentUser?.fullName || 'Bar Manager'
    };

    updateMenuItemsState(updatedItems);
    updateStockLogsState([newLog, ...stockLogs]);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Manual Stock Adjustment',
        category: 'Inventory',
        details: `Adjusted stock for ${menuItems[targetIdx].name} (${qtyChange > 0 ? '+' : ''}${qtyChange}) - Reason: ${reason}`
      });
    }
  };

  // Transfer Stock from Main Beverage Stock -> Bar
  const handleTransferStock = (itemId: string, quantity: number, reason: string) => {
    const targetIdx = menuItems.findIndex(m => m.id === itemId);
    if (targetIdx === -1) return;

    const item = menuItems[targetIdx];
    const currentMain = item.mainStockQuantity || 0;
    const currentBar = item.stockQuantity || 0;

    if (quantity <= 0) {
      alert('Please enter a valid transfer quantity greater than 0.');
      return;
    }

    if (currentMain < quantity) {
      alert(`Insufficient quantity in Main Beverage Stock. Available: ${currentMain} ${item.unit}s.`);
      return;
    }

    const newMain = currentMain - quantity;
    const newBar = currentBar + quantity;

    const updatedItems = [...menuItems];
    updatedItems[targetIdx] = {
      ...item,
      mainStockQuantity: newMain,
      stockQuantity: newBar,
      status: newBar > 0 ? 'Available' : 'Out of Stock'
    };

    const transferLog: StockAdjustmentLog = {
      id: `log-tr-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      type: 'Transfer',
      quantityChange: quantity,
      previousStock: currentBar,
      newStock: newBar,
      sourceLocation: 'Main Beverage Stock',
      targetLocation: 'Bar Stock',
      reason: reason || 'Exported from Main Beverage Stock to Bar',
      timestamp: new Date().toISOString(),
      actor: currentShift?.cashierName || currentUser?.fullName || 'Storekeeper'
    };

    updateMenuItemsState(updatedItems);
    updateStockLogsState([transferLog, ...stockLogs]);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Main Stock Transfer to Bar',
        category: 'Inventory',
        details: `Exported ${quantity} ${item.unit}s of ${item.name} from Main Beverage Stock to Bar`
      });
    }
  };

  // Directly Record & Edit Main Beverage Stock Quantity & Properties
  const handleUpdateMainStock = (
    itemId: string,
    newMainQty: number,
    reason: string,
    additionalEdits?: { price?: number; costPrice?: number; unit?: string; minStockAlert?: number }
  ) => {
    const targetIdx = menuItems.findIndex(m => m.id === itemId);
    if (targetIdx === -1) return;

    const prevMain = menuItems[targetIdx].mainStockQuantity || 0;
    const diff = newMainQty - prevMain;

    const updatedItems = [...menuItems];
    updatedItems[targetIdx] = {
      ...updatedItems[targetIdx],
      mainStockQuantity: Math.max(0, newMainQty),
      ...(additionalEdits?.price !== undefined ? { price: additionalEdits.price } : {}),
      ...(additionalEdits?.costPrice !== undefined ? { costPrice: additionalEdits.costPrice } : {}),
      ...(additionalEdits?.unit !== undefined ? { unit: additionalEdits.unit } : {}),
      ...(additionalEdits?.minStockAlert !== undefined ? { minStockAlert: additionalEdits.minStockAlert } : {})
    };

    const newLog: StockAdjustmentLog = {
      id: `log-main-${Date.now()}`,
      itemId,
      itemName: menuItems[targetIdx].name,
      type: diff >= 0 ? 'Purchase' : 'Adjustment',
      quantityChange: diff,
      previousStock: prevMain,
      newStock: Math.max(0, newMainQty),
      sourceLocation: 'Main Beverage Stock',
      reason: reason || 'Main Beverage Stock Direct Record/Edit',
      timestamp: new Date().toISOString(),
      actor: currentShift?.cashierName || currentUser?.fullName || 'Storekeeper'
    };

    updateMenuItemsState(updatedItems);
    updateStockLogsState([newLog, ...stockLogs]);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Record/Edit Main Beverage Stock',
        category: 'Inventory',
        details: `Updated Main Beverage Stock for ${menuItems[targetIdx].name}: Old Stock=${prevMain}, New Stock=${newMainQty} (${diff >= 0 ? '+' : ''}${diff}) - Reason: ${reason}`
      });
    }
  };

  // Directly Record & Edit Kitchen Stock Quantity & Properties
  const handleUpdateKitchenStock = (
    itemId: string,
    newKitchenQty: number,
    reason: string,
    additionalEdits?: { price?: number; costPrice?: number; unit?: string; minStockAlert?: number }
  ) => {
    const targetIdx = menuItems.findIndex(m => m.id === itemId);
    if (targetIdx === -1) return;

    const prevKitchen = menuItems[targetIdx].stockQuantity || 0;
    const diff = newKitchenQty - prevKitchen;

    const updatedItems = [...menuItems];
    updatedItems[targetIdx] = {
      ...updatedItems[targetIdx],
      stockQuantity: Math.max(0, newKitchenQty),
      status: newKitchenQty > 0 ? 'Available' : 'Out of Stock',
      ...(additionalEdits?.price !== undefined ? { price: additionalEdits.price } : {}),
      ...(additionalEdits?.costPrice !== undefined ? { costPrice: additionalEdits.costPrice } : {}),
      ...(additionalEdits?.unit !== undefined ? { unit: additionalEdits.unit } : {}),
      ...(additionalEdits?.minStockAlert !== undefined ? { minStockAlert: additionalEdits.minStockAlert } : {})
    };

    const newLog: StockAdjustmentLog = {
      id: `log-kitchen-${Date.now()}`,
      itemId,
      itemName: menuItems[targetIdx].name,
      type: diff >= 0 ? 'Purchase' : 'Adjustment',
      quantityChange: diff,
      previousStock: prevKitchen,
      newStock: Math.max(0, newKitchenQty),
      sourceLocation: 'Kitchen Stock',
      reason: reason || 'Kitchen Stock Direct Record/Edit',
      timestamp: new Date().toISOString(),
      actor: currentShift?.cashierName || currentUser?.fullName || 'Storekeeper'
    };

    updateMenuItemsState(updatedItems);
    updateStockLogsState([newLog, ...stockLogs]);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Record/Edit Kitchen Stock',
        category: 'Inventory',
        details: `Updated Kitchen Stock for ${menuItems[targetIdx].name}: Old Stock=${prevKitchen}, New Stock=${newKitchenQty} (${diff >= 0 ? '+' : ''}${diff}) - Reason: ${reason}`
      });
    }
  };

  // Edit / Update Existing Purchase Order
  const handleEditPurchaseOrder = (poId: string, updatedPOData: Partial<PurchaseOrder>) => {
    const existingPo = purchaseOrders.find(p => p.id === poId);
    if (!existingPo) return;

    const wasReceived = existingPo.status === 'Received';
    const isNowReceived = updatedPOData.status === 'Received';

    const updatedPOs = purchaseOrders.map(p => {
      if (p.id === poId) {
        const newItems = updatedPOData.items || p.items;
        const newTotal = updatedPOData.totalAmount !== undefined
          ? updatedPOData.totalAmount
          : newItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0);

        return {
          ...p,
          ...updatedPOData,
          items: newItems,
          totalAmount: newTotal,
          ...(isNowReceived && !wasReceived ? {
            receivedAt: new Date().toISOString(),
            receivedByName: currentUser?.fullName || 'Storekeeper'
          } : {})
        };
      }
      return p;
    });

    setPurchaseOrders(updatedPOs);
    savePurchaseOrders(updatedPOs);

    // If PO was newly marked as Received in edit, trigger stock intake with the updated PO list
    if (!wasReceived && isNowReceived) {
      handleReceivePurchaseOrder(poId, undefined, currentUser?.fullName || 'Storekeeper', updatedPOs);
    } else if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Updated Purchase Order',
        category: 'Inventory',
        details: `Edited Purchase Order #${existingPo.poNumber} (${existingPo.supplierName})`
      });
    }
  };

  // Delete / Cancel Purchase Order
  const handleDeletePurchaseOrder = (poId: string) => {
    const target = purchaseOrders.find(p => p.id === poId);
    if (!target) return;

    const filtered = purchaseOrders.filter(p => p.id !== poId);
    setPurchaseOrders(filtered);
    savePurchaseOrders(filtered);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Deleted Purchase Order',
        category: 'Inventory',
        details: `Deleted Purchase Order #${target.poNumber}`
      });
    }
  };

  // Create Purchase Order
  const handleCreatePurchaseOrder = (newPOData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'timestamp'>) => {
    const newPO: PurchaseOrder = {
      ...newPOData,
      id: `PO-${Date.now()}`,
      poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString()
    };

    const updated = [newPO, ...purchaseOrders];
    setPurchaseOrders(updated);
    savePurchaseOrders(updated);
    return newPO;
  };

  // Receive / Accept Purchase Order (Auto Stock Gain for Beverages, Kitchen Dishes & Recipe Ingredients)
  const handleReceivePurchaseOrder = (
    poId: string, 
    receivedItemsPayload?: { itemId: string; receivedQty: number; unitCost?: number; ticked: boolean }[],
    receiverName?: string,
    overridePOList?: PurchaseOrder[]
  ) => {
    const activePOs = overridePOList || purchaseOrders;
    const targetPo = activePOs.find(p => p.id === poId);
    if (!targetPo) return;
    if (targetPo.status === 'Received' && (!receivedItemsPayload || receivedItemsPayload.length === 0)) {
      alert('This Purchase Order has already been fully received!');
      return;
    }

    let updatedMenuItems = [...menuItems];
    let updatedIngredients = loadIngredients();
    let newLogs: StockAdjustmentLog[] = [...stockLogs];
    let newMovements: StockMovementRecord[] = loadStockMovementRecords();

    const actualReceiver = receiverName || currentUser?.fullName || 'Storekeeper';

    const updatedPoItems = targetPo.items.map(poItem => {
      let isTicked = true;
      let qtyToTake = poItem.quantity;
      let costToTake = poItem.unitCost;

      if (receivedItemsPayload && receivedItemsPayload.length > 0) {
        const payloadMatch = receivedItemsPayload.find(p => p.itemId === poItem.itemId || p.itemId === poItem.itemName);
        if (payloadMatch) {
          isTicked = payloadMatch.ticked;
          qtyToTake = payloadMatch.ticked ? Math.max(0, payloadMatch.receivedQty) : 0;
          if (payloadMatch.unitCost && payloadMatch.unitCost > 0) {
            costToTake = payloadMatch.unitCost;
          }
        } else {
          isTicked = false;
          qtyToTake = 0;
        }
      }

      if (isTicked && qtyToTake > 0) {
        // Check if item matches a Kitchen Raw Ingredient
        const ingIdx = updatedIngredients.findIndex(g => 
          g.id === poItem.itemId || 
          g.name.toLowerCase() === poItem.itemName.toLowerCase() ||
          poItem.itemId.startsWith('ing-')
        );

        if (ingIdx > -1) {
          const ing = updatedIngredients[ingIdx];
          const prevStock = ing.stockQuantity || 0;
          const newStock = prevStock + qtyToTake;
          updatedIngredients[ingIdx] = {
            ...ing,
            stockQuantity: newStock,
            costPerUnit: costToTake > 0 ? costToTake : ing.costPerUnit
          };

          const now = new Date();
          newMovements.unshift({
            id: `mvt-po-${Date.now()}-${poItem.itemId}`,
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            timestamp: now.toISOString(),
            ingredientId: ing.id,
            ingredientName: ing.name,
            department: 'Kitchen',
            movementType: 'Purchase',
            quantityIn: qtyToTake,
            quantityOut: 0,
            remainingBalance: newStock,
            unit: ing.unit || 'units',
            cost: qtyToTake * costToTake,
            referenceNumber: targetPo.poNumber || targetPo.id,
            user: actualReceiver,
            notes: `PO #${targetPo.poNumber} Intake for Kitchen Recipe Ingredient`
          });

          newLogs.unshift({
            id: `log-po-ing-${Date.now()}-${poItem.itemId}`,
            itemId: ing.id,
            itemName: ing.name,
            type: 'Purchase',
            quantityChange: qtyToTake,
            previousStock: prevStock,
            newStock: newStock,
            sourceLocation: 'Supplier',
            targetLocation: 'Kitchen Stock',
            reason: `Kitchen Raw Ingredient Intake (PO #${targetPo.poNumber} - ${targetPo.supplierName})`,
            timestamp: new Date().toISOString(),
            actor: actualReceiver
          });
        } else {
          // Check if item matches a Menu Item (Beverage or Dish)
          const menuIdx = updatedMenuItems.findIndex(m => 
            m.id === poItem.itemId || 
            m.name.toLowerCase() === poItem.itemName.toLowerCase()
          );

          if (menuIdx > -1) {
            const item = updatedMenuItems[menuIdx];

            if (poItem.destination === 'Main Beverage Stock') {
              const prevMain = item.mainStockQuantity || 0;
              const newMain = prevMain + qtyToTake;
              updatedMenuItems[menuIdx] = {
                ...item,
                mainStockQuantity: newMain
              };
              newLogs.unshift({
                id: `log-po-${Date.now()}-${poItem.itemId}`,
                itemId: item.id,
                itemName: item.name,
                type: 'Purchase',
                quantityChange: qtyToTake,
                previousStock: prevMain,
                newStock: newMain,
                sourceLocation: 'Supplier',
                targetLocation: 'Main Beverage Stock',
                reason: `Purchased to Main Beverage Stock (PO #${targetPo.poNumber} - ${targetPo.supplierName})`,
                timestamp: new Date().toISOString(),
                actor: actualReceiver
              });
            } else if (poItem.destination === 'Bar Stock') {
              const prevBar = item.stockQuantity || 0;
              const newBar = prevBar + qtyToTake;
              updatedMenuItems[menuIdx] = {
                ...item,
                stockQuantity: newBar,
                status: newBar > 0 ? 'Available' : 'Out of Stock'
              };
              newLogs.unshift({
                id: `log-po-${Date.now()}-${poItem.itemId}`,
                itemId: item.id,
                itemName: item.name,
                type: 'Purchase',
                quantityChange: qtyToTake,
                previousStock: prevBar,
                newStock: newBar,
                sourceLocation: 'Supplier',
                targetLocation: 'Bar Stock',
                reason: `Purchased direct to Bar Stock (PO #${targetPo.poNumber} - ${targetPo.supplierName})`,
                timestamp: new Date().toISOString(),
                actor: actualReceiver
              });
            } else {
              // Kitchen Stock
              const prevKitchen = item.stockQuantity || 0;
              const newKitchen = prevKitchen + qtyToTake;
              updatedMenuItems[menuIdx] = {
                ...item,
                stockQuantity: newKitchen,
                status: newKitchen > 0 ? 'Available' : 'Out of Stock'
              };
              newLogs.unshift({
                id: `log-po-${Date.now()}-${poItem.itemId}`,
                itemId: item.id,
                itemName: item.name,
                type: 'Purchase',
                quantityChange: qtyToTake,
                previousStock: prevKitchen,
                newStock: newKitchen,
                sourceLocation: 'Supplier',
                targetLocation: 'Kitchen Stock',
                reason: `Purchased to Kitchen Stock (PO #${targetPo.poNumber} - ${targetPo.supplierName})`,
                timestamp: new Date().toISOString(),
                actor: actualReceiver
              });
            }
          } else if (poItem.destination === 'Kitchen Stock' || targetPo.department === 'Kitchen') {
            // Custom / Raw Kitchen material purchase -> create/register ingredient
            const newIng: KitchenIngredient = {
              id: poItem.itemId && poItem.itemId !== 'custom' ? poItem.itemId : `ing-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: poItem.itemName,
              category: 'Other Raw Materials',
              stockQuantity: qtyToTake,
              unit: 'units',
              costPerUnit: costToTake,
              minStockAlert: 5,
              storageLocation: 'Kitchen Pantry',
              status: qtyToTake > 0 ? 'Available' : 'Out of Stock'
            };
            updatedIngredients.push(newIng);

            const nowPo = new Date();
            newMovements.unshift({
              id: `mvt-po-${Date.now()}-${poItem.itemId}`,
              date: nowPo.toISOString().split('T')[0],
              time: nowPo.toTimeString().split(' ')[0],
              timestamp: nowPo.toISOString(),
              ingredientId: newIng.id,
              ingredientName: newIng.name,
              department: 'Kitchen',
              movementType: 'Purchase',
              quantityIn: qtyToTake,
              quantityOut: 0,
              remainingBalance: qtyToTake,
              unit: newIng.unit,
              cost: qtyToTake * costToTake,
              referenceNumber: targetPo.poNumber || targetPo.id,
              user: actualReceiver,
              notes: `New Kitchen Item Intake via PO #${targetPo.poNumber}`
            });
          }
        }
      }

      const prevReceivedQty = poItem.receivedQuantity || 0;
      const newTotalReceivedQty = isTicked ? prevReceivedQty + qtyToTake : prevReceivedQty;
      const isFullyReceivedNow = newTotalReceivedQty >= poItem.quantity;

      return {
        ...poItem,
        unitCost: costToTake,
        totalCost: poItem.quantity * costToTake,
        receivedQuantity: newTotalReceivedQty,
        received: isFullyReceivedNow
      };
    });

    const allFullyReceived = updatedPoItems.every(i => i.received === true);
    const anyReceived = updatedPoItems.some(i => (i.receivedQuantity || 0) > 0);

    const finalStatus: 'Pending' | 'Partially Received' | 'Received' = allFullyReceived
      ? 'Received'
      : anyReceived
      ? 'Partially Received'
      : 'Pending';

    const updatedPOs: PurchaseOrder[] = activePOs.map(p => {
      if (p.id === poId) {
        return {
          ...p,
          items: updatedPoItems,
          totalAmount: updatedPoItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0),
          status: finalStatus,
          receivedAt: new Date().toISOString(),
          receivedByName: actualReceiver
        };
      }
      return p;
    });

    setPurchaseOrders(updatedPOs);
    savePurchaseOrders(updatedPOs);
    updateIngredientsState(updatedIngredients);
    saveStockMovementRecords(newMovements);
    updateMenuItemsState(updatedMenuItems);
    updateStockLogsState(newLogs);

    if (currentUser) {
      addAuditLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        action: 'Received Purchase Order',
        category: 'Inventory',
        details: `Accepted/Received PO #${targetPo.poNumber} from ${targetPo.supplierName}. Stock updated automatically.`
      });
    }
  };

  // Open New Shift
  const handleOpenShift = (cashierName: string, openingCash: number, customBusinessDate?: string) => {
    const maxShiftNum = shifts.reduce((max, s) => Math.max(max, s.shiftNumber || 0), 249);
    const nextShiftNumber = maxShiftNum + 1;
    const busDate = customBusinessDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const newShift: Shift = {
      id: `sh-${nextShiftNumber}`,
      shiftNumber: nextShiftNumber,
      businessDate: busDate,
      cashierName,
      cashierId: currentUser ? currentUser.id : `c-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openedBy: currentUser ? currentUser.fullName : cashierName,
      openedById: currentUser?.id,
      openingCash,
      status: 'Open'
    };

    updateCurrentShiftState(newShift);
    updateShiftsState([newShift, ...shifts]);

    // Record Opening Cash Movement
    addCashMovement({
      amount: openingCash,
      movementType: 'Opening Cash',
      reason: `Shift #${nextShiftNumber} Opened (${busDate}) - Float Cash $${openingCash.toFixed(2)}`,
      user: cashierName,
      shiftId: newShift.id,
      businessDate: busDate,
      referenceId: newShift.id
    });
    setCashMovements(loadCashMovements());
  };

  // Close Active Shift
  const handleCloseShift = (actualCash: number, notes?: string) => {
    if (!currentShift) return;

    const shiftOrders = orders.filter(o => o.shiftId === currentShift.id);
    const paidShiftOrders = shiftOrders.filter(o => o.status === 'Paid' || o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY PAID');
    const cashCollected = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.cashPaid || 0) - (o.paymentDetails?.changeGiven || 0), 0);
    const cardCollected = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.cardPaid || 0), 0);
    const momoCollected = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.mobileMoneyPaid || 0), 0);
    const roomCollected = paidShiftOrders.reduce((sum, o) => sum + (o.paymentDetails?.roomChargeAmount || 0), 0);
    const creditSalesTotal = shiftOrders.filter(o => o.paymentStatus === 'CREDIT').reduce((sum, o) => sum + (o.balance > 0 ? o.balance : o.total), 0);

    const shiftExpensesList = expenses.filter(e => e.shiftId === currentShift.id || (e.date && e.date.startsWith(currentShift.businessDate || '')));
    const totalExp = shiftExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const expectedCash = currentShift.openingCash + cashCollected - totalExp;
    const diff = actualCash - expectedCash;

    const closedShift: Shift = {
      ...currentShift,
      closedAt: new Date().toISOString(),
      closedBy: currentUser ? currentUser.fullName : currentShift.cashierName,
      closedById: currentUser?.id,
      closingCashExpected: expectedCash,
      closingCashActual: actualCash,
      difference: diff,
      status: 'Closed',
      notes,
      summary: {
        totalSales: paidShiftOrders.reduce((sum, o) => sum + o.total, 0),
        cashSales: cashCollected,
        cardSales: cardCollected,
        mobileMoneySales: momoCollected,
        creditSales: creditSalesTotal,
        discountsTotal: paidShiftOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
        taxesTotal: 0,
        serviceChargesTotal: 0,
        expensesTotal: totalExp,
        openingCash: currentShift.openingCash,
        expectedCash: expectedCash,
        actualCash: actualCash,
        difference: diff,
        totalOrdersCount: shiftOrders.length,
        cancelledOrdersCount: shiftOrders.filter(o => o.status === 'Cancelled').length,
        voidedOrdersCount: 0,
        kitchenOrdersCount: kitchenTickets.filter(k => k.shiftId === currentShift.id).length,
        inventoryConsumptionCost: 0,
        estimatedProfit: paidShiftOrders.reduce((sum, o) => sum + o.total, 0) - totalExp
      }
    };

    const updatedAllShifts = shifts.map(s => s.id === closedShift.id ? closedShift : s);
    updateShiftsState(updatedAllShifts);
    updateCurrentShiftState(null);

    // Auto-export Shift Closing PDF
    try {
      exportShiftReportPDF(closedShift, orders);
    } catch (e) {
      console.error('Error auto-exporting shift PDF:', e);
    }

    // Record Closing Cash Movement
    addCashMovement({
      amount: actualCash,
      movementType: 'Closing Cash',
      reason: `Shift #${closedShift.shiftNumber || closedShift.id} Closed - Drawer Cash $${actualCash.toFixed(2)}`,
      user: currentShift.cashierName,
      shiftId: currentShift.id,
      businessDate: currentShift.businessDate,
      referenceId: currentShift.id
    });
    setCashMovements(loadCashMovements());

    // Record Daily Closing Reconciliation Record
    addDailyClosing({
      date: currentShift.businessDate || new Date().toISOString().split('T')[0],
      closedBy: currentShift.cashierName,
      shiftId: currentShift.id,
      openingCash: currentShift.openingCash,
      cashSales: cashCollected,
      cardSales: cardCollected,
      mobileMoneySales: momoCollected,
      creditSales: creditSalesTotal,
      expensesTotal: totalExp,
      creditCollectedTotal: 0,
      outstandingCredit: creditSalesTotal,
      cashDeposited: actualCash,
      expectedCash,
      actualCash,
      difference: diff,
      differenceReason: notes || (diff === 0 ? 'Balanced' : `Discrepancy of RWF ${diff}`),
      approvedBy: currentUser?.fullName || 'Manager',
      varianceStatus: diff === 0 ? 'Approved' : 'Pending Review'
    });
    setDailyClosings(loadDailyClosings());
  };

  // Reopen Shift (Admin / Super Admin Only)
  const handleReopenShift = (shiftId: string) => {
    const targetShift = shifts.find(s => s.id === shiftId);
    if (!targetShift) return;

    const reopenedShift: Shift = {
      ...targetShift,
      status: 'Open',
      reopenedAt: new Date().toISOString(),
      reopenedBy: currentUser ? currentUser.fullName : 'Admin'
    };

    const updatedAllShifts = shifts.map(s => s.id === shiftId ? reopenedShift : s);
    updateShiftsState(updatedAllShifts);
    updateCurrentShiftState(reopenedShift);
  };

  // Manager Actions
  const handleSaveMenuItem = (item: MenuItem) => {
    const exists = menuItems.some(m => m.id === item.id);
    if (exists) {
      updateMenuItemsState(menuItems.map(m => m.id === item.id ? item : m));
    } else {
      updateMenuItemsState([...menuItems, item]);
    }
  };

  const handleDeleteMenuItem = (itemId: string) => {
    if (confirm('Delete this menu item from catalog?')) {
      updateMenuItemsState(menuItems.filter(m => m.id !== itemId));
    }
  };

  const handleSaveWaiter = (waiter: Waiter) => {
    const exists = waiters.some(w => w.id === waiter.id);
    if (exists) {
      updateWaitersState(waiters.map(w => w.id === waiter.id ? waiter : w));
    } else {
      updateWaitersState([...waiters, waiter]);
    }
  };

  const handleSaveTable = (table: Table) => {
    const exists = tables.some(t => t.id === table.id);
    let updatedTables: Table[];
    if (exists) {
      updatedTables = tables.map(t => t.id === table.id ? table : t);
    } else {
      updatedTables = [...tables, table];
    }
    updateTablesState(updatedTables);
    addAuditLog({
      userId: currentUser?.id || 'sys',
      userName: currentUser?.fullName || 'Manager',
      userRole: currentUser?.role || 'Admin',
      userEmail: currentUser?.email || '',
      action: exists ? 'Update Table' : 'Create Table',
      category: 'Tables',
      details: `${exists ? 'Updated' : 'Created'} Table ${table.tableNumber} (${table.tableTag})`
    });
  };

  const handleDeleteTable = (tableId: string) => {
    const tableToDelete = tables.find(t => t.id === tableId);
    if (!tableToDelete) return;

    // Active order check
    const hasActiveOrders = orders.some(o => 
      (o.tableId === tableId || o.tableNumber === tableToDelete.tableNumber) && 
      o.status !== 'Paid' && 
      o.status !== 'Cancelled'
    );

    if (hasActiveOrders) {
      alert('This table has active orders and cannot be deleted.');
      return;
    }

    const updatedTables = tables.filter(t => t.id !== tableId);
    updateTablesState(updatedTables);
    addAuditLog({
      userId: currentUser?.id || 'sys',
      userName: currentUser?.fullName || 'Manager',
      userRole: currentUser?.role || 'Admin',
      userEmail: currentUser?.email || '',
      action: 'Delete Table',
      category: 'Tables',
      details: `Deleted Table ${tableToDelete.tableNumber} (${tableToDelete.tableTag})`
    });
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      resetAllDataToDefault();
      window.location.reload();
    }
  };

  // Unauthenticated Guard
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} darkMode={darkMode} />;
  }

  // Pending counts
  const pendingKitchenCount = kitchenTickets.filter(k => k.status === 'Pending' || k.status === 'Preparing').length;
  const unpaidOrdersCount = orders.filter(o => o.paymentStatus !== 'PAID' && o.status !== 'Cancelled').length;
  const lowStockCount = menuItems.filter(m => m.stockQuantity <= (m.minStockAlert || 5) && m.status === 'Available').length;
  const pendingWaiterOrders = orders.filter(o => (o.status === 'Pending' || o.paymentStatus === 'UNPAID') && o.status !== 'Cancelled');

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>

      {/* Database Sync Status Banner */}
      {isDbLoading ? (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting to central database & syncing business records...</span>
          </div>
          <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Database Live</span>
        </div>
      ) : dbSyncError ? (
        <div className="bg-rose-900/90 text-rose-100 border-b border-rose-700 px-4 py-2 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>Database Connection Notice: {dbSyncError}</span>
          </div>
          <button 
            onClick={async () => {
              setIsDbLoading(true);
              setDbSyncError(null);
              await pullServerState();
              await pullAllFromSupabase();
              refreshAllStateFromStorage();
              setIsDbLoading(false);
            }}
            className="flex items-center space-x-1 bg-rose-700 hover:bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-semibold transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : null}

      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-black flex flex-col sm:flex-row items-center justify-between shadow-lg sticky top-0 z-50 border-b border-amber-600 gap-2">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 animate-bounce text-slate-950 shrink-0" />
            <span>Offline Mode — Network disconnected. System operating in local safe mode. Pending changes will auto-synchronize when connection is restored.</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] bg-slate-950 text-amber-400 font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Offline Queue Active
            </span>
          </div>
        </div>
      )}
      
      {/* Top Header */}
      <Header
        currentShift={currentShift}
        userRole={userRole}
        setUserRole={setUserRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        language={language}
        setLanguage={setLanguage}
        lowStockCount={lowStockCount}
        openShiftModal={() => setActiveTab('shifts')}
        onNavigateToStock={() => setActiveTab('stock')}
      />

      {/* Main Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingKitchenCount={pendingKitchenCount}
        unpaidOrdersCount={unpaidOrdersCount}
        lowStockCount={lowStockCount}
        userRole={userRole}
        darkMode={darkMode}
        language={language}
      />

      {/* Primary Module Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Live Waiter Order Notification Banner for Cashiers */}
        {pendingWaiterOrders.length > 0 && (userRole === 'Cashier' || userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager') && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/80 dark:border-amber-400 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0 animate-bounce">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black flex items-center gap-2">
                  <span>{pendingWaiterOrders.length} Pending Waiter Order(s) Received!</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black uppercase tracking-wider">
                    Cashier Alert
                  </span>
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                  Latest: <strong>{pendingWaiterOrders[0].orderNumber}</strong> by Waiter <strong>{pendingWaiterOrders[0].waiterName}</strong> for Table <strong>{pendingWaiterOrders[0].tableNumber || 'Bar / Counter'}</strong> ({formatCurrency(pendingWaiterOrders[0].total)})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={() => setActiveTab('order_center')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all"
              >
                View Order Center & Receive Payment
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            orders={orders}
            tables={tables}
            kitchenTickets={kitchenTickets}
            menuItems={menuItems}
            currentShift={currentShift}
            setActiveTab={setActiveTab}
            darkMode={darkMode}
            language={language}
          />
        )}

        {activeTab === 'order_center' && (
          <OrderCenterList
            orders={orders}
            tables={tables}
            waiters={waiters}
            menuItems={menuItems}
            guestRooms={guestRooms}
            cashierName={currentShift?.cashierName || currentUser?.fullName || 'Cashier'}
            userRole={userRole}
            darkMode={darkMode}
            onUpdateOrder={handleUpdateOrder}
            onSaveOrderEdits={handleSaveOrderEdits}
            onCancelOrderAndReturnStock={handleCancelOrderAndReturnStock}
            onDeleteOrderAndReturnStock={handleDeleteOrderAndReturnStock}
            onPrintReceipt={(ord) => setReceiptOrder(ord)}
            onOpenPosForNewOrder={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'pos' && (
          <PosTerminal
            menuItems={menuItems}
            tables={tables}
            waiters={waiters}
            guestRooms={guestRooms}
            ingredients={ingredients}
            currentShift={currentShift}
            onOrderCompleted={handleOrderCompleted}
            darkMode={darkMode}
            currentUser={currentUser}
            openShiftModal={() => setActiveTab('shifts')}
            language={language}
          />
        )}

        {activeTab === 'tables' && (
          <TablesGrid
            tables={tables}
            waiters={waiters}
            orders={orders}
            onUpdateTableStatus={handleUpdateTableStatus}
            onOpenTableOrder={handleOpenTableOrder}
            onSaveTable={handleSaveTable}
            onDeleteTable={handleDeleteTable}
            currentUser={currentUser}
            userRole={userRole}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'kitchen' && (
          <KitchenTickets
            kitchenTickets={kitchenTickets}
            orders={orders}
            onUpdateStatus={handleUpdateKitchenStatus}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'ingredients' && (
          <IngredientsModule
            ingredients={ingredients}
            recipes={recipes}
            stockMovements={stockMovements}
            wasteRecords={wasteRecords}
            onSaveIngredients={handleSaveIngredients}
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'recipe_management' && (
          <RecipeModule
            recipes={recipes}
            ingredients={ingredients}
            menuItems={menuItems}
            onSaveRecipes={handleSaveRecipesList}
            onSaveMenuItems={updateMenuItemsState}
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'menu_management' && (
          <MenuModule
            menuItems={menuItems}
            recipes={recipes}
            onSaveMenuItems={updateMenuItemsState}
            onSaveRecipes={handleSaveRecipesList}
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'pool_sauna' && (
          <PoolSaunaModule
            menuItems={menuItems}
            currentShift={currentShift}
            onTicketSold={(order) => handleOrderCompleted(order)}
            darkMode={darkMode}
            openShiftModal={() => setActiveTab('shifts')}
          />
        )}

        {activeTab === 'shifts' && (
          <ShiftManager
            currentShift={currentShift}
            allShifts={shifts}
            orders={orders}
            expenses={expenses}
            kitchenTickets={kitchenTickets}
            currentUser={currentUser}
            userRole={userRole}
            onOpenShift={handleOpenShift}
            onCloseShift={handleCloseShift}
            onReopenShift={handleReopenShift}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'stock' && (
          <StockManagement
            menuItems={menuItems}
            stockLogs={stockLogs}
            purchaseOrders={purchaseOrders}
            orders={orders}
            tables={tables}
            waiters={waiters}
            ingredients={ingredients}
            stockMovements={stockMovements}
            wasteRecords={wasteRecords}
            onSaveIngredients={handleSaveIngredients}
            onSaveRecipe={handleSaveRecipe}
            onAddWasteRecord={handleAddWasteRecord}
            onUpdateStock={handleUpdateStock}
            onUpdateMainStock={handleUpdateMainStock}
            onUpdateKitchenStock={handleUpdateKitchenStock}
            onTransferStock={handleTransferStock}
            onCreatePurchaseOrder={handleCreatePurchaseOrder}
            onReceivePurchaseOrder={handleReceivePurchaseOrder}
            onEditPurchaseOrder={handleEditPurchaseOrder}
            onDeletePurchaseOrder={handleDeletePurchaseOrder}
            onNavigateToOrders={() => setActiveTab('order_center')}
            darkMode={darkMode}
            language={language}
            loggedInUser={currentUser || undefined}
          />
        )}

        {activeTab === 'report' && (
          <DailyReportView
            orders={orders}
            menuItems={menuItems}
            stockLogs={stockLogs}
            currentShift={currentShift}
            allShifts={shifts}
            guestRooms={guestRooms}
            expenses={expenses}
            cashMovements={cashMovements}
            dailyClosings={dailyClosings}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
            onAddCashMovement={handleAddCashMovement}
            onUpdateOrder={handleUpdateOrder}
            onPrintReceipt={(ord) => setReceiptOrder(ord)}
            onUpdateDailyClosing={(updatedClosings) => updateDailyClosingsState(updatedClosings)}
            darkMode={darkMode}
            language={language}
          />
        )}

        {activeTab === 'hr_payroll' && (
          <HRManagement
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'whatsapp_reports' && (
          <WhatsAppAutomationCenter
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenter
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalWorkflowCenter
            loggedInUser={currentUser || undefined}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'products_services' && (userRole === 'Manager' || userRole === 'Super Admin') && (
          <ProductServiceManager
            menuItems={menuItems}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'users' && (userRole === 'Manager' || userRole === 'Super Admin') && (
          <UserManagement
            currentUser={currentUser}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'audit_logs' && (userRole === 'Manager' || userRole === 'Super Admin') && (
          <AuditLogView
            darkMode={darkMode}
          />
        )}

        {activeTab === 'settings' && (userRole === 'Manager' || userRole === 'Super Admin') && (
          <ManagerSettings
            menuItems={menuItems}
            waiters={waiters}
            onSaveMenuItem={handleSaveMenuItem}
            onDeleteMenuItem={handleDeleteMenuItem}
            onSaveWaiter={handleSaveWaiter}
            onResetData={handleResetData}
            darkMode={darkMode}
          />
        )}
      </main>

      {/* Thermal Receipt Printable Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
          darkMode={darkMode}
        />
      )}

      {/* In-App Quick Notification Drawer */}
      <InAppNotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onOpenNotificationCenter={() => setActiveTab('notifications')}
        darkMode={darkMode}
      />

      {/* Manual WhatsApp Report Modal */}
      <ManualReportSendModal
        isOpen={manualReportModal.isOpen}
        onClose={() => setManualReportModal({ ...manualReportModal, isOpen: false })}
        reportTitle={manualReportModal.title}
        darkMode={darkMode}
      />

    </div>
  );
}

