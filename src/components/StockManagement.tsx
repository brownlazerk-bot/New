import React, { useState, useMemo } from 'react';
import { 
  PackageCheck, AlertTriangle, Plus, Minus, Trash2, Edit3, X,
  Search, RefreshCw, FileText, ArrowUpRight, ArrowDownRight, History,
  Clock, ShoppingBag, Eye, ExternalLink, ShieldAlert, CheckCircle2, AlertCircle, Layers,
  Calendar, Download, ArrowRight, Printer, CheckSquare, Square, Utensils, Wine, Filter, Check,
  ArrowRightLeft, Store, Boxes, Truck, ArrowDownToLine, Building2, Sparkles, Lightbulb, ShoppingCart
} from 'lucide-react';
import { MenuItem, StockAdjustmentLog, Order, Table, Waiter, AppUser, PurchaseOrder, KitchenIngredient, RecipeIngredient, StockMovementRecord, KitchenWasteRecord } from '../types';
import { formatCurrency } from '../lib/currency';
import { calculateStockMovementsForDate, ItemStockMovement } from '../lib/stockMovement';
import { printReportHTML } from '../lib/exporter';
import { KitchenRecipeManager } from './KitchenRecipeManager';

import { Language, getTranslation } from '../lib/translations';

export const isKitchenItem = (item: MenuItem | ItemStockMovement | { category: string; productSection?: string; isFood?: boolean }): boolean => {
  const section = 'productSection' in item ? (item as any).productSection : undefined;
  return item.category === 'Food' || section === 'Kitchen Menu' || (item as any).isFood === true;
};

export const isBarItem = (item: MenuItem | ItemStockMovement | { category: string; productSection?: string; isFood?: boolean }): boolean => {
  if (isKitchenItem(item)) return false;
  const section = 'productSection' in item ? (item as any).productSection : undefined;
  return (
    section === 'Bar Menu' ||
    ['Beers', 'Soft Drinks', 'Wines', 'Whisky', 'Cocktails', 'Juices', 'Water', 'Coffee', 'Tea'].includes(item.category)
  );
};

interface StockManagementProps {
  menuItems: MenuItem[];
  stockLogs: StockAdjustmentLog[];
  purchaseOrders?: PurchaseOrder[];
  orders?: Order[];
  tables?: Table[];
  waiters?: Waiter[];
  onUpdateStock: (itemId: string, qtyChange: number, type: StockAdjustmentLog['type'], reason: string) => void;
  onUpdateMainStock?: (
    itemId: string,
    newMainQty: number,
    reason: string,
    additionalEdits?: { price?: number; costPrice?: number; unit?: string; minStockAlert?: number }
  ) => void;
  onUpdateKitchenStock?: (
    itemId: string,
    newKitchenQty: number,
    reason: string,
    additionalEdits?: { price?: number; costPrice?: number; unit?: string; minStockAlert?: number }
  ) => void;
  onTransferStock?: (itemId: string, quantity: number, reason: string) => void;
  onCreatePurchaseOrder?: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'timestamp'>) => void;
  onReceivePurchaseOrder?: (poId: string) => void;
  onEditPurchaseOrder?: (poId: string, updatedPO: Partial<PurchaseOrder>) => void;
  onDeletePurchaseOrder?: (poId: string) => void;
  onNavigateToOrders?: () => void;
  ingredients?: KitchenIngredient[];
  stockMovements?: StockMovementRecord[];
  wasteRecords?: KitchenWasteRecord[];
  onSaveIngredients?: (ingredients: KitchenIngredient[]) => void;
  onSaveRecipe?: (menuItemId: string, recipe: RecipeIngredient[]) => void;
  onAddWasteRecord?: (waste: Omit<KitchenWasteRecord, 'id' | 'timestamp' | 'date'>) => KitchenWasteRecord;
  darkMode: boolean;
  language?: Language;
  loggedInUser?: AppUser;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  menuItems,
  stockLogs,
  purchaseOrders = [],
  orders = [],
  tables = [],
  waiters = [],
  ingredients = [],
  stockMovements = [],
  wasteRecords = [],
  onSaveIngredients,
  onSaveRecipe,
  onAddWasteRecord,
  onUpdateStock,
  onUpdateMainStock,
  onUpdateKitchenStock,
  onTransferStock,
  onCreatePurchaseOrder,
  onReceivePurchaseOrder,
  onEditPurchaseOrder,
  onDeletePurchaseOrder,
  onNavigateToOrders,
  darkMode,
  language = 'rw',
  loggedInUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'main_beverage' | 'kitchen_stock' | 'recipes_ingredients' | 'purchasing' | 'transfers_log' | 'available' | 'unpaid_reserved' | 'reconciliation' | 'logs'
  >('main_beverage');

  // Main Beverage Stock Console / Recording & Edit State
  const [showMainStockModal, setShowMainStockModal] = useState<boolean>(false);
  const [mainStockItemId, setMainStockItemId] = useState<string>('');
  const [mainStockMode, setMainStockMode] = useState<'set' | 'add' | 'subtract'>('set');
  const [mainStockQuantityValue, setMainStockQuantityValue] = useState<number>(0);
  const [mainStockReason, setMainStockReason] = useState<string>('Physical Store Inventory Count');
  const [mainStockPrice, setMainStockPrice] = useState<number>(0);
  const [mainStockCostPrice, setMainStockCostPrice] = useState<number>(0);
  const [mainStockUnit, setMainStockUnit] = useState<string>('bottle');
  const [mainStockMinAlert, setMainStockMinAlert] = useState<number>(10);

  // Stock Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferItemId, setTransferItemId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<number>(10);
  const [transferReason, setTransferReason] = useState<string>('Exported to Bar Stock');

  // Purchase Order Modal State
  const [showPOModal, setShowPOModal] = useState<boolean>(false);
  const [poDepartment, setPoDepartment] = useState<'Bar / Beverage' | 'Kitchen'>('Bar / Beverage');
  const [poSupplier, setPoSupplier] = useState<string>('');
  const [poItemId, setPoItemId] = useState<string>('');
  const [poQuantity, setPoQuantity] = useState<number>(50);
  const [poUnitCost, setPoUnitCost] = useState<number>(800);
  const [poDestination, setPoDestination] = useState<'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock'>('Main Beverage Stock');
  const [poPaymentStatus, setPoPaymentStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [autoReceive, setAutoReceive] = useState<boolean>(true);

  // Edit Purchase Order Console Modal State
  const [showEditPOModal, setShowEditPOModal] = useState<boolean>(false);
  const [editingPoId, setEditingPoId] = useState<string>('');
  const [editPoSupplier, setEditPoSupplier] = useState<string>('');
  const [editPoDepartment, setEditPoDepartment] = useState<'Bar / Beverage' | 'Kitchen'>('Bar / Beverage');
  const [editPoPaymentStatus, setEditPoPaymentStatus] = useState<'Paid' | 'Unpaid'>('Paid');
  const [editPoStatus, setEditPoStatus] = useState<'Pending' | 'Received'>('Pending');
  const [editPoNotes, setEditPoNotes] = useState<string>('');
  const [editPoItems, setEditPoItems] = useState<{ itemId: string; itemName: string; category: string; quantity: number; unitCost: number; totalCost: number; destination: 'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock' }[]>([]);

  // Kitchen Stock Console / Recording & Edit State
  const [showKitchenStockModal, setShowKitchenStockModal] = useState<boolean>(false);
  const [kitchenStockItemId, setKitchenStockItemId] = useState<string>('');
  const [kitchenStockMode, setKitchenStockMode] = useState<'set' | 'add' | 'subtract'>('set');
  const [kitchenStockQuantityValue, setKitchenStockQuantityValue] = useState<number>(0);
  const [kitchenStockReason, setKitchenStockReason] = useState<string>('Kitchen Store Audit');
  const [kitchenStockPrice, setKitchenStockPrice] = useState<number>(0);
  const [kitchenStockCostPrice, setKitchenStockCostPrice] = useState<number>(0);
  const [kitchenStockUnit, setKitchenStockUnit] = useState<string>('portions');
  const [kitchenStockMinAlert, setKitchenStockMinAlert] = useState<number>(5);

  // Reorder Assistant / What Should We Order State
  const [reorderFilter, setReorderFilter] = useState<'all' | 'out_of_stock' | 'bar' | 'kitchen'>('all');
  const [reorderSearch, setReorderSearch] = useState<string>('');

  // Compute unavailable (out of stock) and low stock items needing order
  const unavailableItems = useMemo(() => {
    return menuItems.map(item => {
      const isBar = isBarItem(item);
      const mainQty = item.mainStockQuantity || 0;
      const barQty = item.stockQuantity || 0;
      const totalQty = isBar ? (mainQty + barQty) : item.stockQuantity;
      const minAlert = item.minStockAlert || 5;
      const isOut = totalQty <= 0;
      const isLow = totalQty > 0 && totalQty <= minAlert;

      return {
        item,
        isBar,
        mainQty,
        barQty,
        totalQty,
        minAlert,
        isOut,
        isLow,
        needsOrder: isOut || isLow,
        suggestedQty: isBar ? (isOut ? 100 : 50) : (isOut ? 30 : 15),
        unitCost: item.costPrice || Math.round(item.price * 0.6)
      };
    }).filter(x => x.needsOrder);
  }, [menuItems]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [reconciliationDate, setReconciliationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  // Department filter for reconciliation sheet
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'All' | 'Kitchen' | 'Bar' | 'Other'>('All');
  
  // Custom item selection mode
  const [customSelectMode, setCustomSelectMode] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printDeptSelection, setPrintDeptSelection] = useState<'All' | 'Kitchen' | 'Bar' | 'Other' | 'Custom'>('All');
  const [printPaperFormat, setPrintPaperFormat] = useState<'80mm' | 'A4'>('80mm');
  const [printHideZeroMovement, setPrintHideZeroMovement] = useState<boolean>(false);
  const [printIncludeValues, setPrintIncludeValues] = useState<boolean>(true);
  const [printIncludeSignatures, setPrintIncludeSignatures] = useState<boolean>(true);

  // Toggle single item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Select handlers
  const handleSelectAllFiltered = (filteredMovements: ItemStockMovement[]) => {
    setSelectedItemIds(new Set(filteredMovements.map(m => m.itemId)));
  };

  const handleSelectKitchenOnly = () => {
    const stockMovements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
    setSelectedItemIds(new Set(stockMovements.filter(m => isKitchenItem(m)).map(m => m.itemId)));
  };

  const handleSelectBarOnly = () => {
    const stockMovements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
    setSelectedItemIds(new Set(stockMovements.filter(m => isBarItem(m)).map(m => m.itemId)));
  };

  const handleSelectActiveOnly = () => {
    const stockMovements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
    setSelectedItemIds(new Set(stockMovements.filter(m => 
      m.openingStock > 0 || m.receivedStock > 0 || m.soldStock > 0 || m.adjustments !== 0 || m.closingStock > 0
    ).map(m => m.itemId)));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Execution of print action
  const handlePrintStockBalanceSheet = () => {
    const allMovements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
    
    let itemsToPrint = allMovements;

    // Apply department filter
    if (printDeptSelection === 'Kitchen') {
      itemsToPrint = itemsToPrint.filter(m => isKitchenItem(m));
    } else if (printDeptSelection === 'Bar') {
      itemsToPrint = itemsToPrint.filter(m => isBarItem(m));
    } else if (printDeptSelection === 'Other') {
      itemsToPrint = itemsToPrint.filter(m => !isKitchenItem(m) && !isBarItem(m));
    } else if (printDeptSelection === 'Custom') {
      if (selectedItemIds.size > 0) {
        itemsToPrint = itemsToPrint.filter(m => selectedItemIds.has(m.itemId));
      }
    }

    // Apply zero movement filter
    if (printHideZeroMovement) {
      itemsToPrint = itemsToPrint.filter(m => 
        m.openingStock > 0 || m.receivedStock > 0 || m.soldStock > 0 || m.adjustments !== 0 || m.closingStock > 0
      );
    }

    const deptTitle = printDeptSelection === 'Kitchen' ? 'Kitchen / Igikoni' :
                      printDeptSelection === 'Bar' ? 'Bar & Beverage / Akabari' :
                      printDeptSelection === 'Other' ? 'Other Services' :
                      printDeptSelection === 'Custom' ? `Custom Selected (${itemsToPrint.length} Items)` :
                      'All Departments';

    const totOpening = itemsToPrint.reduce((sum, m) => sum + m.openingStock, 0);
    const totReceived = itemsToPrint.reduce((sum, m) => sum + m.receivedStock, 0);
    const totSold = itemsToPrint.reduce((sum, m) => sum + m.soldStock, 0);
    const totAdjustments = itemsToPrint.reduce((sum, m) => sum + m.adjustments, 0);
    const totClosing = itemsToPrint.reduce((sum, m) => sum + m.closingStock, 0);
    const totValue = itemsToPrint.reduce((sum, m) => sum + m.dispatchedValue, 0);

    const staffName = loggedInUser?.fullName || 'Manager / Store Keeper';
    const printTime = new Date().toLocaleTimeString();

    if (printPaperFormat === '80mm') {
      // Thermal 80mm
      const html = `
        <style>
          @page { size: 80mm auto; margin: 0mm !important; }
          @media print {
            @page { size: 80mm auto; margin: 0mm !important; }
            html, body { width: 72.1mm !important; max-width: 72.1mm !important; margin: 0 auto !important; padding: 0 !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72.1mm;
            margin: 0 auto;
            padding: 2mm 0;
            color: #000000;
            font-size: 10px;
            line-height: 1.25;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 4px; }
          th { border-bottom: 1px solid #000; padding: 2px 1px; font-weight: 900; text-align: right; }
          th:first-child { text-align: left; }
          td { padding: 2px 1px; text-align: right; border-bottom: 1px dotted #888; }
          td:first-child { text-align: left; font-weight: bold; }
        </style>

        <div style="text-align: center; margin-bottom: 6px;">
          <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">SEVEN TO SEVEN</div>
          <div style="font-size: 11px; font-weight: bold;">Sky View Resort</div>
          <div style="font-size: 11px; font-weight: 900; margin: 3px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; text-transform: uppercase;">
            DAILY STOCK BALANCE SHEET
          </div>
          <div style="font-size: 10px; font-weight: 900; margin-top: 2px; text-transform: uppercase;">
            SECTION: ${deptTitle}
          </div>
          <div style="font-size: 9px; margin-top: 2px;">
            DATE: ${reconciliationDate} | PRINT: ${printTime}
          </div>
          <div style="font-size: 9px;">
            STAFF: ${staffName}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>OPN</th>
              <th>IN</th>
              <th>OUT</th>
              <th>CLS</th>
              ${printIncludeValues ? `<th>VAL</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint.map(m => `
              <tr>
                <td>${m.itemName}</td>
                <td>${m.openingStock}</td>
                <td>${m.receivedStock > 0 ? `+${m.receivedStock}` : '0'}</td>
                <td>${m.soldStock > 0 ? `-${m.soldStock}` : '0'}</td>
                <td style="font-weight: 900;">${m.closingStock}</td>
                ${printIncludeValues ? `<td>${m.dispatchedValue.toLocaleString()}</td>` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 2px solid #000; margin-top: 6px; padding-top: 4px; font-size: 9px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>TOTAL ITEMS:</span> <span>${itemsToPrint.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>OPENING STOCK:</span> <span>${totOpening}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>RECEIVED (+):</span> <span>+${totReceived}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>SOLD (-):</span> <span>-${totSold}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>ADJUSTMENTS:</span> <span>${totAdjustments >= 0 ? `+${totAdjustments}` : totAdjustments}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 900; border-top: 1px dashed #000; padding-top: 2px; margin-top: 2px;">
            <span>CLOSING STOCK:</span> <span>${totClosing}</span>
          </div>
          ${printIncludeValues ? `
          <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; margin-top: 3px; border-top: 1px solid #000; padding-top: 2px;">
            <span>TOTAL SALES:</span> <span>RWF ${totValue.toLocaleString()}</span>
          </div>
          ` : ''}
        </div>

        ${printIncludeSignatures ? `
        <div style="border-top: 1px dashed #000; margin-top: 15px; padding-top: 8px; font-size: 9px;">
          <div style="margin-bottom: 15px;">Stock Keeper: ___________________</div>
          <div>Manager Sign: ___________________</div>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 12px; font-size: 8px; border-top: 1px dotted #888; padding-top: 4px;">
          Seven to Seven • Sky View Resort
        </div>
      `;

      printReportHTML(`Stock Balance Sheet - ${reconciliationDate}`, html);
    } else {
      // Standard A4 Format
      const html = `
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; margin: 0; padding: 10px; }
          .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 10px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 8px; font-weight: bold; text-align: center; }
          td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: center; }
          td.item-name { text-align: left; font-weight: bold; }
          .total-row { background: #f9fafb; font-weight: bold; border-top: 2px solid #111827; font-size: 12px; }
        </style>

        <div class="header">
          <h1 style="font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase;">SEVEN TO SEVEN</h1>
          <h3 style="font-size: 14px; margin: 2px 0 8px 0; color: #4b5563;">Sky View Resort • Kamonyi-Runda</h3>
          <div style="font-size: 13px; font-weight: 900; background: #111827; color: #ffffff; padding: 4px 12px; display: inline-block; border-radius: 4px; text-transform: uppercase;">
            DAILY STOCK BALANCE SHEET & RECONCILIATION
          </div>
          <div style="font-size: 12px; font-weight: bold; margin-top: 8px;">
            DEPARTMENT: ${deptTitle.toUpperCase()}
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: #6b7280;">
            Target Date: <strong>${reconciliationDate}</strong> | Printed On: ${new Date().toLocaleString()} | Printed By: <strong>${staffName}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Item Name</th>
              <th style="text-align: left;">Category</th>
              <th>Opening</th>
              <th style="color: #059669;">+ Received</th>
              <th style="color: #d97706;">- Sold</th>
              <th>± Adjustments</th>
              <th style="color: #0284c7;">= Closing</th>
              ${printIncludeValues ? `<th style="text-align: right;">Sales Value (RWF)</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint.map(m => `
              <tr>
                <td class="item-name">${m.itemName}</td>
                <td style="text-align: left;">${m.category}</td>
                <td>${m.openingStock}</td>
                <td style="color: #059669; font-weight: bold;">${m.receivedStock > 0 ? `+${m.receivedStock}` : '0'}</td>
                <td style="color: #d97706; font-weight: bold;">${m.soldStock > 0 ? `-${m.soldStock}` : '0'}</td>
                <td>${m.adjustments >= 0 ? `+${m.adjustments}` : m.adjustments}</td>
                <td style="font-weight: 900; color: #0284c7;">${m.closingStock}</td>
                ${printIncludeValues ? `<td style="text-align: right; font-weight: bold;">${m.dispatchedValue.toLocaleString()}</td>` : ''}
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" style="text-align: left; padding: 10px;">GRAND TOTALS (${itemsToPrint.length} Items)</td>
              <td>${totOpening}</td>
              <td style="color: #059669;">+${totReceived}</td>
              <td style="color: #d97706;">-${totSold}</td>
              <td>${totAdjustments >= 0 ? `+${totAdjustments}` : totAdjustments}</td>
              <td style="color: #0284c7; font-size: 14px;">${totClosing}</td>
              ${printIncludeValues ? `<td style="text-align: right; color: #059669; font-size: 14px;">RWF ${totValue.toLocaleString()}</td>` : ''}
            </tr>
          </tbody>
        </table>

        ${printIncludeSignatures ? `
        <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <div style="text-align: center; width: 40%;">
            <div style="border-bottom: 1px solid #111827; margin-bottom: 6px; height: 35px;"></div>
            <strong>Stock Keeper / Store Officer</strong>
            <div style="font-size: 10px; color: #6b7280;">Sign & Date</div>
          </div>
          <div style="text-align: center; width: 40%;">
            <div style="border-bottom: 1px solid #111827; margin-bottom: 6px; height: 35px;"></div>
            <strong>Hotel Manager / Supervisor</strong>
            <div style="font-size: 10px; color: #6b7280;">Sign & Date</div>
          </div>
        </div>
        ` : ''}
      `;

      printReportHTML(`Stock Balance Sheet - ${reconciliationDate}`, html);
    }

    setShowPrintModal(false);
  };

  // Open Record & Edit Main Beverage Stock Console Modal
  const openMainStockModal = (item?: MenuItem) => {
    const barItems = menuItems.filter(m => isBarItem(m));
    const target = item || (barItems.length > 0 ? barItems[0] : null);
    if (target) {
      setMainStockItemId(target.id);
      setMainStockQuantityValue(target.mainStockQuantity || 0);
      setMainStockPrice(target.price || 0);
      setMainStockCostPrice(target.costPrice || Math.round(target.price * 0.6));
      setMainStockUnit(target.unit || 'bottle');
      setMainStockMinAlert(target.minStockAlert || 10);
    }
    setMainStockMode('set');
    setMainStockReason('Physical Store Inventory Audit / Direct Recording');
    setShowMainStockModal(true);
  };

  const handleMainStockItemChange = (itemId: string) => {
    setMainStockItemId(itemId);
    const target = menuItems.find(m => m.id === itemId);
    if (target) {
      setMainStockQuantityValue(target.mainStockQuantity || 0);
      setMainStockPrice(target.price || 0);
      setMainStockCostPrice(target.costPrice || Math.round(target.price * 0.6));
      setMainStockUnit(target.unit || 'bottle');
      setMainStockMinAlert(target.minStockAlert || 10);
    }
  };

  const handleMainStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainStockItemId) {
      alert('Please select a beverage product.');
      return;
    }

    const targetItem = menuItems.find(m => m.id === mainStockItemId);
    if (!targetItem) return;

    const currentMain = targetItem.mainStockQuantity || 0;
    let finalQty = mainStockQuantityValue;

    if (mainStockMode === 'add') {
      finalQty = currentMain + mainStockQuantityValue;
    } else if (mainStockMode === 'subtract') {
      finalQty = Math.max(0, currentMain - mainStockQuantityValue);
    }

    if (onUpdateMainStock) {
      onUpdateMainStock(mainStockItemId, finalQty, mainStockReason, {
        price: mainStockPrice,
        costPrice: mainStockCostPrice,
        unit: mainStockUnit,
        minStockAlert: mainStockMinAlert
      });
    } else {
      const diff = finalQty - currentMain;
      onUpdateStock(mainStockItemId, diff, 'Adjustment', `[Main Beverage Stock Console] ${mainStockReason}`);
    }

    setShowMainStockModal(false);
    alert(`Main Beverage Stock for "${targetItem.name}" updated successfully to ${finalQty} ${mainStockUnit}s!`);
  };

  // Open Record & Edit Kitchen Stock Console Modal
  const openKitchenStockModal = (item?: MenuItem) => {
    const kitchenItems = menuItems.filter(m => isKitchenItem(m));
    const target = item || (kitchenItems.length > 0 ? kitchenItems[0] : null);
    if (target) {
      setKitchenStockItemId(target.id);
      setKitchenStockQuantityValue(target.stockQuantity || 0);
      setKitchenStockPrice(target.price || 0);
      setKitchenStockCostPrice(target.costPrice || Math.round(target.price * 0.6));
      setKitchenStockUnit(target.unit || 'portions');
      setKitchenStockMinAlert(target.minStockAlert || 5);
    }
    setKitchenStockMode('set');
    setKitchenStockReason('Kitchen Store Physical Audit / Direct Recording');
    setShowKitchenStockModal(true);
  };

  const handleKitchenStockItemChange = (itemId: string) => {
    setKitchenStockItemId(itemId);
    const target = menuItems.find(m => m.id === itemId);
    if (target) {
      setKitchenStockQuantityValue(target.stockQuantity || 0);
      setKitchenStockPrice(target.price || 0);
      setKitchenStockCostPrice(target.costPrice || Math.round(target.price * 0.6));
      setKitchenStockUnit(target.unit || 'portions');
      setKitchenStockMinAlert(target.minStockAlert || 5);
    }
  };

  const handleKitchenStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchenStockItemId) {
      alert('Please select a kitchen item.');
      return;
    }

    const targetItem = menuItems.find(m => m.id === kitchenStockItemId);
    if (!targetItem) return;

    const currentQty = targetItem.stockQuantity || 0;
    let finalQty = kitchenStockQuantityValue;

    if (kitchenStockMode === 'add') {
      finalQty = currentQty + kitchenStockQuantityValue;
    } else if (kitchenStockMode === 'subtract') {
      finalQty = Math.max(0, currentQty - kitchenStockQuantityValue);
    }

    if (onUpdateKitchenStock) {
      onUpdateKitchenStock(kitchenStockItemId, finalQty, kitchenStockReason, {
        price: kitchenStockPrice,
        costPrice: kitchenStockCostPrice,
        unit: kitchenStockUnit,
        minStockAlert: kitchenStockMinAlert
      });
    } else {
      const diff = finalQty - currentQty;
      onUpdateStock(kitchenStockItemId, diff, 'Adjustment', `[Kitchen Stock Console] ${kitchenStockReason}`);
    }

    setShowKitchenStockModal(false);
    alert(`Kitchen Stock for "${targetItem.name}" updated successfully to ${finalQty} ${kitchenStockUnit}!`);
  };

  // Open Edit Purchase Order Console Modal
  const openEditPOModal = (po: PurchaseOrder) => {
    setEditingPoId(po.id);
    setEditPoSupplier(po.supplierName);
    setEditPoDepartment(po.department);
    setEditPoPaymentStatus(po.paymentStatus || 'Paid');
    setEditPoStatus(po.status);
    setEditPoNotes(po.notes || '');
    setEditPoItems([...po.items]);
    setShowEditPOModal(true);
  };

  const handleEditPOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoId) return;

    const totalAmt = editPoItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0);

    if (onEditPurchaseOrder) {
      onEditPurchaseOrder(editingPoId, {
        supplierName: editPoSupplier,
        department: editPoDepartment,
        paymentStatus: editPoPaymentStatus,
        status: editPoStatus,
        notes: editPoNotes,
        items: editPoItems,
        totalAmount: totalAmt
      });
    }

    setShowEditPOModal(false);
    alert('Purchase Order updated successfully!');
  };

  // Print Main Beverage Stock Report
  const handlePrintMainStockReport = () => {
    const mainItems = menuItems.filter(m => isBarItem(m));
    const totalLines = mainItems.length;
    const totalQty = mainItems.reduce((acc, m) => acc + (m.mainStockQuantity || 0), 0);
    const totalCostValue = mainItems.reduce((acc, m) => acc + ((m.mainStockQuantity || 0) * (m.costPrice || Math.round(m.price * 0.6))), 0);
    const totalRetailValue = mainItems.reduce((acc, m) => acc + ((m.mainStockQuantity || 0) * m.price), 0);

    const staffName = loggedInUser?.fullName || 'Store Keeper / Manager';

    const html = `
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 8px; margin-bottom: 12px; }
        .kpi-grid { display: flex; justify-content: space-around; background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px; margin-bottom: 12px; border-radius: 4px; }
        .kpi-box { text-align: center; }
        .kpi-val { font-size: 14px; font-weight: bold; color: #000; }
        .kpi-lbl { font-size: 9px; color: #4b5563; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
        th { background: #1e293b; color: #ffffff; border: 1px solid #0f172a; padding: 6px 8px; font-weight: bold; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a; }
      </style>

      <div class="header">
        <h1 style="font-size: 20px; font-weight: 900; margin: 0;">SEVEN TO SEVEN - SKY VIEW RESORT</h1>
        <h3 style="font-size: 13px; margin: 2px 0 6px 0; color: #374151;">MAIN BEVERAGE STORE INVENTORY REPORT</h3>
        <div style="font-size: 10px; color: #6b7280;">
          Generated: ${new Date().toLocaleString()} | Printed By: <strong>${staffName}</strong>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><div class="kpi-val">${totalLines}</div><div class="kpi-lbl">Product Lines</div></div>
        <div class="kpi-box"><div class="kpi-val">${totalQty}</div><div class="kpi-lbl">Total Units in Main Store</div></div>
        <div class="kpi-box"><div class="kpi-val">RWF ${totalCostValue.toLocaleString()}</div><div class="kpi-lbl">Total Store Cost Value</div></div>
        <div class="kpi-box"><div class="kpi-val">RWF ${totalRetailValue.toLocaleString()}</div><div class="kpi-lbl">Potential Retail Sales</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th class="text-center">Main Store Qty</th>
            <th class="text-center">Unit</th>
            <th class="text-right">Unit Cost</th>
            <th class="text-right">Selling Price</th>
            <th class="text-right">Total Cost Value</th>
            <th class="text-right">Potential Retail Value</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${mainItems.map(m => {
            const qty = m.mainStockQuantity || 0;
            const cost = m.costPrice || Math.round(m.price * 0.6);
            const totCost = qty * cost;
            const totRetail = qty * m.price;
            const isOut = qty <= 0;
            const isLow = qty > 0 && qty <= (m.minStockAlert || 10);
            return `
              <tr>
                <td style="font-weight: bold;">${m.name}</td>
                <td>${m.category}</td>
                <td class="text-center" style="font-weight: bold; ${isOut ? 'color: red;' : ''}">${qty}</td>
                <td class="text-center">${m.unit || 'pcs'}</td>
                <td class="text-right">RWF ${cost.toLocaleString()}</td>
                <td class="text-right">RWF ${m.price.toLocaleString()}</td>
                <td class="text-right" style="font-weight: bold;">RWF ${totCost.toLocaleString()}</td>
                <td class="text-right" style="font-weight: bold;">RWF ${totRetail.toLocaleString()}</td>
                <td class="text-center" style="font-weight: bold; color: ${isOut ? 'red' : isLow ? 'orange' : 'green'};">
                  ${isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'OK'}
                </td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="2">TOTAL STORE SUMMARY</td>
            <td class="text-center">${totalQty}</td>
            <td colspan="3"></td>
            <td class="text-right">RWF ${totalCostValue.toLocaleString()}</td>
            <td class="text-right">RWF ${totalRetailValue.toLocaleString()}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px dashed #94a3b8; margin-top: 25px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px;">
        <div>Store Keeper Sign: ___________________________</div>
        <div>Manager Verification: ___________________________</div>
      </div>
    `;

    printReportHTML(`Main Store Report - ${new Date().toISOString().split('T')[0]}`, html);
  };

  // Print Kitchen Stock Inventory Report
  const handlePrintKitchenStockReport = () => {
    const kitchenItems = menuItems.filter(m => isKitchenItem(m));
    const totalLines = kitchenItems.length;
    const totalQty = kitchenItems.reduce((acc, m) => acc + (m.stockQuantity || 0), 0);
    const totalValuation = kitchenItems.reduce((acc, m) => acc + ((m.stockQuantity || 0) * (m.costPrice || Math.round(m.price * 0.6))), 0);

    const staffName = loggedInUser?.fullName || 'Kitchen Chef / Store Keeper';

    const html = `
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 8px; margin-bottom: 12px; }
        .kpi-grid { display: flex; justify-content: space-around; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px; margin-bottom: 12px; border-radius: 4px; }
        .kpi-box { text-align: center; }
        .kpi-val { font-size: 14px; font-weight: bold; color: #065f46; }
        .kpi-lbl { font-size: 9px; color: #047857; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
        th { background: #064e3b; color: #ffffff; border: 1px solid #022c22; padding: 6px 8px; font-weight: bold; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { background: #f0fdf4; font-weight: bold; border-top: 2px solid #064e3b; }
      </style>

      <div class="header">
        <h1 style="font-size: 20px; font-weight: 900; margin: 0;">SEVEN TO SEVEN - SKY VIEW RESORT</h1>
        <h3 style="font-size: 13px; margin: 2px 0 6px 0; color: #047857;">KITCHEN STORE & INGREDIENT INVENTORY REPORT</h3>
        <div style="font-size: 10px; color: #6b7280;">
          Generated: ${new Date().toLocaleString()} | Printed By: <strong>${staffName}</strong>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><div class="kpi-val">${totalLines}</div><div class="kpi-lbl">Kitchen Items</div></div>
        <div class="kpi-box"><div class="kpi-val">${totalQty}</div><div class="kpi-lbl">Total Kitchen Units</div></div>
        <div class="kpi-box"><div class="kpi-val">RWF ${totalValuation.toLocaleString()}</div><div class="kpi-lbl">Total Kitchen Valuation</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item / Ingredient Name</th>
            <th>Category</th>
            <th class="text-center">Kitchen Stock Qty</th>
            <th class="text-center">Unit</th>
            <th class="text-right">Unit Cost</th>
            <th class="text-right">Total Cost Value</th>
            <th class="text-center">Min Alert</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${kitchenItems.map(m => {
            const qty = m.stockQuantity || 0;
            const cost = m.costPrice || Math.round(m.price * 0.6);
            const totCost = qty * cost;
            const minAlert = m.minStockAlert || 5;
            const isOut = qty <= 0;
            const isLow = qty > 0 && qty <= minAlert;
            return `
              <tr>
                <td style="font-weight: bold;">${m.name}</td>
                <td>${m.category}</td>
                <td class="text-center" style="font-weight: bold; ${isOut ? 'color: red;' : ''}">${qty}</td>
                <td class="text-center">${m.unit || 'portions'}</td>
                <td class="text-right">RWF ${cost.toLocaleString()}</td>
                <td class="text-right" style="font-weight: bold;">RWF ${totCost.toLocaleString()}</td>
                <td class="text-center">${minAlert}</td>
                <td class="text-center" style="font-weight: bold; color: ${isOut ? 'red' : isLow ? 'orange' : 'green'};">
                  ${isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'AVAILABLE'}
                </td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="2">TOTAL KITCHEN SUMMARY</td>
            <td class="text-center">${totalQty}</td>
            <td colspan="2"></td>
            <td class="text-right">RWF ${totalValuation.toLocaleString()}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px dashed #94a3b8; margin-top: 25px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px;">
        <div>Head Chef Sign: ___________________________</div>
        <div>Store Keeper Sign: ___________________________</div>
      </div>
    `;

    printReportHTML(`Kitchen Stock Report - ${new Date().toISOString().split('T')[0]}`, html);
  };

  // Print Purchases & Goods Intake Report
  const handlePrintPurchasesReport = () => {
    const totalPOs = purchaseOrders.length;
    const receivedPOs = purchaseOrders.filter(p => p.status === 'Received');
    const pendingPOs = purchaseOrders.filter(p => p.status === 'Pending');
    const totalSpend = purchaseOrders.reduce((acc, p) => acc + p.totalAmount, 0);
    const paidSpend = purchaseOrders.filter(p => p.paymentStatus === 'Paid').reduce((acc, p) => acc + p.totalAmount, 0);
    const unpaidSpend = purchaseOrders.filter(p => p.paymentStatus === 'Unpaid').reduce((acc, p) => acc + p.totalAmount, 0);

    const staffName = loggedInUser?.fullName || 'Purchasing Manager / Store Keeper';

    const html = `
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111827; margin: 0; padding: 10px; }
        .header { text-align: center; border-bottom: 3px double #111827; padding-bottom: 8px; margin-bottom: 12px; }
        .kpi-grid { display: flex; justify-content: space-around; background: #f0f9ff; border: 1px solid #bae6fd; padding: 8px; margin-bottom: 12px; border-radius: 4px; }
        .kpi-box { text-align: center; }
        .kpi-val { font-size: 14px; font-weight: bold; color: #0369a1; }
        .kpi-lbl { font-size: 9px; color: #0284c7; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
        th { background: #075985; color: #ffffff; border: 1px solid #0c4a6e; padding: 6px 8px; font-weight: bold; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 5px 8px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row { background: #f0f9ff; font-weight: bold; border-top: 2px solid #075985; }
      </style>

      <div class="header">
        <h1 style="font-size: 20px; font-weight: 900; margin: 0;">SEVEN TO SEVEN - SKY VIEW RESORT</h1>
        <h3 style="font-size: 13px; margin: 2px 0 6px 0; color: #0284c7;">PURCHASING & GOODS INTAKE SUMMARY REPORT</h3>
        <div style="font-size: 10px; color: #6b7280;">
          Generated: ${new Date().toLocaleString()} | Printed By: <strong>${staffName}</strong>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><div class="kpi-val">${totalPOs}</div><div class="kpi-lbl">Total Purchase Orders</div></div>
        <div class="kpi-box"><div class="kpi-val">${receivedPOs.length} / ${pendingPOs.length}</div><div class="kpi-lbl">Received / Pending</div></div>
        <div class="kpi-box"><div class="kpi-val">RWF ${totalSpend.toLocaleString()}</div><div class="kpi-lbl">Total Purchase Spend</div></div>
        <div class="kpi-box"><div class="kpi-val">RWF ${paidSpend.toLocaleString()}</div><div class="kpi-lbl">Paid Spend</div></div>
        <div class="kpi-box"><div class="kpi-val" style="color: #dc2626;">RWF ${unpaidSpend.toLocaleString()}</div><div class="kpi-lbl">Credit / Unpaid</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th>PO Number & Date</th>
            <th>Supplier Name</th>
            <th>Department</th>
            <th>Purchased Items</th>
            <th class="text-center">Destination</th>
            <th class="text-right">Total Amount</th>
            <th class="text-center">Fulfillment Status</th>
            <th class="text-center">Payment Status</th>
          </tr>
        </thead>
        <tbody>
          ${purchaseOrders.length === 0 ? `
            <tr><td colspan="8" class="text-center">No Purchase Orders Recorded</td></tr>
          ` : purchaseOrders.map(po => `
            <tr>
              <td style="font-weight: bold;">${po.poNumber}<br/><span style="font-size: 9px; color: #64748b;">${po.date}</span></td>
              <td style="font-weight: bold; color: #0284c7;">${po.supplierName}</td>
              <td>${po.department}</td>
              <td>
                ${po.items.map(it => `<div>• ${it.itemName} (${it.quantity} @ RWF ${it.unitCost.toLocaleString()})</div>`).join('')}
              </td>
              <td class="text-center" style="font-weight: bold;">${po.items[0]?.destination || 'Store'}</td>
              <td class="text-right" style="font-weight: bold;">RWF ${po.totalAmount.toLocaleString()}</td>
              <td class="text-center" style="font-weight: bold; color: ${po.status === 'Received' ? 'green' : 'orange'};">
                ${po.status === 'Received' ? '✓ Received' : '⏳ Pending'}
              </td>
              <td class="text-center" style="font-weight: bold; color: ${po.paymentStatus === 'Paid' ? 'green' : 'red'};">
                ${po.paymentStatus || 'Paid'}
              </td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">TOTAL PURCHASING SPEND</td>
            <td class="text-right">RWF ${totalSpend.toLocaleString()}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <div style="border-top: 1px dashed #94a3b8; margin-top: 25px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px;">
        <div>Purchasing Officer Sign: ___________________________</div>
        <div>Auditor / Accountant Sign: ___________________________</div>
      </div>
    `;

    printReportHTML(`Purchases Report - ${new Date().toISOString().split('T')[0]}`, html);
  };

  // Open Stock Transfer Modal
  const openTransferModal = (item?: MenuItem) => {
    const barItems = menuItems.filter(m => isBarItem(m));
    const target = item || barItems[0];
    if (target) {
      setTransferItemId(target.id);
    }
    setTransferQuantity(10);
    setTransferReason('Exported from Main Beverage Stock to Bar');
    setShowTransferModal(true);
  };

  // Submit Stock Transfer (Main Beverage Stock -> Bar)
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemId) {
      alert('Please select an item to transfer.');
      return;
    }
    if (transferQuantity <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }

    if (onTransferStock) {
      onTransferStock(transferItemId, transferQuantity, transferReason);
      setShowTransferModal(false);
    } else {
      alert('Stock transfer function is not available.');
    }
  };

  // Open PO Modal with optional preselected item
  const openPOModal = (
    dept: 'Bar / Beverage' | 'Kitchen' = 'Bar / Beverage',
    itemToPreselect?: MenuItem,
    suggestedQty: number = 50,
    defaultSupplier?: string
  ) => {
    setPoDepartment(dept);
    const deptItems = menuItems.filter(m => dept === 'Kitchen' ? isKitchenItem(m) : isBarItem(m));
    const target = itemToPreselect || (deptItems.length > 0 ? deptItems[0] : null);
    if (target) {
      setPoItemId(target.id);
      setPoUnitCost(target.costPrice || Math.round(target.price * 0.6));
    }
    setPoSupplier(defaultSupplier || (dept === 'Bar / Beverage' ? 'Bralirwa / Wholesale Distributor' : 'Local Food Supplier'));
    setPoQuantity(suggestedQty);
    setPoDestination(dept === 'Kitchen' ? 'Kitchen Stock' : 'Main Beverage Stock');
    setShowPOModal(true);
  };

  // Bulk Reorder All Out-Of-Stock Items
  const handleBulkReorderUnavailable = () => {
    const outOfStockOnly = unavailableItems.filter(x => x.isOut);
    if (outOfStockOnly.length === 0) {
      alert('There are no items currently completely out of stock!');
      return;
    }

    if (onCreatePurchaseOrder) {
      const itemsList = outOfStockOnly.map(x => ({
        itemId: x.item.id,
        itemName: x.item.name,
        category: x.item.category,
        quantity: x.suggestedQty,
        unitCost: x.unitCost,
        totalCost: x.suggestedQty * x.unitCost,
        destination: (x.isBar ? 'Main Beverage Stock' : 'Kitchen Stock') as 'Main Beverage Stock' | 'Bar Stock' | 'Kitchen Stock'
      }));

      const totalCost = itemsList.reduce((acc, i) => acc + i.totalCost, 0);

      const createdPO = onCreatePurchaseOrder({
        poNumber: `PO-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        supplierName: 'Automated Multi-Item Supplier Intake',
        department: 'Bar / Beverage',
        items: itemsList,
        totalAmount: totalCost,
        status: 'Received',
        paymentStatus: 'Paid',
        createdByName: loggedInUser?.fullName || 'Storekeeper',
        receivedAt: new Date().toISOString(),
        receivedByName: loggedInUser?.fullName || 'Storekeeper',
        notes: `Bulk automated purchase for ${outOfStockOnly.length} out-of-stock items`
      });

      if (onReceivePurchaseOrder && createdPO) {
        onReceivePurchaseOrder(createdPO.id);
      }

      alert(`Successfully created and accepted bulk purchase order for ${outOfStockOnly.length} out-of-stock items! Stock updated automatically.`);
    }
  };

  // Submit Purchase Order
  const handlePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier.trim()) {
      alert('Please enter supplier name.');
      return;
    }
    if (!poItemId) {
      alert('Please select an item.');
      return;
    }
    if (poQuantity <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    const item = menuItems.find(m => m.id === poItemId);
    if (!item) return;

    if (onCreatePurchaseOrder) {
      const createdPO = onCreatePurchaseOrder({
        poNumber: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        supplierName: poSupplier.trim(),
        department: poDepartment,
        items: [{
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          quantity: poQuantity,
          unitCost: poUnitCost,
          totalCost: poQuantity * poUnitCost,
          destination: poDepartment === 'Kitchen' ? 'Kitchen Stock' : poDestination
        }],
        totalAmount: poQuantity * poUnitCost,
        status: autoReceive ? 'Received' : 'Pending',
        paymentStatus: poPaymentStatus,
        createdByName: loggedInUser?.fullName || 'Storekeeper',
        receivedAt: autoReceive ? new Date().toISOString() : undefined,
        receivedByName: autoReceive ? (loggedInUser?.fullName || 'Storekeeper') : undefined,
        notes: `Purchase for ${item.name} (${poQuantity} ${item.unit || 'pcs'})`
      });

      if (autoReceive && onReceivePurchaseOrder && createdPO) {
        onReceivePurchaseOrder(createdPO.id);
      }

      setShowPOModal(false);
      setPoSupplier('');
    }
  };
  
  // Stock Intake/Adjustment Modal
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentLog['type']>('Purchase');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  // Selected reserved item modal
  const [inspectReservedItem, setInspectReservedItem] = useState<{
    item: MenuItem;
    reservedQty: number;
    reservedValue: number;
    holdingOrders: {
      order: Order;
      qty: number;
      total: number;
    }[];
  } | null>(null);

  const categories = ['All', 'Beers', 'Soft Drinks', 'Wines', 'Whisky', 'Cocktails', 'Juices', 'Water', 'Coffee', 'Tea', 'Food'];

  // Filter Active Unpaid Orders (Ordered but not yet paid)
  const activeUnpaidOrders = orders.filter(
    o => o.paymentStatus !== 'PAID' && o.status !== 'Paid' && o.status !== 'Cancelled'
  );

  // Map Reserved Stock per MenuItem
  const reservedStockMap: Record<string, {
    reservedQty: number;
    reservedValue: number;
    holdingOrders: { order: Order; qty: number; total: number }[];
  }> = {};

  activeUnpaidOrders.forEach(ord => {
    ord.items.forEach(item => {
      if (!reservedStockMap[item.itemId]) {
        reservedStockMap[item.itemId] = {
          reservedQty: 0,
          reservedValue: 0,
          holdingOrders: []
        };
      }
      reservedStockMap[item.itemId].reservedQty += item.quantity;
      reservedStockMap[item.itemId].reservedValue += (item.unitPrice * item.quantity);
      reservedStockMap[item.itemId].holdingOrders.push({
        order: ord,
        qty: item.quantity,
        total: item.unitPrice * item.quantity
      });
    });
  });

  // Calculate Metrics
  const totalAvailableUnits = menuItems.reduce((acc, m) => acc + (m.stockQuantity || 0), 0);
  const totalReservedUnits = Object.values(reservedStockMap).reduce((acc, r) => acc + r.reservedQty, 0);
  const totalReservedValue = Object.values(reservedStockMap).reduce((acc, r) => acc + r.reservedValue, 0);
  const lowStockCount = menuItems.filter(m => m.stockQuantity <= (m.minStockAlert || 5) && m.status === 'Available').length;

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Reserved items list
  const reservedItemsList = menuItems.map(item => {
    const res = reservedStockMap[item.id] || { reservedQty: 0, reservedValue: 0, holdingOrders: [] };
    return {
      item,
      reservedQty: res.reservedQty,
      reservedValue: res.reservedValue,
      holdingOrders: res.holdingOrders
    };
  }).filter(r => r.reservedQty > 0);

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForModal) return;

    let qtyChange = Math.abs(adjustmentQuantity);
    if (adjustmentType === 'Waste' || adjustmentType === 'Damaged') {
      qtyChange = -qtyChange; // Deduct for waste or damage
    }

    onUpdateStock(
      selectedItemForModal.id,
      qtyChange,
      adjustmentType,
      adjustmentReason || `${adjustmentType} logged via Bar Stock Manager`
    );

    setSelectedItemForModal(null);
    setAdjustmentReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <PackageCheck className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Bar Stock & Inventory Control
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Real-time stock control, automated deduction on open orders, reserved unpaid items tracking, and stock audit history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stock by name or category..."
              className="px-3.5 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Available Bar Stock (In Fridge/Shelf)
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {totalAvailableUnits}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">units</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Reserved in Unpaid Orders
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">
                {activeUnpaidOrders.length} Open Orders
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                {totalReservedUnits}
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                units ({formatCurrency(totalReservedValue)})
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
              Total Physical Inventory Stock
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-lg font-black text-sky-700 dark:text-sky-300">
                {totalAvailableUnits}
              </span>
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">units total</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Low Stock Alerts
            </span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                {lowStockCount}
              </span>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">items low</span>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveSubTab('main_beverage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'main_beverage'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          <span>Main Beverage Stock (Store)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('kitchen_stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'kitchen_stock'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Utensils className="w-4 h-4 text-emerald-500" />
          <span>Kitchen Stock</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recipes_ingredients')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'recipes_ingredients'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Kitchen Recipes & Raw Ingredients (BOM)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('purchasing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'purchasing'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Truck className="w-4 h-4 text-sky-500" />
          <span>Purchasing & Goods Intake</span>
          {purchaseOrders.filter(p => p.status === 'Pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
              {purchaseOrders.filter(p => p.status === 'Pending').length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('transfers_log')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'transfers_log'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          <span>Stock Transfers Log</span>
        </button>

        <button
          onClick={() => setActiveSubTab('available')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'available'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Selling Bar Stock ({totalAvailableUnits})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('unpaid_reserved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'unpaid_reserved'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Unpaid Reserved ({totalReservedUnits})</span>
          {reservedItemsList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-600 text-white font-black">
              {reservedItemsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'reconciliation'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Daily Balance Sheet</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({stockLogs.length})</span>
        </button>
      </div>

      {/* VIEW: MAIN BEVERAGE STOCK (STORE) */}
      {activeSubTab === 'main_beverage' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900 p-5 rounded-2xl border border-indigo-500/20">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">Main Beverage Stock (Store / Warehouse)</h3>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1">
                Central warehouse stock for beverages (Beers, Wines, Liquors, Soft Drinks). Stock in Main Beverage Stock is transferred/exported to Bar Stock for sales.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintMainStockReport}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-2 border border-slate-700 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>🖨️ Main Stock Report</span>
              </button>
              <button
                onClick={() => openMainStockModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-slate-950" />
                <span>✏️ Record & Edit Main Stock</span>
              </button>
              <button
                onClick={() => openPOModal('Bar / Beverage')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>+ Intake New Purchasing</span>
              </button>
              <button
                onClick={() => openTransferModal()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Export / Transfer to Bar</span>
              </button>
            </div>
          </div>

          {/* Table of Beverage Items */}
          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search main beverage stock..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div className="text-xs font-bold text-indigo-400">
                Total Beverage Products: {menuItems.filter(m => isBarItem(m)).length}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Main Beverage Stock (Store)</th>
                    <th className="py-3 px-3 text-center">Bar Stock (Selling)</th>
                    <th className="py-3 px-3">Unit Price</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {menuItems.filter(m => isBarItem(m) && (m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase()))).map(item => {
                    const mainStock = item.mainStockQuantity || 0;
                    const barStock = item.stockQuantity || 0;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                          <div>
                            {item.name}
                            {item.unit && <span className="text-[10px] text-gray-400 ml-1">({item.unit})</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-medium">{item.category}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                            mainStock > 10
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : mainStock > 0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            <Building2 className="w-3 h-3 mr-1" />
                            {mainStock} {item.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                            barStock > 5
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            <Store className="w-3 h-3 mr-1" />
                            {barStock} {item.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => openMainStockModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] inline-flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                              title="Edit / Record Main Beverage Stock"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Edit Main Stock</span>
                            </button>
                            <button
                              onClick={() => openTransferModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] inline-flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                              title="Export / Transfer to Bar Stock"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Export to Bar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: KITCHEN STOCK */}
      {activeSubTab === 'kitchen_stock' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-slate-900 p-5 rounded-2xl border border-emerald-500/20">
            <div>
              <div className="flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white">Kitchen Stock & Food Inventory</h3>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                Unified Kitchen Stock for raw materials, ingredients, and kitchen menu items. Direct gain upon purchasing.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintKitchenStockReport}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-2 border border-slate-700 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>🖨️ Kitchen Stock Report</span>
              </button>
              <button
                onClick={() => openKitchenStockModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-slate-950" />
                <span>✏️ Record & Edit Kitchen Stock</span>
              </button>
              <button
                onClick={() => openPOModal('Kitchen')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>+ Purchase Kitchen Stock</span>
              </button>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Food / Item Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Kitchen Stock Quantity</th>
                    <th className="py-3 px-3">Min Alert Level</th>
                    <th className="py-3 px-3">Selling Price</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {menuItems.filter(m => isKitchenItem(m)).map(item => {
                    const isLow = item.stockQuantity <= (item.minStockAlert || 5);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-gray-500 font-medium">{item.category}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                            isLow
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            <Utensils className="w-3 h-3 mr-1" />
                            {item.stockQuantity} {item.unit || 'portions'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 font-bold">{item.minStockAlert || 5}</td>
                        <td className="py-3 px-3 font-black text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => openKitchenStockModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                              title="Edit / Record Kitchen Stock"
                            >
                              <Boxes className="w-3.5 h-3.5" />
                              <span>Edit Kitchen Stock</span>
                            </button>
                            <button
                              onClick={() => openPOModal('Kitchen', item, 25)}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                              title="Purchase order restock"
                            >
                              Restock PO
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: KITCHEN RECIPES & RAW INGREDIENTS (BOM) */}
      {activeSubTab === 'recipes_ingredients' && (
        <KitchenRecipeManager
          menuItems={menuItems}
          ingredients={ingredients || []}
          stockMovements={stockMovements || []}
          wasteRecords={wasteRecords || []}
          onSaveIngredients={onSaveIngredients || (() => {})}
          onSaveRecipe={onSaveRecipe || (() => {})}
          onAddWasteRecord={onAddWasteRecord}
          loggedInUser={loggedInUser}
          darkMode={darkMode}
        />
      )}

      {/* VIEW: PURCHASING & GOODS INTAKE */}
      {activeSubTab === 'purchasing' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-sky-900/40 via-blue-900/20 to-slate-900 p-5 rounded-2xl border border-sky-500/20 shadow-xl">
            <div>
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-base text-white">Purchasing & Goods Intake</h3>
              </div>
              <p className="text-xs text-sky-200/80 mt-1">
                Record purchases from suppliers. Accepting or receiving an order automatically gains stock into the target location.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintPurchasesReport}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-2 border border-slate-700 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>🖨️ Purchases Report</span>
              </button>
              {unavailableItems.filter(x => x.isOut).length > 0 && (
                <button
                  onClick={handleBulkReorderUnavailable}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>⚡ 1-Click Order All Out-of-Stock ({unavailableItems.filter(x => x.isOut).length})</span>
                </button>
              )}
              <button
                onClick={() => openPOModal('Bar / Beverage')}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-sky-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Purchase Order</span>
              </button>
            </div>
          </div>

          {/* REORDER ASSISTANT / WHAT SHOULD WE ORDER? WIDGET */}
          <div className="p-5 rounded-2xl border bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white flex items-center gap-2">
                    <span>What Should We Order? (Ibyo Mwatumiza Muri Purchasing)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Reorder Assistant
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Items currently out of stock or low in stock. Select an item to instantly launch a Purchase Order.
                  </p>
                </div>
              </div>

              {/* Summary Stats Badges */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Out of Stock: <strong>{unavailableItems.filter(x => x.isOut).length}</strong></span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Low Stock: <strong>{unavailableItems.filter(x => x.isLow).length}</strong></span>
                </div>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Ask or search what we can order... (e.g. Primus, Heineken, Meat, Soda)"
                  value={reorderSearch}
                  onChange={(e) => setReorderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold bg-slate-800/80 border border-indigo-500/30 text-white placeholder-indigo-300/50 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setReorderFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reorderFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  All Needed ({unavailableItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReorderFilter('out_of_stock')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reorderFilter === 'out_of_stock'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  🔴 Out of Stock ({unavailableItems.filter(x => x.isOut).length})
                </button>
                <button
                  type="button"
                  onClick={() => setReorderFilter('bar')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reorderFilter === 'bar'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  🍺 Beverages ({unavailableItems.filter(x => x.isBar).length})
                </button>
                <button
                  type="button"
                  onClick={() => setReorderFilter('kitchen')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    reorderFilter === 'kitchen'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  🍳 Kitchen ({unavailableItems.filter(x => !x.isBar).length})
                </button>
              </div>
            </div>

            {/* List / Cards of Items needing order */}
            {(() => {
              const filteredList = unavailableItems.filter(x => {
                const matchesSearch = x.item.name.toLowerCase().includes(reorderSearch.toLowerCase()) ||
                  x.item.category.toLowerCase().includes(reorderSearch.toLowerCase());
                if (!matchesSearch) return false;

                if (reorderFilter === 'out_of_stock') return x.isOut;
                if (reorderFilter === 'bar') return x.isBar;
                if (reorderFilter === 'kitchen') return !x.isBar;
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h5 className="font-black text-sm text-white">All Items In This View Are Fully Stocked!</h5>
                    <p className="text-xs text-gray-400">No items match the selected filter or search criteria.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {filteredList.map(({ item, isBar, totalQty, isOut, suggestedQty, unitCost }) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isOut
                          ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400'
                          : 'bg-slate-800/60 border-amber-500/30 hover:border-amber-400'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.category}</span>
                            <h5 className="font-black text-sm text-white">{item.name}</h5>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            isOut ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          }`}>
                            {isOut ? 'OUT OF STOCK (0)' : `LOW STOCK (${totalQty})`}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 mb-3 text-gray-300">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Department:</span>
                            <span className="font-bold text-indigo-300">{isBar ? 'Main Beverage Store' : 'Kitchen'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Suggested Order:</span>
                            <span className="font-black text-amber-400">{suggestedQty} {item.unit || 'pcs'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Estimated Cost:</span>
                            <span className="font-black text-white">{formatCurrency(suggestedQty * unitCost)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openPOModal(isBar ? 'Bar / Beverage' : 'Kitchen', item, suggestedQty)}
                        className={`w-full py-2 rounded-lg font-black text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all ${
                          isOut
                            ? 'bg-rose-500 hover:bg-rose-400 text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Order Now ({suggestedQty} {item.unit || 'pcs'})</span>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">PO Number & Date</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Purchased Items</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Fulfillment Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No purchase orders recorded yet. Click "+ New Purchase Order" to create one.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                          <div>{po.poNumber}</div>
                          <div className="text-[10px] text-gray-400">{po.date}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-sky-400">{po.supplierName}</td>
                        <td className="py-3 px-3 font-medium text-gray-300">{po.department}</td>
                        <td className="py-3 px-3">
                          {po.items.map((it, idx) => (
                            <div key={idx} className="font-bold text-gray-800 dark:text-gray-200">
                              {it.itemName} ({it.quantity} @ {formatCurrency(it.unitCost)})
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-3 font-bold text-indigo-400">
                          {po.items[0]?.destination || 'Store'}
                        </td>
                        <td className="py-3 px-3 font-black text-gray-900 dark:text-white">
                          {formatCurrency(po.totalAmount)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            po.status === 'Received'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : po.status === 'Cancelled'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}>
                            {po.status === 'Received' ? '✓ Received (Stock Gained)' : po.status === 'Cancelled' ? '🚫 Cancelled' : '⏳ Pending Acceptance'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {po.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    if (confirm(`Accept & Receive Purchase Order #${po.poNumber} (${po.supplierName})?\n\nThis will automatically update the current stock in ${po.items[0]?.destination || 'inventory'}.`)) {
                                      onReceivePurchaseOrder && onReceivePurchaseOrder(po.id);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] inline-flex items-center space-x-1 shadow-md transition-all cursor-pointer"
                                  title="Accept order and intake stock into inventory"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Receive</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Cancel Purchase Order #${po.poNumber}?`)) {
                                      onEditPurchaseOrder && onEditPurchaseOrder(po.id, { status: 'Cancelled' });
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[11px] inline-flex items-center space-x-1 border border-amber-500/30 transition-all cursor-pointer"
                                  title="Cancel purchase order"
                                >
                                  <span>Cancel PO</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEditPOModal(po)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white font-bold text-[11px] inline-flex items-center space-x-1 shadow-sm transition-all cursor-pointer"
                              title="Edit purchase order details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit PO</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to permanently delete purchase order "${po.poNumber}"?`)) {
                                  onDeletePurchaseOrder && onDeletePurchaseOrder(po.id);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-[11px] inline-flex items-center space-x-1 border border-rose-500/30 transition-all cursor-pointer"
                              title="Delete purchase order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STOCK TRANSFERS LOG */}
      {activeSubTab === 'transfers_log' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/20 flex justify-between items-center">
            <div>
              <h3 className="font-black text-base text-white flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-purple-400" />
                <span>Stock Transfer Audit Log</span>
              </h3>
              <p className="text-xs text-purple-200/80 mt-1">
                History of stock movements from Main Beverage Stock to Bar Stock.
              </p>
            </div>
            <div className="text-xs font-bold text-purple-400">
              Total Transfers: {stockLogs.filter(l => l.type === 'Transfer').length}
            </div>
          </div>

          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Item Transferred</th>
                    <th className="py-3 px-3 text-center">Qty Transferred</th>
                    <th className="py-3 px-3">From Location</th>
                    <th className="py-3 px-3">To Location</th>
                    <th className="py-3 px-3">Operator</th>
                    <th className="py-3 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stockLogs.filter(l => l.type === 'Transfer').length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No stock transfers logged yet. Export stock from Main Beverage Stock to Bar to populate this history.
                      </td>
                    </tr>
                  ) : (
                    stockLogs.filter(l => l.type === 'Transfer').map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">{log.itemName}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300">
                            +{log.quantityChange} units
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-indigo-400">{log.sourceLocation || 'Main Beverage Stock'}</td>
                        <td className="py-3 px-3 font-bold text-amber-400">{log.targetLocation || 'Bar Stock'}</td>
                        <td className="py-3 px-3 font-bold text-gray-300">{log.actor}</td>
                        <td className="py-3 px-3 text-gray-400 italic">{log.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: AVAILABLE STOCK IN BAR */}
      {activeSubTab === 'available' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-8 p-5 rounded-2xl border transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Current Bar Available Stock</h3>
                <p className="text-[11px] text-gray-400">Items available in bar shelf ready for new orders (Unpaid ordered items are deducted & listed separately).</p>
              </div>
              
              {/* Category filter pills */}
              <div className="flex space-x-1 overflow-x-auto no-scrollbar max-w-full">
                {categories.slice(0, 7).map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                      selectedCategory === c ? 'bg-amber-500 text-slate-950' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-2">Item Name</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2">Price</th>
                    <th className="py-2.5 px-2">Available in Bar</th>
                    <th className="py-2.5 px-2">In Unpaid Orders</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map((item) => {
                    const isLow = item.stockQuantity <= (item.minStockAlert || 5);
                    const resInfo = reservedStockMap[item.id];
                    const reservedQty = resInfo ? resInfo.reservedQty : 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">
                          <div>
                            <span>{item.name}</span>
                            {item.unit && <span className="text-[10px] text-gray-400 ml-1">({item.unit})</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{item.category}</td>
                        <td className="py-3 px-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-flex items-center gap-1 ${
                            isLow 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300' 
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}>
                            {item.stockQuantity} {item.unit || 'pcs'}
                            {isLow && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {reservedQty > 0 ? (
                            <button
                              onClick={() => setInspectReservedItem({
                                item,
                                reservedQty,
                                reservedValue: resInfo.reservedValue,
                                holdingOrders: resInfo.holdingOrders
                              })}
                              className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center space-x-1 cursor-pointer"
                            >
                              <span>{reservedQty} in open orders</span>
                              <Eye className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => setSelectedItemForModal(item)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] transition-all shadow-xs cursor-pointer"
                          >
                            Adjust / Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Side Summary */}
          <div className={`lg:col-span-4 p-5 rounded-2xl border transition-colors space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>Unpaid Orders Summary</span>
            </h3>

            {activeUnpaidOrders.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center">
                All table orders are fully paid! No items held in open unpaid orders.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  There are currently <strong className="text-amber-500">{activeUnpaidOrders.length} open order(s)</strong> where items have been served to customers/tables but payment is pending.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-amber-800 dark:text-amber-200">Total Unpaid Items Served:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono">{totalReservedUnits} units</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-amber-800 dark:text-amber-200">Total Value Pending:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(totalReservedValue)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSubTab('unpaid_reserved')}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Reserved Items Breakdown</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: UNPAID RESERVED ITEMS BREAKDOWN */}
      {activeSubTab === 'unpaid_reserved' && (
        <div className={`p-6 rounded-2xl border space-y-6 transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex items-center space-x-2 text-amber-500">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Ibiri ahandi bitarishyurwa (Items Served in Unpaid Orders)
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                These items have been ordered on open tables but not yet paid. They are deducted from available bar stock so stock checks don't overcount them.
              </p>
            </div>

            {onNavigateToOrders && (
              <button
                onClick={onNavigateToOrders}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Go to Order Center & Collect Payment</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          {reservedItemsList.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">No Reserved Unpaid Items!</p>
              <p className="text-xs max-w-md mx-auto">
                All orders are currently paid, or no active unpaid orders are open. All inventory in the bar matches available stock.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reservedItemsList.map(({ item, reservedQty, reservedValue, holdingOrders }) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</h4>
                        <span className="text-[10px] text-gray-500">{item.category} • {formatCurrency(item.price)} each</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500 text-slate-950">
                        {reservedQty} reserved
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between font-bold">
                      <span className="text-amber-800 dark:text-amber-200">Total Unpaid Value:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(reservedValue)}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Open Orders Holding This Item:
                      </span>
                      {holdingOrders.map(({ order, qty, total }) => (
                        <div key={order.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-amber-500">
                              Table {order.tableNumber || 'N/A'} (Order #{order.orderNumber || order.id.slice(-4)})
                            </span>
                            <p className="text-[10px] text-gray-400">
                              Waiter: {order.waiterName || 'Staff'} • {qty} x {item.name}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: DAILY STOCK BALANCE SHEET & RECONCILIATION */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border transition-colors ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    Daily Stock Movement & Reconciliation Sheet
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Raporo y'Ububiko: Ububiko bwa Mbere (Previous Closing), Ibyinjiye (Restocked), Ibyasohotse (Sold/Dispatched), n'Ububiko Busigaye.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 pl-2">Date:</span>
                  <input
                    type="date"
                    value={reconciliationDate}
                    onChange={(e) => setReconciliationDate(e.target.value)}
                    className="px-2 py-1 text-xs font-bold bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center space-x-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Balance Sheet</span>
                </button>

                <button
                  onClick={() => {
                    const stockMovements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
                    const filtered = stockMovements.filter(m => {
                      const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
                      const matchesSearch = m.itemName.toLowerCase().includes(searchQuery.toLowerCase());
                      let matchesDept = true;
                      if (selectedDeptFilter === 'Kitchen') matchesDept = isKitchenItem(m);
                      else if (selectedDeptFilter === 'Bar') matchesDept = isBarItem(m);
                      else if (selectedDeptFilter === 'Other') matchesDept = !isKitchenItem(m) && !isBarItem(m);
                      return matchesCat && matchesSearch && matchesDept;
                    });
                    const headers = ['Item Name', 'Category', 'Opening Stock', 'Received (Stock In)', 'Sold (Stock Out)', 'Adjustments (+/-)', 'Closing Stock', 'Current Stock', 'Sales Value (RWF)'];
                    const rows = filtered.map(m => [
                      `"${m.itemName}"`,
                      `"${m.category}"`,
                      m.openingStock,
                      m.receivedStock,
                      m.soldStock,
                      m.adjustments,
                      m.closingStock,
                      m.currentStock,
                      m.dispatchedValue
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `Stock_Balance_${selectedDeptFilter}_${reconciliationDate}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Department Selection Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 mb-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Department:</span>
                </span>

                <button
                  onClick={() => {
                    setSelectedDeptFilter('All');
                    setPrintDeptSelection('All');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    selectedDeptFilter === 'All'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Departments</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedDeptFilter('Kitchen');
                    setPrintDeptSelection('Kitchen');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    selectedDeptFilter === 'Kitchen'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5 text-orange-500" />
                  <span>Igikoni / Kitchen Stock</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedDeptFilter('Bar');
                    setPrintDeptSelection('Bar');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    selectedDeptFilter === 'Bar'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Wine className="w-3.5 h-3.5 text-purple-500" />
                  <span>Akabari / Bar Stock</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedDeptFilter('Other');
                    setPrintDeptSelection('Other');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    selectedDeptFilter === 'Other'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />
                  <span>Other Services</span>
                </button>
              </div>

              {/* Custom Selection Toggle & Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const next = !customSelectMode;
                    setCustomSelectMode(next);
                    if (next) {
                      setPrintDeptSelection('Custom');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                    customSelectMode
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{customSelectMode ? 'Custom Selection Active' : 'Choose What to Print'}</span>
                </button>

                {customSelectMode && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleSelectKitchenOnly}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                    >
                      Kitchen Only
                    </button>
                    <button
                      onClick={handleSelectBarOnly}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
                    >
                      Bar Only
                    </button>
                    <button
                      onClick={handleSelectActiveOnly}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    >
                      Active Today
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      Clear
                    </button>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">
                      {selectedItemIds.size} Selected
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reconciliation KPI Summary Cards */}
            {(() => {
              const movements = calculateStockMovementsForDate(menuItems, stockLogs, orders, reconciliationDate);
              
              let filtered = movements.filter(m => {
                const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
                const matchesSearch = m.itemName.toLowerCase().includes(searchQuery.toLowerCase());
                let matchesDept = true;
                if (selectedDeptFilter === 'Kitchen') matchesDept = isKitchenItem(m);
                else if (selectedDeptFilter === 'Bar') matchesDept = isBarItem(m);
                else if (selectedDeptFilter === 'Other') matchesDept = !isKitchenItem(m) && !isBarItem(m);
                return matchesCat && matchesSearch && matchesDept;
              });

              if (customSelectMode && selectedItemIds.size > 0) {
                filtered = filtered.filter(m => selectedItemIds.has(m.itemId));
              }

              const totOpening = filtered.reduce((sum, m) => sum + m.openingStock, 0);
              const totReceived = filtered.reduce((sum, m) => sum + m.receivedStock, 0);
              const totSold = filtered.reduce((sum, m) => sum + m.soldStock, 0);
              const totAdjustments = filtered.reduce((sum, m) => sum + m.adjustments, 0);
              const totClosing = filtered.reduce((sum, m) => sum + m.closingStock, 0);
              const totValue = filtered.reduce((sum, m) => sum + m.dispatchedValue, 0);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Ububiko bwa Mbere (Opening)
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                        {totOpening} units
                      </span>
                      <span className="text-[10px] text-gray-500">Start of {reconciliationDate}</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
                        + Ibyinjiye (Received / Purchases)
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                        +{totReceived} units
                      </span>
                      <span className="text-[10px] text-gray-500">Approved restocks on date</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                        - Ibyagurishijwe (Sold / Dispatched)
                      </span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                        -{totSold} units
                      </span>
                      <span className="text-[10px] text-gray-500">Value: {formatCurrency(totValue)}</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">
                        ± Impinduka (Adjustments)
                      </span>
                      <span className={`text-xl font-black mt-1 block ${totAdjustments >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {totAdjustments >= 0 ? `+${totAdjustments}` : totAdjustments} units
                      </span>
                      <span className="text-[10px] text-gray-500">Waste/Damaged/Count diffs</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider block">
                        = Ububiko Busigaye (Closing)
                      </span>
                      <span className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
                        {totClosing} units
                      </span>
                      <span className="text-[10px] text-gray-500">End of {reconciliationDate}</span>
                    </div>
                  </div>

                  {/* Quick Filter Info Notice */}
                  {customSelectMode && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex justify-between items-center text-indigo-700 dark:text-indigo-300">
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                        <span>
                          Custom Item Selection Mode is active. Tick items below to choose exactly what to print.
                        </span>
                      </div>
                      <button
                        onClick={() => handleSelectAllFiltered(filtered)}
                        className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700"
                      >
                        Select All Visible ({filtered.length})
                      </button>
                    </div>
                  )}

                  {/* Stock Reconciliation Table */}
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-800/80 uppercase text-[10px] font-bold text-gray-500">
                        <tr>
                          {customSelectMode && (
                            <th className="py-3 px-3 text-center w-10">Select</th>
                          )}
                          <th className="py-3 px-3">Item / Product Name</th>
                          <th className="py-3 px-3">Category</th>
                          <th className="py-3 px-3 text-center bg-gray-200/50 dark:bg-gray-700/50 text-slate-900 dark:text-white">
                            Ububiko bwa Mbere (Opening)
                          </th>
                          <th className="py-3 px-3 text-center bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            + Ibyinjiye (Received)
                          </th>
                          <th className="py-3 px-3 text-center bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            - Ibyagurishijwe (Sold)
                          </th>
                          <th className="py-3 px-3 text-center bg-purple-500/10 text-purple-700 dark:text-purple-300">
                            ± Impinduka (Adjustments)
                          </th>
                          <th className="py-3 px-3 text-center bg-sky-500/10 text-sky-700 dark:text-sky-300 font-black">
                            = Ububiko Busigaye (Closing)
                          </th>
                          <th className="py-3 px-3 text-right">Sales Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={customSelectMode ? 9 : 8} className="py-8 text-center text-gray-400">
                              No items found for department "{selectedDeptFilter}".
                            </td>
                          </tr>
                        ) : (
                          filtered.map(m => {
                            const isSelected = selectedItemIds.has(m.itemId);
                            return (
                              <tr 
                                key={m.itemId} 
                                className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer ${
                                  isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                                }`}
                                onClick={() => {
                                  if (customSelectMode) {
                                    toggleItemSelection(m.itemId);
                                  }
                                }}
                              >
                                {customSelectMode && (
                                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleItemSelection(m.itemId)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                )}
                                <td className="py-3 px-3 font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                                  <span>{m.itemName}</span>
                                  {isKitchenItem(m) ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-500/10 text-orange-600 font-bold">Kitchen</span>
                                  ) : isBarItem(m) ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-600 font-bold">Bar</span>
                                  ) : null}
                                </td>
                                <td className="py-3 px-3 text-gray-500">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px]">
                                    {m.category}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-bold font-mono text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-gray-800/30">
                                  {m.openingStock} {m.unit}s
                                </td>
                                <td className="py-3 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                                  {m.receivedStock > 0 ? `+${m.receivedStock}` : 0}
                                </td>
                                <td className="py-3 px-3 text-center font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-500/5">
                                  {m.soldStock}
                                  {m.pendingQty > 0 && (
                                    <span className="block text-[9px] text-amber-500 font-normal">
                                      ({m.paidQty} Paid + {m.pendingQty} Open)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center font-bold font-mono bg-purple-500/5">
                                  <span className={m.adjustments > 0 ? 'text-purple-600 dark:text-purple-400' : m.adjustments < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}>
                                    {m.adjustments > 0 ? `+${m.adjustments}` : m.adjustments}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-black font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 text-sm">
                                  {m.closingStock}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(m.dispatchedValue)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW 4: STOCK AUDIT TRAIL & LOGS */}
      {activeSubTab === 'logs' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <History className="w-4 h-4 text-amber-500" />
            <span>Complete Stock Audit Log History</span>
          </h3>

          {stockLogs.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No inventory adjustments logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3">Qty Change</th>
                    <th className="py-2.5 px-3">Previous Stock</th>
                    <th className="py-2.5 px-3">New Stock</th>
                    <th className="py-2.5 px-3">Actor / Staff</th>
                    <th className="py-2.5 px-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stockLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">{log.itemName}</td>
                      <td className="py-3 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          log.type === 'Purchase' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          log.type === 'Sale' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          log.type === 'Return' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={log.quantityChange > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500">{log.previousStock}</td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-white">{log.newStock}</td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-bold">{log.actor}</td>
                      <td className="py-3 px-3 text-gray-400 italic text-[11px]">{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECT RESERVED ITEM MODAL */}
      {inspectReservedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border space-y-4 transition-colors ${
            darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Reserved Item Details: {inspectReservedItem.item.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {inspectReservedItem.reservedQty} units served across {inspectReservedItem.holdingOrders.length} open unpaid order(s)
                </p>
              </div>
              <button 
                onClick={() => setInspectReservedItem(null)}
                className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between font-bold">
              <span className="text-amber-800 dark:text-amber-200">Total Pending Unpaid Value:</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">
                {formatCurrency(inspectReservedItem.reservedValue)}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Holding Orders List</h4>
              {inspectReservedItem.holdingOrders.map(({ order, qty, total }) => (
                <div key={order.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-amber-500">
                      Table {order.tableNumber || 'N/A'} (Order #{order.orderNumber || order.id.slice(-4)})
                    </span>
                    <span className="font-mono text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Waiter: {order.waiterName || 'Staff'}</span>
                    <span>Quantity: {qty} units</span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Order Time: {new Date(order.createdAt).toLocaleTimeString()} • Status: {order.status} ({order.paymentStatus})
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setInspectReservedItem(null);
                  if (onNavigateToOrders) onNavigateToOrders();
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex justify-center items-center space-x-1.5 cursor-pointer"
              >
                <span>Go to Order Center to Collect Payment</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <h3 className="font-bold text-base mb-1">
              Adjust Stock: {selectedItemForModal.name}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Current Available Stock in Bar: <span className="font-bold text-amber-500">{selectedItemForModal.stockQuantity} {selectedItemForModal.unit || 'pcs'}</span>
            </p>

            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Adjustment Action</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as StockAdjustmentLog['type'])}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="Purchase">Purchase / Restock Intake (+)</option>
                  <option value="Adjustment">Physical Inventory Count (+/-)</option>
                  <option value="Waste">Wasted / Spoiled (-)</option>
                  <option value="Damaged">Damaged / Broken Bottles (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Quantity Units</label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Reason / Supplier Note</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Delivered by Brasseries, Broken in transit"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT BALANCE SHEET CONFIGURATION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-xl w-full rounded-2xl p-6 shadow-2xl border space-y-5 transition-colors ${
            darkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Print Stock Balance Sheet
                </h3>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                Choose Department Report / Hitamo Igice
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintDeptSelection('All')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    printDeptSelection === 'All'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>All Items</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintDeptSelection('Kitchen')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    printDeptSelection === 'Kitchen'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Utensils className="w-4 h-4 text-orange-500" />
                  <span>Kitchen Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintDeptSelection('Bar')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    printDeptSelection === 'Bar'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Wine className="w-4 h-4 text-purple-500" />
                  <span>Bar Only</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintDeptSelection('Custom')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    printDeptSelection === 'Custom'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Selected ({selectedItemIds.size})</span>
                </button>
              </div>
            </div>

            {/* Paper Size Selection */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                Paper Size / Size y'Ipapuro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrintPaperFormat('80mm')}
                  className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                    printPaperFormat === '80mm'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-xs">
                    80mm
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Thermal Receipt (80mm)</span>
                    <span className="text-[10px] text-gray-500">POS printer roll standard paper</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintPaperFormat('A4')}
                  className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                    printPaperFormat === 'A4'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-xs">
                    A4
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Full A4 Sheet Document</span>
                    <span className="text-[10px] text-gray-500">Official office printer sheet</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Print Options */}
            <div className="space-y-2 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
              <span className="font-bold text-gray-500 text-[10px] uppercase block mb-1">Print Content Options</span>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printHideZeroMovement}
                  onChange={(e) => setPrintHideZeroMovement(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Hide items with no stock activity on date</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printIncludeValues}
                  onChange={(e) => setPrintIncludeValues(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Sales Values & Monetary Amounts</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={printIncludeSignatures}
                  onChange={(e) => setPrintIncludeSignatures(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500"
                />
                <span className="text-gray-700 dark:text-gray-300">Include Signature Lines for Store Keeper & Manager</span>
              </label>
            </div>

            {/* Preview Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex justify-between items-center text-amber-800 dark:text-amber-200 font-bold">
              <span>Ready to print for SEVEN TO SEVEN - Sky View Resort</span>
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px]">
                {reconciliationDate}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrintStockBalanceSheet}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD & EDIT MAIN BEVERAGE STOCK CONSOLE MODAL */}
      {showMainStockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full rounded-2xl p-6 border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Record & Edit Main Beverage Stock</h3>
                  <p className="text-xs text-gray-400">Directly record physical stock counts or update item details in Store</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMainStockModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleMainStockSubmit} className="space-y-4">
              {/* Select Beverage Product */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Select Beverage Item (Product)
                </label>
                <select
                  value={mainStockItemId}
                  onChange={(e) => handleMainStockItemChange(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                >
                  {menuItems.filter(m => isBarItem(m)).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category}) — Store Stock: {item.mainStockQuantity || 0} {item.unit || 'pcs'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Status Badge Cards */}
              {mainStockItemId && (() => {
                const selectedItem = menuItems.find(m => m.id === mainStockItemId);
                if (!selectedItem) return null;
                const curMain = selectedItem.mainStockQuantity || 0;
                const curBar = selectedItem.stockQuantity || 0;

                return (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Main Stock (Store)</span>
                      <p className="text-base font-black text-indigo-400">{curMain} {selectedItem.unit || 'pcs'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Bar Stock (Selling)</span>
                      <p className="text-base font-black text-emerald-400">{curBar} {selectedItem.unit || 'pcs'}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Recording Action Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Stock Recording Action
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMainStockMode('set')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      mainStockMode === 'set'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    🎯 Direct Set Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainStockMode('add')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      mainStockMode === 'add'
                        ? 'bg-emerald-600 text-white shadow-md font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ➕ Add Intake (+Qty)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainStockMode('subtract')}
                    className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      mainStockMode === 'subtract'
                        ? 'bg-rose-600 text-white shadow-md font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    ➖ Deduct Loss (-Qty)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  {mainStockMode === 'set' && 'New Total Main Stock Quantity'}
                  {mainStockMode === 'add' && 'Quantity to Add to Main Stock'}
                  {mainStockMode === 'subtract' && 'Quantity to Deduct from Main Stock'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={mainStockQuantityValue}
                  onChange={(e) => setMainStockQuantityValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full p-2.5 rounded-xl border text-sm font-black ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              {/* Price & Cost Edit Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Selling Price (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mainStockPrice}
                    onChange={(e) => setMainStockPrice(parseInt(e.target.value) || 0)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Purchase / Unit Cost (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mainStockCostPrice}
                    onChange={(e) => setMainStockCostPrice(parseInt(e.target.value) || 0)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Packaging Unit & Min Alert Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Packaging Unit
                  </label>
                  <input
                    type="text"
                    value={mainStockUnit}
                    onChange={(e) => setMainStockUnit(e.target.value)}
                    placeholder="e.g. bottle, crate, glass"
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Min Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mainStockMinAlert}
                    onChange={(e) => setMainStockMinAlert(parseInt(e.target.value) || 10)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Reason for Adjustment / Audit Note
                </label>
                <input
                  type="text"
                  value={mainStockReason}
                  onChange={(e) => setMainStockReason(e.target.value)}
                  placeholder="e.g. Physical Store Count, Supplier Delivery, Damage"
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMainStockModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Record Main Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD & EDIT KITCHEN STOCK CONSOLE MODAL */}
      {showKitchenStockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full rounded-2xl p-6 border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Record & Edit Kitchen Stock</h3>
                  <p className="text-xs text-gray-400">Directly record physical kitchen stock counts or edit item pricing & thresholds</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKitchenStockModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleKitchenStockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Select Kitchen Item / Raw Material
                </label>
                <select
                  value={kitchenStockItemId}
                  onChange={(e) => handleKitchenStockItemChange(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                >
                  {menuItems.filter(m => isKitchenItem(m)).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category}) — Kitchen Stock: {item.stockQuantity || 0} {item.unit || 'portions'}
                    </option>
                  ))}
                </select>
              </div>

              {kitchenStockItemId && (() => {
                const selectedItem = menuItems.find(m => m.id === kitchenStockItemId);
                if (!selectedItem) return null;
                const curQty = selectedItem.stockQuantity || 0;

                return (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-emerald-400 font-bold block">Current Kitchen Stock</span>
                      <span className="font-black text-white text-base">{curQty} {selectedItem.unit || 'portions'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block">Unit Cost / Price</span>
                      <span className="font-bold text-emerald-300">RWF {(selectedItem.costPrice || Math.round(selectedItem.price * 0.6)).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Stock Recording Action Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setKitchenStockMode('set')}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      kitchenStockMode === 'set'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800/80 text-gray-400 border border-slate-700'
                    }`}
                  >
                    Set Total Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setKitchenStockMode('add')}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      kitchenStockMode === 'add'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800/80 text-gray-400 border border-slate-700'
                    }`}
                  >
                    + Add Gain
                  </button>
                  <button
                    type="button"
                    onClick={() => setKitchenStockMode('subtract')}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      kitchenStockMode === 'subtract'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800/80 text-gray-400 border border-slate-700'
                    }`}
                  >
                    - Deduct Loss
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  {kitchenStockMode === 'set' && 'New Total Kitchen Physical Stock'}
                  {kitchenStockMode === 'add' && 'Quantity to Add to Kitchen Stock'}
                  {kitchenStockMode === 'subtract' && 'Quantity to Deduct from Kitchen Stock'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={kitchenStockQuantityValue}
                  onChange={(e) => setKitchenStockQuantityValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full p-2.5 rounded-xl border text-sm font-black ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Selling Price (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={kitchenStockPrice}
                    onChange={(e) => setKitchenStockPrice(parseInt(e.target.value) || 0)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Purchase / Unit Cost (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={kitchenStockCostPrice}
                    onChange={(e) => setKitchenStockCostPrice(parseInt(e.target.value) || 0)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Packaging Unit
                  </label>
                  <input
                    type="text"
                    value={kitchenStockUnit}
                    onChange={(e) => setKitchenStockUnit(e.target.value)}
                    placeholder="e.g. portions, kg, trays, liters"
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Min Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={kitchenStockMinAlert}
                    onChange={(e) => setKitchenStockMinAlert(parseInt(e.target.value) || 5)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Reason for Audit / Adjustment
                </label>
                <input
                  type="text"
                  value={kitchenStockReason}
                  onChange={(e) => setKitchenStockReason(e.target.value)}
                  placeholder="e.g. Kitchen Store Audit, Supplier Delivery, Spoilage"
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowKitchenStockModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Record Kitchen Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE ORDER CONSOLE MODAL */}
      {showEditPOModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`max-w-xl w-full rounded-2xl p-6 border shadow-2xl space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Edit Purchase Order Console</h3>
                  <p className="text-xs text-gray-400">Modify supplier, quantities, payment status, or fulfillment status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditPOModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditPOSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={editPoSupplier}
                    onChange={(e) => setEditPoSupplier(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Target Department
                  </label>
                  <select
                    value={editPoDepartment}
                    onChange={(e) => setEditPoDepartment(e.target.value as 'Bar / Beverage' | 'Kitchen')}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="Bar / Beverage">Bar / Beverage</option>
                    <option value="Kitchen">Kitchen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Fulfillment Status
                  </label>
                  <select
                    value={editPoStatus}
                    onChange={(e) => setEditPoStatus(e.target.value as 'Pending' | 'Received')}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="Pending">⏳ Pending Acceptance</option>
                    <option value="Received">✓ Received (Stock Gained)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={editPoPaymentStatus}
                    onChange={(e) => setEditPoPaymentStatus(e.target.value as 'Paid' | 'Unpaid')}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="Paid">✓ Paid</option>
                    <option value="Unpaid">⚠️ Unpaid / Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Order Items & Quantities
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editPoItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                      <div>
                        <span className="font-bold text-white block">{item.itemName}</span>
                        <span className="text-[10px] text-gray-400">Destination: {item.destination}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Qty</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const newItems = [...editPoItems];
                              newItems[idx] = { ...newItems[idx], quantity: val, totalCost: val * newItems[idx].unitCost };
                              setEditPoItems(newItems);
                            }}
                            className="w-16 p-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-center text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Unit Cost</span>
                          <input
                            type="number"
                            min="0"
                            value={item.unitCost}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              const newItems = [...editPoItems];
                              newItems[idx] = { ...newItems[idx], unitCost: val, totalCost: newItems[idx].quantity * val };
                              setEditPoItems(newItems);
                            }}
                            className="w-24 p-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-center text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Order Notes / Receipt Reference
                </label>
                <input
                  type="text"
                  value={editPoNotes}
                  onChange={(e) => setEditPoNotes(e.target.value)}
                  placeholder="e.g. Invoice #10293, Paid via MoMo"
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditPOModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/20 cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT / STOCK TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base">Export / Transfer Stock to Bar</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Select Beverage Product
                </label>
                <select
                  value={transferItemId}
                  onChange={(e) => setTransferItemId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  {menuItems.filter(m => isBarItem(m)).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} — Main Stock: {item.mainStockQuantity || 0} | Bar Stock: {item.stockQuantity || 0}
                    </option>
                  ))}
                </select>
              </div>

              {transferItemId && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                  <div className="flex justify-between text-indigo-300 font-bold">
                    <span>Main Beverage Stock (Available):</span>
                    <span className="font-black text-white">
                      {menuItems.find(m => m.id === transferItemId)?.mainStockQuantity || 0} units
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Bar Selling Stock (Current):</span>
                    <span className="font-black text-white">
                      {menuItems.find(m => m.id === transferItemId)?.stockQuantity || 0} units
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Quantity to Transfer / Export to Bar
                </label>
                <input
                  type="number"
                  min="1"
                  max={menuItems.find(m => m.id === transferItemId)?.mainStockQuantity || 999}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full p-2.5 rounded-xl border text-sm font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Daily Bar Restock for Shift"
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Confirm Export to Bar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PURCHASE ORDER / GOODS INTAKE MODAL */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full rounded-2xl p-6 border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-gray-900'
          }`}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-base">Create Purchase Order / Intake Goods</h3>
              </div>
              <button
                onClick={() => setShowPOModal(false)}
                className="text-gray-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePOSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Department
                  </label>
                  <select
                    value={poDepartment}
                    onChange={(e) => {
                      const dept = e.target.value as 'Bar / Beverage' | 'Kitchen';
                      setPoDepartment(dept);
                      const items = menuItems.filter(m => dept === 'Kitchen' ? isKitchenItem(m) : isBarItem(m));
                      if (items.length > 0) {
                        setPoItemId(items[0].id);
                      }
                      setPoDestination(dept === 'Kitchen' ? 'Kitchen Stock' : 'Main Beverage Stock');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="Bar / Beverage">Bar / Beverage</option>
                    <option value="Kitchen">Kitchen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bralirwa / City Wholesaler"
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Select Item to Purchase
                </label>
                <select
                  value={poItemId}
                  onChange={(e) => {
                    setPoItemId(e.target.value);
                    const it = menuItems.find(m => m.id === e.target.value);
                    if (it) {
                      setPoUnitCost(it.costPrice || Math.round(it.price * 0.6));
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  {menuItems.filter(m => poDepartment === 'Kitchen' ? isKitchenItem(m) : isBarItem(m)).map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              {poDepartment === 'Bar / Beverage' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Stock Destination
                  </label>
                  <select
                    value={poDestination}
                    onChange={(e) => setPoDestination(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="Main Beverage Stock">Main Beverage Stock (Store / Warehouse)</option>
                    <option value="Bar Stock">Direct to Bar Stock (Selling Shelf)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Quantity Purchased
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(parseInt(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl border text-sm font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Unit Purchase Price (RWF)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(parseInt(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl border text-sm font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs flex justify-between items-center text-sky-300 font-bold">
                <span>Total Purchase Amount:</span>
                <span className="text-base font-black text-white">{formatCurrency(poQuantity * poUnitCost)}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-gray-300">
                  <input
                    type="checkbox"
                    checked={autoReceive}
                    onChange={(e) => setAutoReceive(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Accept / Receive Order Immediately (Auto Stock Gain)</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
