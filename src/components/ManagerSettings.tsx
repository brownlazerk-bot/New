import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, Edit, Trash2, Users, Shield, 
  RotateCcw, Save, Wine, UserCheck, AlertCircle, Database, Download, Upload, CheckCircle2,
  Cloud, CloudLightning, Copy, RefreshCw, Key, Globe, Check
} from 'lucide-react';
import { MenuItem, Waiter, Category, ItemStatus } from '../types';
import { createDailyBackup, loadBackups, restoreBackupSnapshot, DatabaseBackup } from '../lib/syncEngine';
import { 
  getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, 
  pushAllToSupabase, pullAllFromSupabase, SUPABASE_SQL_SCHEMA, SupabaseConfig 
} from '../lib/supabaseSync';

interface ManagerSettingsProps {
  menuItems: MenuItem[];
  waiters: Waiter[];
  onSaveMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  onSaveWaiter: (waiter: Waiter) => void;
  onResetData: () => void;
  darkMode: boolean;
}

export const ManagerSettings: React.FC<ManagerSettingsProps> = ({
  menuItems,
  waiters,
  onSaveMenuItem,
  onDeleteMenuItem,
  onSaveWaiter,
  onResetData,
  darkMode
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'waiters' | 'security' | 'backups' | 'supabase'>('menu');
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [backupMsg, setBackupMsg] = useState<string>('');

  // Supabase Configuration State
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [sbEnabled, setSbEnabled] = useState(false);
  const [sbTestResult, setSbTestResult] = useState<{ success?: boolean; message?: string }>({});
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [isSyncingSb, setIsSyncingSb] = useState(false);
  const [sbSyncMsg, setSbSyncMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setSbUrl(config.url || '');
    setSbKey(config.anonKey || '');
    setSbEnabled(config.enabled || false);
  }, []);

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const config: SupabaseConfig = {
      url: sbUrl.trim(),
      anonKey: sbKey.trim(),
      enabled: sbEnabled
    };
    saveSupabaseConfig(config);
    setSbSyncMsg('Supabase credentials saved successfully! Cloud Sync is active.');
    setTimeout(() => setSbSyncMsg(''), 4000);
  };

  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    setSbTestResult({});
    const res = await testSupabaseConnection(sbUrl.trim(), sbKey.trim());
    setSbTestResult(res);
    setIsTestingSb(false);
  };

  const handlePushSupabase = async () => {
    setIsSyncingSb(true);
    setSbSyncMsg('');
    const res = await pushAllToSupabase();
    setSbSyncMsg(res.message);
    setIsSyncingSb(false);
  };

  const handlePullSupabase = async () => {
    setIsSyncingSb(true);
    setSbSyncMsg('');
    const res = await pullAllFromSupabase();
    setSbSyncMsg(res.message);
    setIsSyncingSb(false);
    if (res.success && res.count > 0) {
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  // Menu Item Modal state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<Category>('Beers');
  const [itemPrice, setItemPrice] = useState('5.00');
  const [itemStock, setItemStock] = useState('50');
  const [itemUnit, setItemUnit] = useState('Bottle');
  const [itemStatus, setItemStatus] = useState<ItemStatus>('Available');
  const [itemIsFood, setItemIsFood] = useState(false);
  const [itemImage, setItemImage] = useState('');

  // Waiter Modal state
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [waiterName, setWaiterName] = useState('');
  const [waiterEmpId, setWaiterEmpId] = useState('');
  const [waiterPhone, setWaiterPhone] = useState('');
  const [waiterShift, setWaiterShift] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Night'>('Morning');

  const handleOpenMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemPrice(item.price.toString());
      setItemStock(item.stockQuantity.toString());
      setItemUnit(item.unit);
      setItemStatus(item.status);
      setItemIsFood(item.isFood || false);
      setItemImage(item.image || '');
    } else {
      setEditingItem({
        id: `m-${Date.now()}`,
        name: '',
        category: 'Beers',
        price: 5.0,
        stockQuantity: 50,
        unit: 'Bottle',
        status: 'Available',
        isFood: false
      });
      setItemName('');
      setItemCategory('Beers');
      setItemPrice('5.00');
      setItemStock('50');
      setItemUnit('Bottle');
      setItemStatus('Available');
      setItemIsFood(false);
      setItemImage('');
    }
  };

  const handleSaveMenuForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const saved: MenuItem = {
      ...editingItem,
      name: itemName,
      category: itemCategory,
      price: parseFloat(itemPrice) || 0,
      stockQuantity: parseInt(itemStock) || 0,
      unit: itemUnit,
      status: itemStatus,
      isFood: itemIsFood || itemCategory === 'Food',
      image: itemImage || undefined
    };

    onSaveMenuItem(saved);
    setEditingItem(null);
  };

  const handleOpenWaiterModal = (w?: Waiter) => {
    if (w) {
      setEditingWaiter(w);
      setWaiterName(w.name);
      setWaiterEmpId(w.employeeId);
      setWaiterPhone(w.phone);
      setWaiterShift(w.shift);
    } else {
      setEditingWaiter({
        id: `w-${Date.now()}`,
        name: '',
        employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        phone: '',
        shift: 'Morning',
        active: true
      });
      setWaiterName('');
      setWaiterEmpId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
      setWaiterPhone('');
      setWaiterShift('Morning');
    }
  };

  const handleSaveWaiterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaiter) return;

    const saved: Waiter = {
      ...editingWaiter,
      name: waiterName,
      employeeId: waiterEmpId,
      phone: waiterPhone,
      shift: waiterShift
    };

    onSaveWaiter(saved);
    setEditingWaiter(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <Settings className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Manager Control & Configuration
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure Bar Menu catalog, waiter accounts, pricing, and system security rules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['menu', 'waiters', 'security', 'backups', 'supabase'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  if (tab === 'backups') {
                    setBackups(loadBackups());
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'menu' ? 'Menu Catalog' : tab === 'waiters' ? 'Waiters Roster' : tab === 'security' ? 'Security' : tab === 'backups' ? 'Daily Backups' : '☁️ Supabase Sync'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MENU ITEMS TAB */}
      {activeTab === 'menu' && (
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Bar & Food Menu Catalog</h3>
            <button
              onClick={() => handleOpenMenuModal()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-2">Item Name</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Price ($)</th>
                  <th className="py-2.5 px-2">Stock Qty</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">{item.name}</td>
                    <td className="py-3 px-2 text-gray-500">{item.category}</td>
                    <td className="py-3 px-2 font-mono font-bold">${item.price.toFixed(2)}</td>
                    <td className="py-3 px-2">{item.stockQuantity} {item.unit}s</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        item.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right space-x-2">
                      <button
                        onClick={() => handleOpenMenuModal(item)}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMenuItem(item.id)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WAITERS ROSTER TAB */}
      {activeTab === 'waiters' && (
        <div className={`p-5 rounded-2xl border transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Waiters & Staff Accounts</h3>
            <button
              onClick={() => handleOpenWaiterModal()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Waiter</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {waiters.map((waiter) => (
              <div key={waiter.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{waiter.name}</h4>
                  <p className="text-xs text-gray-500">ID: {waiter.employeeId}</p>
                  <p className="text-xs text-gray-500 mt-1">Phone: {waiter.phone}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/50">
                    Shift: {waiter.shift}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenWaiterModal(waiter)}
                  className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECURITY & DATA RESET TAB */}
      {activeTab === 'security' && (
        <div className={`p-5 rounded-2xl border space-y-6 transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1">Security & Role Restrictions</h3>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-bold">Active Cashier Enforcement Rules:</p>
              <p>• Cashiers CANNOT delete completed transactions.</p>
              <p>• Cashiers CANNOT edit paid receipts or daily reports.</p>
              <p>• Manager PIN (Default: 1234) required for Manager override.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="font-bold text-sm text-rose-600 dark:text-rose-400 mb-1">Reset Demo Database</h4>
            <p className="text-xs text-gray-500 mb-3">Clear local state and restore factory demo menu items, tables, and stock levels.</p>
            <button
              onClick={onResetData}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Data to Demo Default</span>
            </button>
          </div>
        </div>
      )}

      {/* DAILY BACKUPS & DISASTER RECOVERY TAB */}
      {activeTab === 'backups' && (
        <div className={`p-5 rounded-2xl border space-y-6 transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex items-center space-x-2 text-emerald-500">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Centralized Automated Database Backups</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Daily database snapshots are automatically generated. Super Admin can restore snapshots or export JSON files.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const bkp = createDailyBackup('Super Admin Manual');
                  setBackups(loadBackups());
                  setBackupMsg(`Backup snapshot created successfully! [ID: ${bkp.id}]`);
                  setTimeout(() => setBackupMsg(''), 4000);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Backup Snapshot Now</span>
              </button>
            </div>
          </div>

          {backupMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{backupMsg}</span>
            </div>
          )}

          {/* Import JSON File */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-1">Restore from External JSON Backup File (Super Admin)</h4>
            <p className="text-[11px] text-gray-500 mb-3">Upload a valid `.json` database snapshot file to restore full system records.</p>
            <label className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs font-bold text-gray-900 dark:text-white">
              <Upload className="w-4 h-4 text-purple-500" />
              <span>Select Backup File (.json)</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const parsed = JSON.parse(evt.target?.result as string);
                        if (confirm('Are you sure you want to restore the system state from this backup file? Current state will be overwritten.')) {
                          const success = restoreBackupSnapshot(parsed);
                          if (success) {
                            alert('Database state restored successfully!');
                            window.location.reload();
                          } else {
                            alert('Failed to parse or restore backup file structure.');
                          }
                        }
                      } catch (err) {
                        alert('Invalid JSON backup file format.');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>

          {/* Backup Snapshots History */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase text-gray-400">Available Backup History ({backups.length})</h4>
            {backups.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No backup snapshots found. Click "Create Backup Snapshot Now" to create your first daily backup.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 border rounded-xl overflow-hidden border-gray-200 dark:border-gray-800">
                {backups.map((bkp) => (
                  <div key={bkp.id} className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div>
                      <p className="font-bold text-xs font-mono text-gray-900 dark:text-white">{bkp.id}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Created: {new Date(bkp.createdAt).toLocaleString()} | By: <span className="font-bold">{bkp.createdBy}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(bkp, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${bkp.id}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JSON</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Super Admin Restoration: Restore database to backup snapshot [${bkp.id}]?`)) {
                            const success = restoreBackupSnapshot(bkp);
                            if (success) {
                              alert('Database restored successfully!');
                              window.location.reload();
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold flex items-center space-x-1 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Snapshot</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUPABASE CLOUD SYNC TAB */}
      {activeTab === 'supabase' && (
        <div className={`p-6 rounded-2xl border space-y-6 transition-colors ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <div className="flex items-center space-x-2 text-sky-500">
                <Cloud className="w-6 h-6" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Supabase Cloud Database Synchronization</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Connect your Supabase project to automatically sync all accounts, orders, menu items, waiters, tables, and reports across every device (laptops, phones, tablets) wherever you log in.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 ${
                sbEnabled 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${sbEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{sbEnabled ? 'Cloud Sync Active' : 'Local Standalone Mode'}</span>
              </span>
            </div>
          </div>

          {sbSyncMsg && (
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />
              <span>{sbSyncMsg}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSaveSupabaseConfig} className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 space-y-4">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center space-x-2">
              <Key className="w-4 h-4 text-sky-500" />
              <span>Supabase API Credentials & Configuration</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    required
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  required
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="enable_supabase"
                  checked={sbEnabled}
                  onChange={(e) => setSbEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="enable_supabase" className="text-xs font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                  Enable Real-Time Multi-Device Supabase Cloud Synchronization
                </label>
              </div>
            </div>

            {/* Test Connection Output */}
            {sbTestResult.message && (
              <div className={`p-3 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                sbTestResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                {sbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                <span>{sbTestResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSb || !sbUrl || !sbKey}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isTestingSb ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                ) : (
                  <CloudLightning className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span>Test Supabase Connection</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-sky-600/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Supabase Settings</span>
              </button>
            </div>
          </form>

          {/* Sync Actions Card */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              <span>Manual Multi-Device Cloud Actions</span>
            </h4>
            <p className="text-xs text-gray-500">
              Push all current orders, menu items, waiters, tables, and users to Supabase, or pull cloud state to sync this device.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handlePushSupabase}
                disabled={isSyncingSb || !sbEnabled}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isSyncingSb ? 'Syncing...' : 'Push Local Data to Supabase'}</span>
              </button>

              <button
                onClick={handlePullSupabase}
                disabled={isSyncingSb || !sbEnabled}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-2 shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isSyncingSb ? 'Pulling...' : 'Pull Cloud Data from Supabase'}</span>
              </button>
            </div>
          </div>

          {/* SQL Setup Helper */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-slate-900 text-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-xs text-amber-400 uppercase tracking-wider">1-Click Supabase Table Schema</h4>
                <p className="text-[11px] text-slate-400">Copy & paste this SQL into your Supabase project's SQL Editor to create the cloud database table.</p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 border border-slate-700"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL Snippet'}</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-800">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}

      {/* Edit Menu Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <h3 className="font-bold text-base mb-4">Edit / Add Menu Item</h3>
            <form onSubmit={handleSaveMenuForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Category</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                  >
                    {['Beers', 'Soft Drinks', 'Wines', 'Whisky', 'Cocktails', 'Juices', 'Water', 'Coffee', 'Tea', 'Food', 'Pool Services', 'Sauna Services'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    placeholder="Bottle, Glass, Ticket"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Waiter Modal */}
      {editingWaiter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border transition-colors ${
            darkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            <h3 className="font-bold text-base mb-4">Edit / Add Waiter</h3>
            <form onSubmit={handleSaveWaiterForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Waiter Full Name</label>
                <input
                  type="text"
                  required
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={waiterPhone}
                  onChange={(e) => setWaiterPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Assigned Shift</label>
                <select
                  value={waiterShift}
                  onChange={(e) => setWaiterShift(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-bold"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWaiter(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                >
                  Save Waiter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
