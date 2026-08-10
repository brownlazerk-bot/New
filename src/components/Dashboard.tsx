import React from 'react';
import { 
  DollarSign, Utensils, ChefHat, Waves, Flame, Building, 
  Home, TrendingUp, AlertTriangle, ShoppingBag, ArrowRight,
  Clock, CheckCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { Order, Table, KitchenTicket, MenuItem, Shift } from '../types';
import { TabType } from './Navigation';
import { formatCurrency } from '../lib/currency';
import { Language, getTranslation } from '../lib/translations';

interface DashboardProps {
  orders: Order[];
  tables: Table[];
  kitchenTickets: KitchenTicket[];
  menuItems: MenuItem[];
  currentShift?: Shift | null;
  setActiveTab: (tab: TabType) => void;
  darkMode: boolean;
  language?: Language;
}

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  tables,
  kitchenTickets,
  menuItems,
  currentShift,
  setActiveTab,
  darkMode,
  language = 'rw'
}) => {
  const t = getTranslation(language);

  // Calculations for Today's Sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr) && o.status !== 'Cancelled');
  
  const totalTodayRevenue = todayOrders.reduce((sum, o) => {
    if (o.amountPaid !== undefined) return sum + o.amountPaid;
    return o.status === 'Paid' ? sum + o.total : sum;
  }, 0);

  // Departmental breakdowns
  let drinkSales = 0;
  let foodSales = 0;
  let poolSales = 0;
  let saunaSales = 0;
  let roomCharges = 0;
  let apartmentCharges = 0;

  const itemQtyMap: { [name: string]: { qty: number; revenue: number; category: string } } = {};

  todayOrders.forEach((o) => {
    // Payment method metrics
    if (o.paymentDetails?.method === 'Room Charge') {
      roomCharges += o.total;
    } else if (o.paymentDetails?.method === 'Apartment Charge') {
      apartmentCharges += o.total;
    }

    o.items.forEach((item) => {
      if (!itemQtyMap[item.name]) {
        itemQtyMap[item.name] = { qty: 0, revenue: 0, category: item.category };
      }
      itemQtyMap[item.name].qty += item.quantity;
      itemQtyMap[item.name].revenue += item.totalPrice;

      if (item.category === 'Food') {
        foodSales += item.totalPrice;
      } else if (item.category === 'Pool Services') {
        poolSales += item.totalPrice;
      } else if (item.category === 'Sauna Services') {
        saunaSales += item.totalPrice;
      } else {
        drinkSales += item.totalPrice;
      }
    });
  });

  // Table status metrics
  const occupiedTables = tables.filter(t => t.status === 'Occupied').length;
  const availableTables = tables.filter(t => t.status === 'Available').length;

  // Kitchen ticket metrics
  const pendingKitchen = kitchenTickets.filter(k => k.status === 'Pending' || k.status === 'Preparing').length;
  const readyKitchen = kitchenTickets.filter(k => k.status === 'Ready').length;

  // Low stock list
  const lowStockItems = menuItems.filter(m => m.stockQuantity <= (m.minStockAlert || 5) && m.status === 'Available');

  // Top selling items
  const sortedBestsellers = Object.entries(itemQtyMap)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action Cards */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              {language === 'rw' ? "IBIKUBIYE MURI SISTEMU" : "POS OVERVIEW & MONITOR"}
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {language === 'rw' ? "Aka Bati n'Aka Bika (POS)" : "Bar & Cashier Terminal"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {language === 'rw' 
                ? "Gukurikirana ku gihe kimwe ibyacurujwe mu Bati, Bon de Commande mu Gikoni, Pisine n'Ibyumba."
                : "Real-time synchronization across Bar Sales, Kitchen Bon de Commande, Pool Passes & Room Folios."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('order_center')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.orderCenter}</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200 font-bold text-xs transition-all cursor-pointer"
            >
              <span>+ {t.pos}</span>
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs transition-all cursor-pointer"
            >
              <Utensils className="w-4 h-4 text-amber-500" />
              <span>{t.tables} ({occupiedTables} {language === 'rw' ? 'Zirimo' : 'Busy'})</span>
            </button>
            <button
              onClick={() => setActiveTab('pool_sauna')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
            >
              <Waves className="w-4 h-4" />
              <span>{t.poolSauna}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        
        {/* Today's Gross Revenue */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{t.todaySales}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-white mt-2">
            {formatCurrency(totalTodayRevenue)}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">
            {todayOrders.length} {language === 'rw' ? 'Oda Zakozwe' : 'Today Orders'}
          </span>
        </div>

        {/* Drink Sales */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{language === 'rw' ? 'Ibyacurujwe mu Bati' : 'Drink Sales'}</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {formatCurrency(drinkSales)}
          </p>
          <span className="text-[10px] text-gray-500">{language === 'rw' ? 'Ibyasohotse muri Stoke' : 'Auto Stock Deducted'}</span>
        </div>

        {/* Food Sales */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{language === 'rw' ? 'Ibyacurujwe mu Gikoni' : 'Food Sales'}</span>
            <ChefHat className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatCurrency(foodSales)}
          </p>
          <span className="text-[10px] text-gray-500">Bon de Commande</span>
        </div>

        {/* Pool & Sauna */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{t.poolSauna}</span>
            <Waves className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {formatCurrency(poolSales + saunaSales)}
          </p>
          <span className="text-[10px] text-gray-500">Pisine {formatCurrency(poolSales)} | Sawuna {formatCurrency(saunaSales)}</span>
        </div>

        {/* Room / Apt Charges */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{language === 'rw' ? 'Amatsiko y\'Ibyumba' : 'Room Charges'}</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {formatCurrency(roomCharges + apartmentCharges)}
          </p>
          <span className="text-[10px] text-gray-500">{language === 'rw' ? 'Ibyanditswe ku Byumba' : 'Guest Folio Debits'}</span>
        </div>

        {/* Tables & Kitchen Monitor */}
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>{language === 'rw' ? 'Aka Gikoni' : 'Kitchen Status'}</span>
            <ChefHat className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-base font-bold text-amber-600">{pendingKitchen}</span>
              <p className="text-[9px] text-gray-500">{language === 'rw' ? 'Irigutegurwa' : 'Pending'}</p>
            </div>
            <div>
              <span className="text-base font-bold text-emerald-600">{readyKitchen}</span>
              <p className="text-[9px] text-gray-500">{language === 'rw' ? 'Yarangiye' : 'Ready'}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Middle Section: Live Kitchen Orders & Open Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Kitchen Orders Widget */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <ChefHat className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {language === 'rw' ? 'Oda ziri mu Gikoni (Bon de Commande)' : 'Live Kitchen Tickets (Bon de Commande)'}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('kitchen')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <span>{language === 'rw' ? 'Rora Byose' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {kitchenTickets.filter(k => k.status !== 'Served').length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              <p className="text-xs text-gray-500">
                {language === 'rw' ? 'Nta oda y\'ibyo kurya iri mu gikoni ubu.' : 'No active food orders in kitchen queue.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {kitchenTickets.filter(k => k.status !== 'Served').slice(0, 4).map((ticket) => (
                <div 
                  key={ticket.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    ticket.status === 'Ready'
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{ticket.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        {ticket.tableNumber}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {language === 'rw' ? 'Umukwezi' : 'Waiter'}: {ticket.waiterName}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {ticket.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${
                    ticket.status === 'Ready' 
                      ? 'bg-emerald-500 text-white animate-bounce' 
                      : ticket.status === 'Preparing'
                        ? 'bg-blue-500 text-white'
                        : 'bg-amber-500 text-white'
                  }`}>
                    {ticket.status === 'Ready' ? (language === 'rw' ? 'YARANGIYE' : 'READY')
                      : ticket.status === 'Preparing' ? (language === 'rw' ? 'IRIGUTEGURWA' : 'PREPARING')
                      : (language === 'rw' ? 'ITEGEREJE' : 'PENDING')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table Occupancy Status Widget */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {language === 'rw' ? 'Uko Ameza Ahagaze' : 'Restaurant Tables Status'}
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('tables')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <span>{language === 'rw' ? 'Genzura Ameza' : 'Manage Tables'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tables.map((table) => {
              const isOccupied = table.status === 'Occupied';
              return (
                <div
                  key={table.id}
                  onClick={() => setActiveTab('tables')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isOccupied
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : table.status === 'Reserved'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                        : table.status === 'Cleaning'
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <p className="font-bold text-xs">{table.tableNumber}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">
                    {language === 'rw' ? 'Abantu' : 'Cap'}: {table.capacity}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase bg-black/10">
                    {table.status === 'Occupied' ? (language === 'rw' ? 'KIRIMO UMUKIRIYA' : 'OCCUPIED')
                      : table.status === 'Available' ? (language === 'rw' ? 'KIRAHARI' : 'AVAILABLE')
                      : table.status === 'Reserved' ? (language === 'rw' ? 'CYARAFASHWE' : 'RESERVED')
                      : (language === 'rw' ? 'ISUKU' : 'CLEANING')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Section: Top Bestsellers & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bestselling Items */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>{language === 'rw' ? 'Ibicuruzwa Byaguzwe Cyane Uru Munsi' : 'Top Performing Items Today'}</span>
          </h3>

          {sortedBestsellers.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-4">
              {language === 'rw' ? 'Nta ibyo kumenyesha biragurishwa uyu munsi.' : 'No sales recorded yet today.'}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedBestsellers.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(item.revenue)}</p>
                    <p className="text-[10px] text-gray-500">{item.qty} {language === 'rw' ? 'byaguzwe' : 'units sold'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>{language === 'rw' ? 'Ibibura Muri Stoke' : 'Low Bar Stock Alerts'}</span>
            </h3>
            <button
              onClick={() => setActiveTab('stock')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              {language === 'rw' ? 'Ongeramo Stoke' : 'Restock Bar'}
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              ✓ {language === 'rw' ? 'Ibyinyobwa byose n\'ububiko bwa Bati bwakwiriye!' : 'All drink & bar stock levels are healthy!'}
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div>
                    <p className="font-bold text-xs text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">{t.category}: {item.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-rose-500 text-white">
                      {item.stockQuantity} {item.unit}s {language === 'rw' ? 'bisigaye' : 'left'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

