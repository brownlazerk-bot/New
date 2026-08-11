import { MenuItem, Table, Waiter, GuestRoom, Shift, Order, KitchenTicket, PurchaseOrder, KitchenIngredient } from '../types';

export const INITIAL_MENU_ITEMS: MenuItem[] = [];
export const INITIAL_TABLES: Table[] = [];
export const INITIAL_WAITERS: Waiter[] = [];
export const INITIAL_GUEST_ROOMS: GuestRoom[] = [];
export const INITIAL_ACTIVE_SHIFT: Shift | null = null;
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_KITCHEN_TICKETS: KitchenTicket[] = [];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-1001',
    poNumber: 'PO-1001',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    supplierName: 'Bralirwa Brasseries Rwanda',
    department: 'Bar / Beverage',
    items: [
      {
        itemId: 'm1',
        itemName: 'Primus 72cl',
        category: 'Beers',
        quantity: 50,
        unitCost: 1000,
        totalCost: 50000,
        destination: 'Main Beverage Stock'
      },
      {
        itemId: 'm2',
        itemName: 'Mutzig 65cl',
        category: 'Beers',
        quantity: 40,
        unitCost: 1100,
        totalCost: 44000,
        destination: 'Main Beverage Stock'
      }
    ],
    totalAmount: 94000,
    status: 'Pending',
    paymentStatus: 'Paid',
    createdByName: 'Patrick Bizimana (Manager)',
    notes: 'Main beverage store replenishment order'
  },
  {
    id: 'PO-1002',
    poNumber: 'PO-1002',
    date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    supplierName: 'Inyange Industries Ltd',
    department: 'Bar / Beverage',
    items: [
      {
        itemId: 'm4',
        itemName: 'Inyange Water 500ml',
        category: 'Water',
        quantity: 100,
        unitCost: 300,
        totalCost: 30000,
        destination: 'Main Beverage Stock'
      }
    ],
    totalAmount: 30000,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    createdByName: 'Patrick Bizimana (Manager)',
    notes: 'Inyange water store intake pending'
  },
  {
    id: 'PO-1003',
    poNumber: 'PO-1003',
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    supplierName: 'Kigali Fresh Farm Produce & Meat',
    department: 'Kitchen',
    items: [
      {
        itemId: 'k1',
        itemName: 'Beef Meat Fillet (Kg)',
        category: 'Food',
        quantity: 20,
        unitCost: 4500,
        totalCost: 90000,
        destination: 'Kitchen Stock'
      }
    ],
    totalAmount: 90000,
    status: 'Pending',
    paymentStatus: 'Paid',
    createdByName: 'Chef Eric Nshuti',
    notes: 'Kitchen raw material restock order'
  }
];

export const INITIAL_KITCHEN_INGREDIENTS: KitchenIngredient[] = [
  {
    id: 'ing-101',
    code: 'RAW-01',
    name: 'Fresh Chicken Meat',
    category: 'Meat & Poultry',
    stockQuantity: 45,
    unit: 'Kg',
    purchaseUnit: 'Kg',
    recipeUnit: 'g',
    conversionRate: 1000,
    costPerUnit: 3800,
    averageCost: 3650,
    minStockAlert: 10,
    maxStock: 100,
    storageLocation: 'Cold Room #1 (Meat)',
    supplier: 'Kigali Poultry Suppliers Ltd',
    status: 'Available',
    notes: 'Grade A Whole Fresh Chicken'
  },
  {
    id: 'ing-102',
    code: 'RAW-02',
    name: 'White Basmati Rice',
    category: 'Grains & Rice',
    stockQuantity: 80,
    unit: 'Kg',
    purchaseUnit: 'Kg',
    recipeUnit: 'g',
    conversionRate: 1000,
    costPerUnit: 1800,
    averageCost: 1750,
    minStockAlert: 15,
    maxStock: 200,
    storageLocation: 'Kitchen Dry Store #2',
    supplier: 'Bakhresa Grain Millers',
    status: 'Available',
    notes: 'Premium long grain rice'
  },
  {
    id: 'ing-103',
    code: 'RAW-03',
    name: 'Vegetable Cooking Oil',
    category: 'Spices & Oils',
    stockQuantity: 30,
    unit: 'Litre',
    purchaseUnit: 'Litre',
    recipeUnit: 'ml',
    conversionRate: 1000,
    costPerUnit: 2500,
    averageCost: 2400,
    minStockAlert: 5,
    maxStock: 80,
    storageLocation: 'Kitchen Pantry Shelf A',
    supplier: 'Mount Meru Oils',
    status: 'Available'
  },
  {
    id: 'ing-104',
    code: 'RAW-04',
    name: 'Fresh Tomatoes',
    category: 'Vegetables & Produce',
    stockQuantity: 18,
    unit: 'Kg',
    purchaseUnit: 'Kg',
    recipeUnit: 'g',
    conversionRate: 1000,
    costPerUnit: 1200,
    averageCost: 1100,
    minStockAlert: 8,
    maxStock: 50,
    storageLocation: 'Vegetable Cold Chiller',
    supplier: 'Nyabugogo Fresh Market',
    status: 'Available'
  },
  {
    id: 'ing-105',
    code: 'RAW-05',
    name: 'Beef Fillet Meat',
    category: 'Meat & Poultry',
    stockQuantity: 25,
    unit: 'Kg',
    purchaseUnit: 'Kg',
    recipeUnit: 'g',
    conversionRate: 1000,
    costPerUnit: 4800,
    averageCost: 4600,
    minStockAlert: 8,
    maxStock: 60,
    storageLocation: 'Cold Room #1 (Meat)',
    supplier: 'Nyabugogo Abattoir',
    status: 'Available'
  },
  {
    id: 'ing-106',
    code: 'RAW-06',
    name: 'Fresh Eggs',
    category: 'Dairy & Eggs',
    stockQuantity: 5,
    unit: 'Tray',
    purchaseUnit: 'Tray',
    recipeUnit: 'Piece',
    conversionRate: 30,
    costPerUnit: 4200,
    averageCost: 4000,
    minStockAlert: 3,
    maxStock: 20,
    storageLocation: 'Pantry Rack 3',
    supplier: 'Bugesera Poultry Farm',
    status: 'Available'
  },
  {
    id: 'ing-107',
    code: 'RAW-07',
    name: 'Heavy-Duty Aluminium Foil',
    category: 'Kitchen Packaging & Foil',
    stockQuantity: 120,
    unit: 'Meters',
    purchaseUnit: 'Roll',
    recipeUnit: 'Meters',
    conversionRate: 50, // 1 Roll = 50 Meters
    costPerUnit: 250, // 250 RWF per Meter (e.g. 12,500 RWF per 50m Roll)
    averageCost: 240,
    minStockAlert: 20,
    maxStock: 300,
    storageLocation: 'Kitchen Store Shelf B (Packaging)',
    supplier: 'Kigali Packaging Solutions Ltd',
    status: 'Available',
    notes: 'Used in meters/cm to wrap & cover grilled orders (Chicken, Fish, Meat) when cooking on fire'
  }
];

