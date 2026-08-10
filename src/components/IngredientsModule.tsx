import React, { useState, useRef } from 'react';
import { 
  KitchenIngredient, KitchenIngredientCategory, StockMovementRecord, 
  KitchenWasteRecord, Recipe, AppUser 
} from '../types';
import { formatCurrency } from '../lib/currency';
import { printReportHTML } from '../lib/exporter';
import * as XLSX from 'xlsx';
import { 
  Boxes, Plus, Edit2, Trash2, Search, Filter, Download, Upload, 
  Eye, AlertTriangle, CheckCircle2, XCircle, RefreshCw, FileSpreadsheet, 
  Printer, ArrowUpRight, ArrowDownRight, Layers, DollarSign, Calendar, 
  Building2, Tag, Scale, History, BookOpen, AlertCircle, Clock, ShieldAlert, Sparkles 
} from 'lucide-react';

interface IngredientsModuleProps {
  ingredients: KitchenIngredient[];
  recipes?: Recipe[];
  stockMovements?: StockMovementRecord[];
  wasteRecords?: KitchenWasteRecord[];
  onSaveIngredients: (ingredients: KitchenIngredient[]) => void;
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

const CATEGORIES: KitchenIngredientCategory[] = [
  'Meat & Poultry',
  'Grains & Rice',
  'Vegetables & Produce',
  'Spices & Oils',
  'Dairy & Eggs',
  'Seafood',
  'Beverage Raw Materials',
  'Other Raw Materials'
];

export const IngredientsModule: React.FC<IngredientsModuleProps> = ({
  ingredients,
  recipes = [],
  stockMovements = [],
  wasteRecords = [],
  onSaveIngredients,
  loggedInUser,
  darkMode = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<KitchenIngredient | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<KitchenIngredientCategory>('Meat & Poultry');
  const [formStockQty, setFormStockQty] = useState<number>(10);
  const [formUnit, setFormUnit] = useState('Kg');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('Kg');
  const [formRecipeUnit, setFormRecipeUnit] = useState('g');
  const [formConversionRate, setFormConversionRate] = useState<number>(1000);
  const [formCostPerUnit, setFormCostPerUnit] = useState<number>(2500);
  const [formAvgCost, setFormAvgCost] = useState<number>(2500);
  const [formMinAlert, setFormMinAlert] = useState<number>(5);
  const [formReorderLevel, setFormReorderLevel] = useState<number>(10);
  const [formSupplier, setFormSupplier] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formBatchNo, setFormBatchNo] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Details Drawer State
  const [viewingIngredient, setViewingIngredient] = useState<KitchenIngredient | null>(null);
  const [detailsTab, setDetailsTab] = useState<'overview' | 'recipes' | 'movements' | 'waste'>('overview');

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Protected Delete Warning State
  const [deleteWarningModal, setDeleteWarningModal] = useState<{
    open: boolean;
    ingredient: KitchenIngredient | null;
    usedInRecipes: Recipe[];
  }>({ open: false, ingredient: null, usedInRecipes: [] });

  // Reset & Open Form
  const handleOpenAdd = () => {
    setEditingIngredient(null);
    setFormCode(`ING-${(ingredients.length + 1).toString().padStart(2, '0')}`);
    setFormBarcode('');
    setFormName('');
    setFormCategory('Meat & Poultry');
    setFormStockQty(10);
    setFormUnit('Kg');
    setFormPurchaseUnit('Kg');
    setFormRecipeUnit('g');
    setFormConversionRate(1000);
    setFormCostPerUnit(2500);
    setFormAvgCost(2500);
    setFormMinAlert(5);
    setFormReorderLevel(10);
    setFormSupplier('');
    setFormExpiryDate('');
    setFormBatchNo('');
    setFormNotes('');
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (ing: KitchenIngredient) => {
    setEditingIngredient(ing);
    setFormCode(ing.code || '');
    setFormBarcode(ing.batchNumber || '');
    setFormName(ing.name);
    setFormCategory(ing.category);
    setFormStockQty(ing.stockQuantity);
    setFormUnit(ing.unit);
    setFormPurchaseUnit(ing.purchaseUnit || ing.unit);
    setFormRecipeUnit(ing.recipeUnit || 'g');
    setFormConversionRate(ing.conversionRate || 1000);
    setFormCostPerUnit(ing.costPerUnit);
    setFormAvgCost(ing.averageCost || ing.costPerUnit);
    setFormMinAlert(ing.minStockAlert);
    setFormReorderLevel(ing.minStockAlert * 1.5);
    setFormSupplier(ing.supplier || '');
    setFormExpiryDate(ing.expiryDate || '');
    setFormBatchNo(ing.batchNumber || '');
    setFormNotes(ing.notes || '');
    setShowAddEditModal(true);
  };

  // Save Ingredient (Create or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter ingredient name');
      return;
    }

    const status: 'Available' | 'Low Stock' | 'Out of Stock' = 
      formStockQty <= 0 ? 'Out of Stock' :
      formStockQty <= formMinAlert ? 'Low Stock' : 'Available';

    if (editingIngredient) {
      // Update existing
      const updated = ingredients.map(item => {
        if (item.id === editingIngredient.id) {
          return {
            ...item,
            code: formCode,
            name: formName.trim(),
            category: formCategory,
            stockQuantity: formStockQty,
            unit: formUnit,
            purchaseUnit: formPurchaseUnit,
            recipeUnit: formRecipeUnit,
            conversionRate: formConversionRate,
            costPerUnit: formCostPerUnit,
            averageCost: formAvgCost,
            minStockAlert: formMinAlert,
            supplier: formSupplier,
            expiryDate: formExpiryDate,
            batchNumber: formBatchNo || formBarcode,
            notes: formNotes,
            status,
            lastRestocked: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      });
      onSaveIngredients(updated);
    } else {
      // Create new
      const newIng: KitchenIngredient = {
        id: `ing-${Date.now()}`,
        code: formCode || `ING-${Math.floor(10 + Math.random() * 90)}`,
        name: formName.trim(),
        category: formCategory,
        stockQuantity: formStockQty,
        unit: formUnit,
        purchaseUnit: formPurchaseUnit,
        recipeUnit: formRecipeUnit,
        conversionRate: formConversionRate,
        costPerUnit: formCostPerUnit,
        averageCost: formAvgCost,
        minStockAlert: formMinAlert,
        supplier: formSupplier,
        expiryDate: formExpiryDate,
        batchNumber: formBatchNo || formBarcode,
        notes: formNotes,
        status,
        lastRestocked: new Date().toISOString().split('T')[0]
      };
      onSaveIngredients([newIng, ...ingredients]);
    }

    // Reset active filters so user immediately sees newly added/edited ingredient
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setShowAddEditModal(false);
  };

  // Delete Ingredient with Usage Check
  const handleDeleteCheck = (ing: KitchenIngredient) => {
    // Check if ingredient is used in any recipes
    const usedIn = recipes.filter(r => 
      r.ingredients && r.ingredients.some(ri => 
        ri.ingredientId === ing.id || ri.ingredientName.toLowerCase() === ing.name.toLowerCase()
      )
    );

    if (usedIn.length > 0) {
      setDeleteWarningModal({
        open: true,
        ingredient: ing,
        usedInRecipes: usedIn
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ingredient "${ing.name}"? This action cannot be undone.`)) {
      const filtered = ingredients.filter(i => i.id !== ing.id);
      onSaveIngredients(filtered);
    }
  };

  // Import Excel / CSV Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setImportedRows(data);
        setShowImportModal(true);
      } catch (err) {
        alert('Failed to parse file. Please upload a valid Excel or CSV spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (importedRows.length === 0) return;

    const newIngredients: KitchenIngredient[] = [...ingredients];

    importedRows.forEach((row, idx) => {
      const name = row['Name'] || row['Ingredient Name'] || row['name'] || `Raw Material ${idx + 1}`;
      const code = row['Code'] || row['Item Code'] || `ING-IMP-${idx + 1}`;
      const category = (row['Category'] as KitchenIngredientCategory) || 'Meat & Poultry';
      const stock = Number(row['Stock'] || row['Current Stock'] || row['Quantity'] || 10);
      const unit = row['Unit'] || 'Kg';
      const cost = Number(row['Cost'] || row['Cost Per Unit'] || row['Price'] || 1000);
      const minAlert = Number(row['Min Alert'] || row['Reorder Level'] || 5);
      const supplier = row['Supplier'] || '';

      const status: 'Available' | 'Low Stock' | 'Out of Stock' = 
        stock <= 0 ? 'Out of Stock' : stock <= minAlert ? 'Low Stock' : 'Available';

      const existingIndex = newIngredients.findIndex(i => i.name.toLowerCase() === name.toString().toLowerCase());

      if (existingIndex >= 0) {
        newIngredients[existingIndex] = {
          ...newIngredients[existingIndex],
          stockQuantity: stock,
          costPerUnit: cost,
          unit,
          minStockAlert: minAlert,
          supplier: supplier || newIngredients[existingIndex].supplier,
          status
        };
      } else {
        newIngredients.push({
          id: `ing-imp-${Date.now()}-${idx}`,
          code,
          name: name.toString(),
          category,
          stockQuantity: stock,
          unit,
          purchaseUnit: unit,
          recipeUnit: 'g',
          conversionRate: 1000,
          costPerUnit: cost,
          averageCost: cost,
          minStockAlert: minAlert,
          supplier,
          status,
          lastRestocked: new Date().toISOString().split('T')[0]
        });
      }
    });

    onSaveIngredients(newIngredients);
    setShowImportModal(false);
    setImportedRows([]);
    alert(`Successfully imported/updated ${importedRows.length} kitchen ingredients!`);
  };

  // Export to Excel / CSV / Print PDF
  const handleExportExcel = () => {
    const exportData = filteredIngredients.map(ing => ({
      'Code': ing.code || '',
      'Name': ing.name,
      'Category': ing.category,
      'Current Stock': ing.stockQuantity,
      'Unit': ing.unit,
      'Min Stock Alert': ing.minStockAlert,
      'Cost per Unit (RWF)': ing.costPerUnit,
      'Total Valuation (RWF)': ing.stockQuantity * ing.costPerUnit,
      'Supplier': ing.supplier || '',
      'Expiry Date': ing.expiryDate || '',
      'Status': ing.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kitchen Ingredients');
    XLSX.writeFile(wb, `Kitchen_Ingredients_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintPDF = () => {
    const rowsHTML = filteredIngredients.map((ing, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold;">${ing.code || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold;">${ing.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${ing.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold;">${ing.stockQuantity} ${ing.unit}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;">${formatCurrency(ing.costPerUnit)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold;">${formatCurrency(ing.stockQuantity * ing.costPerUnit)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${ing.supplier || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${
            ing.status === 'Available' ? '#d1fae5; color: #065f46' : ing.status === 'Low Stock' ? '#fef3c7; color: #92400e' : '#fee2e2; color: #991b1b'
          }">${ing.status}</span>
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="padding: 20px;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          <h2 style="margin: 0; color: #1e293b; font-size: 20px;">SKY VIEW RESORT - KITCHEN INGREDIENTS MASTER REPORT</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 11px;">
              <th style="padding: 8px; text-align: left;">#</th>
              <th style="padding: 8px; text-align: left;">Code</th>
              <th style="padding: 8px; text-align: left;">Ingredient Name</th>
              <th style="padding: 8px; text-align: left;">Category</th>
              <th style="padding: 8px; text-align: right;">Current Stock</th>
              <th style="padding: 8px; text-align: right;">Cost / Unit</th>
              <th style="padding: 8px; text-align: right;">Total Valuation</th>
              <th style="padding: 8px; text-align: left;">Supplier</th>
              <th style="padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    printReportHTML('Kitchen Ingredients Report', htmlContent);
  };

  // Filtering Logic
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.code && ing.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ing.supplier && ing.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || ing.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || ing.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate Metrics
  const totalItems = ingredients.length;
  const totalValuation = ingredients.reduce((sum, ing) => sum + (ing.stockQuantity * ing.costPerUnit), 0);
  const lowStockCount = ingredients.filter(i => i.status === 'Low Stock').length;
  const outOfStockCount = ingredients.filter(i => i.status === 'Out of Stock').length;

  return (
    <div className={`p-4 sm:p-6 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                📦 Kitchen Raw Ingredients Inventory
              </h1>
              <p className="text-xs text-slate-400">
                Centralized management of kitchen raw materials, stock levels, suppliers & purchase history
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* File input for import */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Excel/CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Ingredient</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Raw Items</span>
            <Layers className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black">{totalItems}</div>
          <p className="text-[10px] text-slate-500 mt-1">Kitchen stock catalog</p>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Valuation</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-400">{formatCurrency(totalValuation)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Total raw stock value</p>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{lowStockCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">Below minimum threshold</p>
        </div>

        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of Stock</span>
            <XCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-500">{outOfStockCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">Needs urgent restocking</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border mb-6 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ingredient name, code, barcode, supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold outline-none border transition-colors ${
              darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Ingredients List Table */}
      <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <th className="py-3 px-4">Code / Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Cost / Unit</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold">No kitchen ingredients found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const val = ing.stockQuantity * ing.costPerUnit;
                  const isLow = ing.status === 'Low Stock';
                  const isOut = ing.status === 'Out of Stock';

                  return (
                    <tr 
                      key={ing.id} 
                      className={`transition-colors ${
                        darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-xl border ${
                            isOut ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                            isLow ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-slate-800 border-slate-700 text-amber-400'
                          }`}>
                            <Boxes className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-black text-white flex items-center space-x-2">
                              <span>{ing.name}</span>
                              {ing.code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  {ing.code}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Min Alert: {ing.minStockAlert} {ing.unit} | Unit: {ing.unit}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px]">
                          {ing.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black">
                        <span className={`font-mono ${isOut ? 'text-rose-500 font-extrabold' : isLow ? 'text-amber-400 font-extrabold' : 'text-emerald-400'}`}>
                          {ing.stockQuantity} {ing.unit}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-300">
                        {formatCurrency(ing.costPerUnit)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        {formatCurrency(val)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-medium">
                        {ing.supplier || <span className="text-slate-600 italic">Unspecified</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border flex items-center w-fit space-x-1 ${
                          isOut ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                          isLow ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {isOut ? <XCircle className="w-3 h-3 inline mr-1" /> :
                           isLow ? <AlertTriangle className="w-3 h-3 inline mr-1" /> :
                           <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                          <span>{ing.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setViewingIngredient(ing);
                              setDetailsTab('overview');
                            }}
                            title="View Ingredient History & Recipes"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(ing)}
                            title="Edit Ingredient"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCheck(ing)}
                            title="Delete Ingredient"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors cursor-pointer"
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

      {/* Add / Edit Ingredient Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingIngredient ? 'Edit Raw Ingredient' : 'Add New Kitchen Raw Ingredient'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure stock parameters, supplier & costing</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Ingredient Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="ING-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Barcode / Batch No</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="893201923..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Ingredient Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Chicken Meat, White Rice, Cooking Oil..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as KitchenIngredientCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Store Base Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500 cursor-pointer font-bold"
                  >
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="Litre">Litre (Liters)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="Piece">Piece / Pcs</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Box">Box / Carton</option>
                    <option value="Pack">Pack / Packet</option>
                    <option value="Tray">Tray</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Current Stock Balance ({formUnit})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Minimum Stock Alert ({formUnit})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Cost Per Base Unit (RWF)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={formCostPerUnit}
                    onChange={(e) => setFormCostPerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. Inyange Foods / Local Market"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={formBatchNo}
                    onChange={(e) => setFormBatchNo(e.target.value)}
                    placeholder="BATCH-2026-08"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Storage Notes / Details</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Additional storage instructions..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {editingIngredient ? 'Save Changes' : 'Add Raw Ingredient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Ingredient Details Drawer / Modal */}
      {viewingIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">{viewingIngredient.name}</h3>
                  <p className="text-xs text-slate-400">
                    Category: {viewingIngredient.category} | Code: {viewingIngredient.code || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingIngredient(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation tabs inside detail modal */}
            <div className="flex space-x-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setDetailsTab('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  detailsTab === 'overview' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Overview & Specs
              </button>
              <button
                onClick={() => setDetailsTab('recipes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  detailsTab === 'recipes' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Used in Recipes ({recipes.filter(r => r.ingredients && r.ingredients.some(ri => ri.ingredientId === viewingIngredient.id || ri.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase())).length})
              </button>
              <button
                onClick={() => setDetailsTab('movements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  detailsTab === 'movements' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Stock Movement History
              </button>
            </div>

            {/* Tab 1: Overview */}
            {detailsTab === 'overview' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Current Stock</span>
                  <span className="font-mono font-black text-sm text-emerald-400">{viewingIngredient.stockQuantity} {viewingIngredient.unit}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Cost Per Unit</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(viewingIngredient.costPerUnit)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Total Stock Value</span>
                  <span className="font-mono font-black text-emerald-400">{formatCurrency(viewingIngredient.stockQuantity * viewingIngredient.costPerUnit)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Min Stock Alert</span>
                  <span className="font-mono font-bold text-amber-400">{viewingIngredient.minStockAlert} {viewingIngredient.unit}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Supplier</span>
                  <span className="font-bold text-slate-200">{viewingIngredient.supplier || 'Not set'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-bold">Status</span>
                  <span className="font-bold text-slate-200">{viewingIngredient.status}</span>
                </div>
              </div>
            )}

            {/* Tab 2: Which Recipes Use This Ingredient */}
            {detailsTab === 'recipes' && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-400">Recipes containing <strong>{viewingIngredient.name}</strong>:</p>
                {recipes.filter(r => r.ingredients && r.ingredients.some(ri => ri.ingredientId === viewingIngredient.id || ri.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase())).length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No active recipes use this raw ingredient yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recipes
                      .filter(r => r.ingredients && r.ingredients.some(ri => ri.ingredientId === viewingIngredient.id || ri.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase()))
                      .map(rec => {
                        const item = rec.ingredients.find(ri => ri.ingredientId === viewingIngredient.id || ri.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase());
                        return (
                          <div key={rec.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-amber-400">{rec.name} ({rec.code})</p>
                              <p className="text-[10px] text-slate-500">Linked Menu: {rec.linkedMenuItemName || 'Unlinked'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-white">{item?.quantity} {item?.unit} / serving</p>
                              <p className="text-[10px] text-emerald-400">Yield: {rec.yieldServings || 1} portion(s)</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Stock Movement Ledger */}
            {detailsTab === 'movements' && (
              <div className="space-y-2 pt-2 max-h-60 overflow-y-auto">
                {stockMovements.filter(m => m.ingredientId === viewingIngredient.id || m.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase()).length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No recorded stock movements for this raw material yet.</p>
                ) : (
                  stockMovements
                    .filter(m => m.ingredientId === viewingIngredient.id || m.ingredientName.toLowerCase() === viewingIngredient.name.toLowerCase())
                    .map(m => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{m.movementType}</p>
                          <p className="text-[10px] text-slate-500">{m.date} {m.time} | Ref: {m.referenceNumber || 'N/A'} | User: {m.user}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold ${m.quantityIn > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.quantityIn > 0 ? `+${m.quantityIn}` : `-${m.quantityOut}`} {m.unit}
                          </span>
                          <p className="text-[10px] text-slate-500">Bal: {m.remainingBalance} {m.unit}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                <h3 className="font-black text-base text-white">Import Ingredients Preview</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Found <strong>{importedRows.length}</strong> items in <code>{importFileName}</code>. Click confirm to merge into kitchen inventory catalog.
            </p>

            <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl p-2 bg-slate-950 text-xs">
              {importedRows.slice(0, 5).map((row, idx) => (
                <div key={idx} className="p-1.5 border-b border-slate-800/60 font-mono text-[11px] text-slate-300">
                  {row['Name'] || row['Ingredient Name'] || 'Item'} — {row['Stock'] || row['Quantity'] || 10} {row['Unit'] || 'Kg'} @ {row['Cost'] || 1000} RWF
                </div>
              ))}
              {importedRows.length > 5 && (
                <p className="text-[10px] text-slate-500 pt-1 text-center">...and {importedRows.length - 5} more items</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black cursor-pointer"
              >
                Confirm Import ({importedRows.length} items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Delete Warning Modal */}
      {deleteWarningModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 pb-2 border-b border-slate-800">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
              <div>
                <h3 className="font-black text-base text-white">Cannot Delete Ingredient</h3>
                <p className="text-xs text-rose-400">Ingredient is currently used in active recipes</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              You cannot delete <strong>"{deleteWarningModal.ingredient?.name}"</strong> because it is linked to the following recipes:
            </p>

            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-800 rounded-2xl p-2 bg-slate-950 text-xs">
              {deleteWarningModal.usedInRecipes.map(r => (
                <div key={r.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-bold text-amber-400 flex items-center justify-between">
                  <span>{r.name}</span>
                  <span className="text-[10px] text-slate-500">{r.code}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Please remove this ingredient from these recipes first if you wish to permanently delete it.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDeleteWarningModal({ open: false, ingredient: null, usedInRecipes: [] })}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
