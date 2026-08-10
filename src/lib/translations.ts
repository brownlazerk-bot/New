export type Language = 'rw' | 'en';

export interface Translations {
  // Common Navigation
  dashboard: string;
  orderCenter: string;
  pos: string;
  tables: string;
  kitchen: string;
  poolSauna: string;
  barStock: string;
  shifts: string;
  dailyReport: string;
  productsServices: string;
  userAdmin: string;
  auditLogs: string;
  settings: string;

  // Header & Status
  systemTitle: string;
  activeShift: string;
  noActiveShift: string;
  openShift: string;
  cashier: string;
  manager: string;
  logout: string;
  darkMode: string;
  lightMode: string;
  lowStockAlert: string;
  unpaidAlert: string;

  // Dashboard / General Metrics
  todaySales: string;
  cashRevenue: string;
  momoRevenue: string;
  cardRevenue: string;
  pendingTotal: string;
  activeTables: string;
  dispatchedDrinks: string;
  kitchenTicketsCount: string;

  // Stock Management
  availableStock: string;
  unpaidReserved: string;
  stockReconciliation: string;
  stockLogs: string;
  itemName: string;
  category: string;
  unitPrice: string;
  openingStock: string;
  addedStock: string;
  dispatchedStock: string;
  closingStock: string;
  currentStock: string;
  addRestock: string;
  reduceStock: string;

  // Daily Report
  overallSummary: string;
  paymentBreakdown: string;
  barKitchenDetail: string;
  roomHotelServices: string;
  totalRevenuePaid: string;
  netSales: string;
  pendingValue: string;
  outstandingCredit: string;

  // Actions
  searchPlaceholder: string;
  filterAll: string;
  exportCsv: string;
  printReport: string;
  close: string;
  save: string;
  cancel: string;
  confirm: string;
}

const translations: Record<Language, Translations> = {
  rw: {
    // Navigation
    dashboard: "Ikibiriti (Dashboard)",
    orderCenter: "Ibyacurujwe & Oda",
    pos: "Gufata Oda (POS)",
    tables: "Ameza",
    kitchen: "Mu Gikoni",
    poolSauna: "Pisine na Sawuna",
    barStock: "Ububiko (Stoke)",
    shifts: "Shifuti z'Abakozi",
    dailyReport: "Raporo y'Umunsi",
    productsServices: "Ibicuruzwa n'Ibyakozwe",
    userAdmin: "Abakozi & Ububasha",
    auditLogs: "Raporo y'Ibikorwa",
    settings: "Igenzura ry'Ikirango",

    // Header & Status
    systemTitle: "SISTEMI Y'UBUMWE - SKY VIEW RESORT",
    activeShift: "Shifuti Yafunguwe",
    noActiveShift: "Nta Shifuti Ikora",
    openShift: "Fungura Shifuti",
    cashier: "Umubitsi (Cashier)",
    manager: "Umuyobozi (Manager)",
    logout: "Sohoka",
    darkMode: "Mwijima",
    lightMode: "Mweru",
    lowStockAlert: "Ibibura muri Stoke",
    unpaidAlert: "Oda Zitarishyurwa",

    // Dashboard / Metrics
    todaySales: "Ibyacurujwe Urumunsi",
    cashRevenue: "Kash (Cash)",
    momoRevenue: "MoMo (Mobile Money)",
    cardRevenue: "Ikarita (Card)",
    pendingTotal: "Agaciro k'Oda ziri ku Meza (Pending)",
    activeTables: "Ameza Ariho Abakiriya",
    dispatchedDrinks: "Ibinyobwa Byasohotse",
    kitchenTicketsCount: "Oda z'Ibyo mu Gikoni",

    // Stock Management
    availableStock: "Stoke Ihari (Available)",
    unpaidReserved: "Ibyasohotse ku Meza (Open Tables)",
    stockReconciliation: "Raporo y'Ububiko / Stock Balance",
    stockLogs: "Amakuru y'Ibyinjiye n'Ibyasohotse",
    itemName: "Izina ry'Igicuruzwa",
    category: "Icyiciro",
    unitPrice: "Igiciro (RWF)",
    openingStock: "Ububiko bwa Mbere (Opening)",
    addedStock: "Ibyinjiye (Added)",
    dispatchedStock: "Ibyasohotse (Dispatched)",
    closingStock: "Ububiko Busigaye (Closing)",
    currentStock: "Stoke Uriho Shiti",
    addRestock: "Ongeramo Stoke",
    reduceStock: "Gabanura Stoke",

    // Daily Report
    overallSummary: "Inshamake y'Umunsi",
    paymentBreakdown: "Ubwitegure bw'Ubwishyure",
    barKitchenDetail: "Raporo y'Aka Bati na Gikoni",
    roomHotelServices: "Amahoteli & Pisine",
    totalRevenuePaid: "Ayishyuwe Yose",
    netSales: "Nette Revenue",
    pendingValue: "Agaciro k'Oda Zitarishyurwa",
    outstandingCredit: "Ikirarane k'Amadeni",

    // Actions
    searchPlaceholder: "Shakisha...",
    filterAll: "Bityo Byose",
    exportCsv: "Kuramo Raporo (CSV)",
    printReport: "Capa Raporo (Print)",
    close: "Funga",
    save: "Bika",
    cancel: "Siba",
    confirm: "Emeza"
  },
  en: {
    // Navigation
    dashboard: "Dashboard",
    orderCenter: "Order Center",
    pos: "Take Order (POS)",
    tables: "Tables",
    kitchen: "Kitchen Orders",
    poolSauna: "Pool & Sauna",
    barStock: "Bar Stock",
    shifts: "Shift Register",
    dailyReport: "Daily Report",
    productsServices: "Products & Services",
    userAdmin: "User Admin",
    auditLogs: "Audit Logs",
    settings: "Staff & Menu",

    // Header & Status
    systemTitle: "SKY VIEW RESORT POS SYSTEM",
    activeShift: "Active Shift",
    noActiveShift: "No Active Shift",
    openShift: "Open Shift",
    cashier: "Cashier",
    manager: "Manager",
    logout: "Logout",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    lowStockAlert: "Low Stock Items",
    unpaidAlert: "Unpaid Orders",

    // Dashboard / Metrics
    todaySales: "Today's Total Sales",
    cashRevenue: "Cash Sales",
    momoRevenue: "MoMo Sales",
    cardRevenue: "Card Sales",
    pendingTotal: "Open Table Value (Pending)",
    activeTables: "Active Occupied Tables",
    dispatchedDrinks: "Dispatched Drinks",
    kitchenTicketsCount: "Kitchen Orders",

    // Stock Management
    availableStock: "Available Stock",
    unpaidReserved: "Unpaid / Open Table Reserve",
    stockReconciliation: "Daily Stock Balance Sheet",
    stockLogs: "Stock Adjustment Audit",
    itemName: "Item Name",
    category: "Category",
    unitPrice: "Unit Price (RWF)",
    openingStock: "Opening Stock",
    addedStock: "Added Stock",
    dispatchedStock: "Dispatched Stock",
    closingStock: "Closing Stock",
    currentStock: "Current Live Stock",
    addRestock: "Add Stock",
    reduceStock: "Reduce Stock",

    // Daily Report
    overallSummary: "Overall Summary",
    paymentBreakdown: "Payment Methods Breakdown",
    barKitchenDetail: "Bar & Kitchen Detail",
    roomHotelServices: "Hotel & Pool Services",
    totalRevenuePaid: "Total Paid Revenue",
    netSales: "Net Sales Revenue",
    pendingValue: "Unpaid / Pending Total",
    outstandingCredit: "Outstanding Credit",

    // Actions
    searchPlaceholder: "Search...",
    filterAll: "All Categories",
    exportCsv: "Export CSV",
    printReport: "Print Report",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm"
  }
};

export const getTranslation = (lang?: string | Language): Translations => {
  if (lang === 'en') return translations.en;
  return translations.rw;
};
