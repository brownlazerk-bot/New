import React, { useState } from 'react';
import { 
  UtensilsCrossed, Users, CheckCircle, Clock, AlertCircle, 
  Trash2, RefreshCw, ShoppingBag, Plus, Sparkles, Edit, 
  QrCode, Search, Filter, ShieldCheck, Printer, Download, 
  Tag, MapPin, Info, Check, X, ToggleLeft, ToggleRight, 
  Calendar, User, Layers, AlertTriangle, Eye
} from 'lucide-react';
import { Table, TableStatus, Order, Waiter, AppUser, UserRole } from '../types';
import { formatCurrency } from '../lib/currency';

interface TablesGridProps {
  tables: Table[];
  waiters: Waiter[];
  orders: Order[];
  onUpdateTableStatus: (tableId: string, newStatus: TableStatus, waiterId?: string) => void;
  onOpenTableOrder: (table: Table) => void;
  onSaveTable?: (table: Table) => void;
  onDeleteTable?: (tableId: string) => void;
  currentUser?: AppUser | null;
  userRole?: UserRole;
  darkMode: boolean;
}

export const TablesGrid: React.FC<TablesGridProps> = ({
  tables,
  waiters,
  orders,
  onUpdateTableStatus,
  onOpenTableOrder,
  onSaveTable,
  onDeleteTable,
  currentUser,
  userRole,
  darkMode
}) => {
  // Main View Toggle: 'floor' (Quick POS Floor View) vs 'management' (Admin Setup & Catalog)
  const [viewMode, setViewMode] = useState<'floor' | 'management'>('floor');

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [filterActive, setFilterActive] = useState<string>('All');

  // Modals State
  const [selectedTableForStatus, setSelectedTableForStatus] = useState<Table | null>(null);
  const [modalWaiterId, setModalWaiterId] = useState<string>(waiters[0]?.id || '');

  // Edit / Add Table Modal State
  const [editingTable, setEditingTable] = useState<Partial<Table> | null>(null);
  const [formError, setFormError] = useState<string>('');

  // Delete Error Alert Modal State
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string>('');

  // QR Code Modal State
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);

  // History Details Modal State
  const [historyModalTable, setHistoryModalTable] = useState<Table | null>(null);

  // Auto-generate unique Table Tag e.g. TB-001, TB-002
  const generateAutoTag = (): string => {
    const existingNums = tables
      .map(t => {
        const match = t.tableTag?.match(/TB-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `TB-${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Open Add Table Modal
  const handleOpenAddTable = () => {
    const nextTag = generateAutoTag();
    const nextNum = tables.length + 1;
    setEditingTable({
      id: `tbl-${Date.now()}`,
      tableNumber: `Table ${nextNum}`,
      tableName: '',
      tableTag: nextTag,
      capacity: 4,
      location: 'Indoor',
      status: 'Available',
      active: true,
      description: '',
      qrCode: `HR-TBL-${nextTag}-${Date.now().toString().slice(-4)}`
    });
    setFormError('');
  };

  // Open Edit Table Modal
  const handleOpenEditTable = (table: Table) => {
    setEditingTable({ ...table });
    setFormError('');
  };

  // Save Table Submit Handler
  const handleSaveTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    const trimmedNumber = (editingTable.tableNumber || '').trim();
    const trimmedTag = (editingTable.tableTag || '').trim();

    if (!trimmedNumber) {
      setFormError('Table Number is required.');
      return;
    }
    if (!trimmedTag) {
      setFormError('Table Tag is required.');
      return;
    }

    // Check duplicate Table Number
    const isDuplicateNumber = tables.some(
      t => t.id !== editingTable.id && t.tableNumber.toLowerCase() === trimmedNumber.toLowerCase()
    );
    if (isDuplicateNumber) {
      setFormError(`Table Number "${trimmedNumber}" is already in use by another table.`);
      return;
    }

    // Check duplicate Table Tag
    const isDuplicateTag = tables.some(
      t => t.id !== editingTable.id && t.tableTag?.toLowerCase() === trimmedTag.toLowerCase()
    );
    if (isDuplicateTag) {
      setFormError(`Table Tag "${trimmedTag}" is already assigned to another table.`);
      return;
    }

    const nowIso = new Date().toISOString();
    const actorName = currentUser?.fullName || 'Manager';

    const fullTable: Table = {
      id: editingTable.id || `tbl-${Date.now()}`,
      tableNumber: trimmedNumber,
      tableName: (editingTable.tableName || '').trim(),
      tableTag: trimmedTag,
      capacity: Number(editingTable.capacity) || 2,
      location: editingTable.location || 'Indoor',
      description: (editingTable.description || '').trim(),
      status: (editingTable.status as TableStatus) || 'Available',
      active: editingTable.active !== false,
      qrCode: editingTable.qrCode || `HR-TBL-${trimmedTag}`,
      createdAt: editingTable.createdAt || nowIso,
      updatedAt: nowIso,
      createdBy: editingTable.createdBy || actorName,
      updatedBy: actorName,
      assignedWaiterId: editingTable.assignedWaiterId,
      currentOrderId: editingTable.currentOrderId
    };

    if (onSaveTable) {
      onSaveTable(fullTable);
    }

    setEditingTable(null);
    setFormError('');
  };

  // Delete Table Handler with Active Orders Validation
  const handleDeleteTableClick = (table: Table) => {
    // Check active orders linked to this table
    const activeOrders = orders.filter(
      o => (o.tableId === table.id || o.tableNumber === table.tableNumber) &&
           o.status !== 'Paid' &&
           o.status !== 'Cancelled' &&
           o.paymentStatus !== 'PAID'
    );

    if (activeOrders.length > 0) {
      setDeleteErrorMsg(`This table has ${activeOrders.length} active order(s) (Tab #${activeOrders[0].id}) and cannot be deleted.`);
      return;
    }

    if (confirm(`Are you sure you want to delete Table ${table.tableNumber} (${table.tableTag})?`)) {
      if (onDeleteTable) {
        onDeleteTable(table.id);
      }
    }
  };

  // Toggle Table Active / Deactive State
  const handleToggleActive = (table: Table) => {
    if (onSaveTable) {
      const updated: Table = {
        ...table,
        active: !table.active,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.fullName || 'Manager'
      };
      onSaveTable(updated);
    }
  };

  // Regenerate QR Code
  const handleRegenerateQrCode = (table: Table) => {
    const newQr = `HR-TBL-${table.tableTag}-${Date.now().toString().slice(-6)}`;
    const updated: Table = {
      ...table,
      qrCode: newQr,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'Manager'
    };
    if (onSaveTable) {
      onSaveTable(updated);
    }
    setQrModalTable(updated);
  };

  // Filter logic
  const locationsList = Array.from(
    new Set(['Indoor', 'Outdoor', 'VIP Lounge', 'Terrace', 'Poolside', 'Garden', 'Bar Counter', ...tables.map(t => t.location || 'Indoor')])
  );

  const filteredTables = tables.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      t.tableNumber.toLowerCase().includes(q) ||
      (t.tableName && t.tableName.toLowerCase().includes(q)) ||
      (t.tableTag && t.tableTag.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q));

    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesLocation = filterLocation === 'All' || t.location === filterLocation;
    const matchesActive = filterActive === 'All' || 
      (filterActive === 'Active' && t.active !== false) ||
      (filterActive === 'Inactive' && t.active === false);

    return matchesSearch && matchesStatus && matchesLocation && matchesActive;
  });

  const activeTablesCount = tables.filter(t => t.active !== false).length;
  const occupiedTablesCount = tables.filter(t => t.status === 'Occupied').length;
  const availableTablesCount = tables.filter(t => t.status === 'Available' && t.active !== false).length;

  return (
    <div className="space-y-6">
      
      {/* Header & View Mode Switcher */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Restaurant & Terrace Table Management
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure seating layout, unique table tags, seating capacities, locations, QR code banners, and real-time order tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle Buttons */}
            <div className="p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex space-x-1">
              <button
                onClick={() => setViewMode('floor')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'floor'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Floor Seating Grid</span>
              </button>

              <button
                onClick={() => setViewMode('management')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'management'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Edit className="w-4 h-4" />
                <span>Table Admin Catalog</span>
              </button>
            </div>

            {/* Add Table Button */}
            <button
              onClick={handleOpenAddTable}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Table</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Total Tables</span>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{tables.length}</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Available</span>
            <p className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-0.5">{availableTablesCount}</p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Occupied</span>
            <p className="text-lg font-black text-amber-800 dark:text-amber-300 mt-0.5">{occupiedTablesCount}</p>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Active Status</span>
            <p className="text-lg font-black text-purple-800 dark:text-purple-300 mt-0.5">{activeTablesCount} / {tables.length}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search table #, name, tag (TB-001), location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Out of Service">Out of Service</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="All">All Locations</option>
              {locationsList.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Active State Filter */}
          <div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="All">All Active States</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

        </div>
      </div>

      {/* VIEW MODE 1: FLOOR SEATING GRID */}
      {viewMode === 'floor' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-800">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-gray-400 mb-2 opacity-50" />
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-200">No tables match current filters</h3>
              <p className="text-xs text-gray-500 mt-1">Try resetting search query or click "Add New Table" to create a table.</p>
            </div>
          ) : (
            filteredTables.map((table) => {
              const activeOrder = orders.find(
                o => (o.tableId === table.id || o.tableNumber === table.tableNumber) &&
                     o.status !== 'Paid' &&
                     o.status !== 'Cancelled' &&
                     o.paymentStatus !== 'PAID'
              );
              const assignedWaiter = waiters.find(w => w.id === table.assignedWaiterId);
              const isDeactivated = table.active === false;

              return (
                <div
                  key={table.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 relative ${
                    isDeactivated
                      ? 'bg-gray-100 dark:bg-gray-900/40 border-gray-300 dark:border-gray-800 opacity-60'
                      : table.status === 'Occupied'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : table.status === 'Reserved'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                          : table.status === 'Cleaning'
                            ? 'bg-gray-100 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                            : table.status === 'Out of Service'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                              : darkMode
                                ? 'bg-gray-900 border-gray-800 hover:border-emerald-500/60'
                                : 'bg-white border-gray-200 hover:border-emerald-500 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          table.status === 'Occupied'
                            ? 'bg-black/20 text-white'
                            : table.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-black/10'
                        }`}>
                          {table.status}
                        </span>

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10 font-bold opacity-80">
                          {table.tableTag}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-xs opacity-80">
                        <Users className="w-3.5 h-3.5" />
                        <span>{table.capacity} Seats</span>
                      </div>
                    </div>

                    <div className="my-2">
                      <h3 className="text-xl font-black tracking-tight">
                        {table.tableNumber}
                      </h3>
                      {table.tableName && (
                        <p className="text-xs font-semibold opacity-90">{table.tableName}</p>
                      )}
                      <p className="text-[11px] opacity-75 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 inline" />
                        <span>{table.location || 'Indoor'}</span>
                      </p>
                    </div>

                    {assignedWaiter && (
                      <p className="text-xs opacity-90 font-medium">
                        Waiter: <span className="font-bold">{assignedWaiter.name}</span>
                      </p>
                    )}

                    {activeOrder && (
                      <div className="mt-3 p-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Active Tab #:</span>
                          <span className="font-mono font-bold">{activeOrder.id}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm">
                          <span>Total:</span>
                          <span>{formatCurrency(activeOrder.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-1.5 mt-4 pt-3 border-t border-black/10 dark:border-white/10">
                    {table.status === 'Available' && !isDeactivated && (
                      <button
                        onClick={() => onOpenTableOrder(table)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Take Order</span>
                      </button>
                    )}

                    {table.status === 'Occupied' && (
                      <button
                        onClick={() => onOpenTableOrder(table)}
                        className="flex-1 py-2 rounded-xl bg-white text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center justify-center space-x-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add / Checkout</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedTableForStatus(table);
                        setModalWaiterId(table.assignedWaiterId || waiters[0]?.id || '');
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold ${
                        table.status === 'Occupied'
                          ? 'bg-black/20 hover:bg-black/30 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Status
                    </button>

                    <button
                      onClick={() => setQrModalTable(table)}
                      className="px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-slate-950 text-gray-700 dark:text-gray-300 transition-colors"
                      title="View QR Code Banner"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEditTable(table)}
                      className="px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-slate-950 text-gray-700 dark:text-gray-300 transition-colors"
                      title="Edit Table Details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE ADMIN CATALOG & DIRECTORY */}
      {viewMode === 'management' && (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-400 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-3.5">Table # & Name</th>
                  <th className="p-3.5">Table Tag</th>
                  <th className="p-3.5">Seating Capacity</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Current Status</th>
                  <th className="p-3.5">Active State</th>
                  <th className="p-3.5">History / Audit</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredTables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No tables found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((table) => {
                    const isDeactivated = table.active === false;

                    return (
                      <tr key={table.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3.5">
                          <div>
                            <span className="font-bold text-sm text-gray-900 dark:text-white block">{table.tableNumber}</span>
                            {table.tableName && (
                              <span className="text-[11px] text-gray-500 block">{table.tableName}</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono font-bold text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                            {table.tableTag}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold">
                          {table.capacity} Persons
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                            {table.location || 'Indoor'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${
                            table.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : table.status === 'Occupied'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                : table.status === 'Reserved'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}>
                            {table.status}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleActive(table)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                              !isDeactivated
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {!isDeactivated ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4 text-rose-500" />}
                            <span>{!isDeactivated ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => setHistoryModalTable(table)}
                            className="text-purple-500 hover:text-purple-600 text-xs font-bold flex items-center space-x-1"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>View Info</span>
                          </button>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setQrModalTable(table)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-slate-950 text-gray-700 dark:text-gray-300 transition-colors"
                              title="QR Code Banner"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditTable(table)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-slate-950 text-gray-700 dark:text-gray-300 transition-colors"
                              title="Edit Table"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteTableClick(table)}
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-rose-600 hover:text-white text-rose-500 transition-colors"
                              title="Delete Table"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TABLE MODAL */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border transition-colors my-8 ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">
                  {tables.some(t => t.id === editingTable.id) ? `Edit Table: ${editingTable.tableNumber}` : 'Create New Table'}
                </h3>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTableSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Table Number */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                    Table Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Table 01 or T-01"
                    value={editingTable.tableNumber || ''}
                    onChange={(e) => setEditingTable({ ...editingTable, tableNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  />
                </div>

                {/* Table Name (Optional) */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                    Table Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Garden Corner Booth"
                    value={editingTable.tableName || ''}
                    onChange={(e) => setEditingTable({ ...editingTable, tableName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Table Tag (Unique) */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px] flex justify-between">
                    <span>Table Tag (Unique) *</span>
                    <button
                      type="button"
                      onClick={() => setEditingTable({ ...editingTable, tableTag: generateAutoTag() })}
                      className="text-amber-500 hover:underline text-[9px]"
                    >
                      Auto-Generate
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TB-001"
                    value={editingTable.tableTag || ''}
                    onChange={(e) => setEditingTable({ ...editingTable, tableTag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>

                {/* Seating Capacity */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                    Seating Capacity (Persons) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={editingTable.capacity || 2}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Location */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                    Location / Zone *
                  </label>
                  <select
                    value={editingTable.location || 'Indoor'}
                    onChange={(e) => setEditingTable({ ...editingTable, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  >
                    <option value="Indoor">Indoor Main Hall</option>
                    <option value="Outdoor">Outdoor Terrace</option>
                    <option value="VIP Lounge">VIP Lounge</option>
                    <option value="Terrace">Terrace Deck</option>
                    <option value="Poolside">Poolside Cabana</option>
                    <option value="Garden">Garden Gazebo</option>
                    <option value="Bar Counter">Bar Counter</option>
                    <option value="Private Room">Private Dining Room</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                    Table Status *
                  </label>
                  <select
                    value={editingTable.status || 'Available'}
                    onChange={(e) => setEditingTable({ ...editingTable, status: e.target.value as TableStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold mb-1 uppercase text-gray-400 text-[10px]">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Window side table with garden view and ambient lighting..."
                  value={editingTable.description || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="tableActiveCheck"
                  checked={editingTable.active !== false}
                  onChange={(e) => setEditingTable({ ...editingTable, active: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <label htmlFor="tableActiveCheck" className="font-bold text-xs cursor-pointer">
                  Activate Table (Visible for order placement)
                </label>
              </div>

              <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Save Table
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL (From Floor View) */}
      {selectedTableForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <h3 className="font-bold text-lg mb-1">
              Update Status: {selectedTableForStatus.tableNumber}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Capacity: {selectedTableForStatus.capacity} Persons | Tag: <span className="font-mono font-bold text-amber-500">{selectedTableForStatus.tableTag}</span>
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Assign Waiter</label>
                <select
                  value={modalWaiterId}
                  onChange={(e) => setModalWaiterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  {waiters.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.shift})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { status: 'Available' as TableStatus, color: 'bg-emerald-600' },
                  { status: 'Occupied' as TableStatus, color: 'bg-amber-500' },
                  { status: 'Reserved' as TableStatus, color: 'bg-purple-600' },
                  { status: 'Cleaning' as TableStatus, color: 'bg-gray-600' },
                  { status: 'Out of Service' as TableStatus, color: 'bg-rose-600' },
                ].map(s => (
                  <button
                    key={s.status}
                    onClick={() => {
                      onUpdateTableStatus(selectedTableForStatus.id, s.status, modalWaiterId);
                      setSelectedTableForStatus(null);
                    }}
                    className={`py-3 rounded-xl text-white font-bold text-xs ${s.color} hover:opacity-90 transition-opacity`}
                  >
                    Set {s.status}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setSelectedTableForStatus(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ERROR ALERT MODAL */}
      {deleteErrorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex items-center space-x-3 text-rose-500 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base">Cannot Delete Table</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
              {deleteErrorMsg}
            </p>
            <button
              onClick={() => setDeleteErrorMsg('')}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}

      {/* QR CODE BANNER MODAL */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-sm w-full rounded-2xl p-6 shadow-2xl border text-center transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-center space-x-2 text-amber-500">
                <QrCode className="w-5 h-5" />
                <h3 className="font-bold text-sm">Table QR Stand</h3>
              </div>
              <button
                onClick={() => setQrModalTable(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Table Tent Graphic Card */}
            <div id="printableQrStand" className="p-5 rounded-2xl bg-white text-slate-950 border-2 border-slate-950 shadow-inner space-y-3 my-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 block">
                Hotel & Resort Dining
              </span>

              <div className="my-1">
                <h2 className="text-2xl font-black">{qrModalTable.tableNumber}</h2>
                {qrModalTable.tableName && (
                  <p className="text-xs font-bold text-slate-700">{qrModalTable.tableName}</p>
                )}
                <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                  Tag: {qrModalTable.tableTag}
                </span>
              </div>

              {/* QR Code Graphic Image */}
              <div className="w-44 h-44 mx-auto p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalTable.qrCode || qrModalTable.tableTag)}`}
                  alt={`QR Code ${qrModalTable.tableNumber}`}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[10px] font-bold text-slate-500 pt-1">
                Scan to view menu & order from table | Zone: {qrModalTable.location || 'Indoor'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 mt-4 text-xs">
              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Table Stand</span>
              </button>

              <button
                onClick={() => handleRegenerateQrCode(qrModalTable)}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE HISTORY & AUDIT MODAL */}
      {historyModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-center space-x-2 text-purple-500">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base">Table History & Metadata</h3>
              </div>
              <button
                onClick={() => setHistoryModalTable(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Table Number:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{historyModalTable.tableNumber}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Table Tag:</span>
                  <span className="font-mono font-bold text-amber-500">{historyModalTable.tableTag}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Created Date:</span>
                  <span className="font-bold">{historyModalTable.createdAt ? new Date(historyModalTable.createdAt).toLocaleString() : 'System Initialized'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-bold">{historyModalTable.updatedAt ? new Date(historyModalTable.updatedAt).toLocaleString() : 'N/A'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Created By:</span>
                  <span className="font-bold text-purple-400">{historyModalTable.createdBy || 'System Admin'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Updated By:</span>
                  <span className="font-bold text-purple-400">{historyModalTable.updatedBy || 'Manager'}</span>
                </div>
              </div>

              {historyModalTable.description && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Description</span>
                  <p className="text-gray-700 dark:text-gray-300 italic">{historyModalTable.description}</p>
                </div>
              )}

              <button
                onClick={() => setHistoryModalTable(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
