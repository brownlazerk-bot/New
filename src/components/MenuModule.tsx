import React, { useState } from 'react';
import { MenuItem, Category, Recipe, AppUser, ItemStatus } from '../types';
import { formatCurrency } from '../lib/currency';
import { printReportHTML } from '../lib/exporter';
import * as XLSX from 'xlsx';
import { 
  BookOpen, Plus, Edit2, Trash2, Search, Filter, Download, 
  Printer, Link, Unlink, CheckCircle2, XCircle, DollarSign, 
  Tag, Image, Layers, Sparkles, Utensils, History, Percent, Clock 
} from 'lucide-react';

interface MenuModuleProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  onSaveMenuItems: (items: MenuItem[]) => void;
  onSaveRecipes?: (recipes: Recipe[]) => void;
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

const CATEGORIES: Category[] = [
  'Beers', 'Soft Drinks', 'Wines', 'Whisky', 'Cocktails', 'Juices', 
  'Water', 'Coffee', 'Tea', 'Food', 'Pool Services', 'Sauna Services', 
  'Room Services', 'Apartment Services', 'Other Services'
];

export const MenuModule: React.FC<MenuModuleProps> = ({
  menuItems,
  recipes,
  onSaveMenuItems,
  onSaveRecipes,
  loggedInUser,
  darkMode = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [hasRecipeFilter, setHasRecipeFilter] = useState<'All' | 'Linked' | 'Unlinked'>('All');

  // Add/Edit Menu Item Modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('Food');
  const [formPrice, setFormPrice] = useState<number>(3000);
  const [formCostPrice, setFormCostPrice] = useState<number>(1500);
  const [formTax, setFormTax] = useState<number>(18);
  const [formDepartment, setFormDepartment] = useState('Hot Kitchen');
  const [formUnit, setFormUnit] = useState('Serving');
  const [formStatus, setFormStatus] = useState<ItemStatus>('Available');
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Assign Recipe Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMenuItemForAssign, setSelectedMenuItemForAssign] = useState<MenuItem | null>(null);
  const [selectedRecipeIdToLink, setSelectedRecipeIdToLink] = useState<string>('');

  // Reset & Open Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('Food');
    setFormPrice(3000);
    setFormCostPrice(1500);
    setFormTax(18);
    setFormDepartment('Hot Kitchen');
    setFormUnit('Serving');
    setFormStatus('Available');
    setFormImage('');
    setFormDescription('');
    setShowAddEditModal(true);
  };

  // Open Edit Menu Item
  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormCostPrice(item.costPrice || 0);
    setFormTax(item.tax || 18);
    setFormDepartment(item.kitchenDepartment || 'Hot Kitchen');
    setFormUnit(item.unit || 'Serving');
    setFormStatus(item.status);
    setFormImage(item.image || '');
    setFormDescription(item.description || '');
    setShowAddEditModal(true);
  };

  // Save Menu Item
  const handleSaveMenuItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter menu item name');
      return;
    }

    if (editingItem) {
      const updated = menuItems.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formName.trim(),
            category: formCategory,
            price: formPrice,
            costPrice: formCostPrice,
            tax: formTax,
            kitchenDepartment: formDepartment,
            unit: formUnit,
            status: formStatus,
            image: formImage,
            description: formDescription,
            isFood: formCategory === 'Food' || formCategory === 'Room Services'
          };
        }
        return item;
      });
      onSaveMenuItems(updated);
    } else {
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        price: formPrice,
        costPrice: formCostPrice,
        tax: formTax,
        kitchenDepartment: formDepartment,
        stockQuantity: 100,
        unit: formUnit,
        status: formStatus,
        active: true,
        image: formImage,
        description: formDescription,
        isFood: formCategory === 'Food' || formCategory === 'Room Services',
        hasRecipe: false
      };
      onSaveMenuItems([newItem, ...menuItems]);
    }

    setShowAddEditModal(false);
  };

  // Open Assign Recipe Modal
  const handleOpenAssignRecipe = (item: MenuItem) => {
    setSelectedMenuItemForAssign(item);
    // Find if already linked to a recipe
    const currentLinkedRec = recipes.find(r => r.linkedMenuItemId === item.id || r.id === item.recipeId);
    setSelectedRecipeIdToLink(currentLinkedRec ? currentLinkedRec.id : '');
    setAssignModalOpen(true);
  };

  // Save Recipe Assignment Link
  const handleSaveRecipeAssignment = () => {
    if (!selectedMenuItemForAssign) return;

    const recipeToLink = recipes.find(r => r.id === selectedRecipeIdToLink);

    // Update menuItem
    const updatedMenuItems = menuItems.map(m => {
      if (m.id === selectedMenuItemForAssign.id) {
        if (recipeToLink) {
          return {
            ...m,
            hasRecipe: true,
            recipeId: recipeToLink.id,
            recipe: recipeToLink.ingredients
          };
        } else {
          return {
            ...m,
            hasRecipe: false,
            recipeId: undefined,
            recipe: []
          };
        }
      }
      return m;
    });

    onSaveMenuItems(updatedMenuItems);

    // Update recipe linkedMenuItemId
    if (onSaveRecipes) {
      const updatedRecipes = recipes.map(r => {
        if (recipeToLink && r.id === recipeToLink.id) {
          return {
            ...r,
            linkedMenuItemId: selectedMenuItemForAssign.id,
            linkedMenuItemName: selectedMenuItemForAssign.name
          };
        } else if (r.linkedMenuItemId === selectedMenuItemForAssign.id) {
          return {
            ...r,
            linkedMenuItemId: undefined,
            linkedMenuItemName: undefined
          };
        }
        return r;
      });
      onSaveRecipes(updatedRecipes);
    }

    setAssignModalOpen(false);
  };

  // Delete Menu Item
  const handleDeleteMenuItem = (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete menu product "${item.name}"?`)) {
      const filtered = menuItems.filter(m => m.id !== item.id);
      onSaveMenuItems(filtered);
    }
  };

  // Export Menu to Excel
  const handleExportExcel = () => {
    const exportData = filteredMenuItems.map(m => {
      const linkedRec = recipes.find(r => r.id === m.recipeId || r.linkedMenuItemId === m.id);
      return {
        'Name': m.name,
        'Category': m.category,
        'Selling Price (RWF)': m.price,
        'Tax (%)': m.tax || 18,
        'Kitchen Department': m.kitchenDepartment || 'Hot Kitchen',
        'Unit': m.unit,
        'Status': m.status,
        'Linked Recipe': linkedRec ? `${linkedRec.name} (${linkedRec.code})` : 'None'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu Catalog');
    XLSX.writeFile(wb, `Menu_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Print Menu PDF
  const handlePrintMenuPDF = () => {
    const rowsHTML = filteredMenuItems.map((m, i) => {
      const linkedRec = recipes.find(r => r.id === m.recipeId || r.linkedMenuItemId === m.id);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${i + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold;">${m.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${m.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold; color: #10b981;">${formatCurrency(m.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${m.kitchenDepartment || 'Hot Kitchen'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; color: #d97706;">
            ${linkedRec ? `${linkedRec.name} (${linkedRec.code})` : 'Unlinked'}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${m.status}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <div style="padding: 20px;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          <h2 style="margin: 0; color: #1e293b; font-size: 20px;">SKY VIEW RESORT — MENU PRODUCTS CATALOG</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Printed on: ${new Date().toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 11px;">
              <th style="padding: 8px; text-align: left;">#</th>
              <th style="padding: 8px; text-align: left;">Menu Name</th>
              <th style="padding: 8px; text-align: left;">Category</th>
              <th style="padding: 8px; text-align: right;">Selling Price</th>
              <th style="padding: 8px; text-align: left;">Department</th>
              <th style="padding: 8px; text-align: left;">Assigned Recipe</th>
              <th style="padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;

    printReportHTML('Menu Catalog Report', htmlContent);
  };

  // Filter Menu Items
  const filteredMenuItems = menuItems.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || m.status === selectedStatus;

    const hasLinkedRec = !!recipes.find(r => r.id === m.recipeId || r.linkedMenuItemId === m.id);
    const matchesRecipe = hasRecipeFilter === 'All' || (hasRecipeFilter === 'Linked' ? hasLinkedRec : !hasLinkedRec);

    return matchesSearch && matchesCategory && matchesStatus && matchesRecipe;
  });

  // Calculate Metrics
  const totalMenuCount = menuItems.length;
  const linkedRecipesCount = menuItems.filter(m => recipes.some(r => r.id === m.recipeId || r.linkedMenuItemId === m.id)).length;
  const availableCount = menuItems.filter(m => m.status === 'Available').length;

  return (
    <div className={`p-4 sm:p-6 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              🍽 Menu Management Module
            </h1>
            <p className="text-xs text-slate-400">
              Customer menu offerings, pricing, tax configuration & master recipe assignments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handlePrintMenuPDF}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Print Menu</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Product</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Menu Products</span>
          <div className="text-2xl font-black">{totalMenuCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Master Recipes</span>
          <div className="text-2xl font-black text-amber-400">{linkedRecipesCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Available Items</span>
          <div className="text-2xl font-black text-emerald-400">{availableCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Auto Deduct Status</span>
          <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1 mt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active POS auto-deduction</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border mb-6 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search menu items by name, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold outline-none border transition-colors ${
              darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={hasRecipeFilter}
            onChange={(e) => setHasRecipeFilter(e.target.value as any)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="All">All Recipe Links</option>
            <option value="Linked">Linked Recipes Only</option>
            <option value="Unlinked">Unlinked Only</option>
          </select>
        </div>
      </div>

      {/* Menu Table */}
      <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${darkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <th className="py-3 px-4">Menu Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Tax (%)</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Linked Master Recipe</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredMenuItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold">No menu products found matching filters.</p>
                  </td>
                </tr>
              ) : (
                filteredMenuItems.map((item) => {
                  const linkedRecipe = recipes.find(r => r.id === item.recipeId || r.linkedMenuItemId === item.id);

                  return (
                    <tr 
                      key={item.id}
                      className={`transition-colors ${
                        darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-black text-white">{item.name}</p>
                            <p className="text-[10px] text-slate-400">Unit: {item.unit || 'Portion'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                        {formatCurrency(item.price)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-300">
                        {item.tax || 18}%
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {item.kitchenDepartment || 'Hot Kitchen'}
                      </td>

                      <td className="py-3.5 px-4">
                        {linkedRecipe ? (
                          <div className="flex items-center space-x-2 text-amber-400 font-bold">
                            <Link className="w-3.5 h-3.5" />
                            <span>{linkedRecipe.name} ({linkedRecipe.code})</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-slate-500 font-medium">
                            <Unlink className="w-3.5 h-3.5" />
                            <span>No Recipe Assigned</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          item.status === 'Available' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenAssignRecipe(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                            title="Assign / Link Master Recipe"
                          >
                            <Link className="w-3.5 h-3.5" />
                            <span>Assign Recipe</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                            title="Edit Menu Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteMenuItem(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors cursor-pointer"
                            title="Delete Item"
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

      {/* Add / Edit Menu Item Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-base text-white">
                  {editingItem ? 'Edit Menu Product' : 'Add New Menu Product'}
                </h3>
              </div>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveMenuItemSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Menu Product Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Poulet Frit, Beef Brochettes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kitchen Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer"
                  >
                    <option value="Hot Kitchen">Hot Kitchen</option>
                    <option value="Grill & BBQ">Grill & BBQ</option>
                    <option value="Cold Kitchen & Salad">Cold Kitchen & Salad</option>
                    <option value="Pastry & Bakery">Pastry & Bakery</option>
                    <option value="Main Bar">Main Bar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Selling Price (RWF) *</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tax (%)</label>
                  <input
                    type="number"
                    value={formTax}
                    onChange={(e) => setFormTax(parseFloat(e.target.value) || 0)}
                    placeholder="18"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Portion / Serving / Bottle"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Availability Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ItemStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none cursor-pointer font-bold"
                  >
                    <option value="Available">Available</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Image URL</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Recipe Link Selector Modal */}
      {assignModalOpen && selectedMenuItemForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <Link className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-black text-base text-white">
                    Assign Recipe to "{selectedMenuItemForAssign.name}"
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a master recipe from Recipe Management module
                  </p>
                </div>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                Linking a recipe enables <strong>automatic inventory deduction</strong> whenever this item is sold in POS or Order Center.
              </p>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Select Master Recipe:</label>
                <select
                  value={selectedRecipeIdToLink}
                  onChange={(e) => setSelectedRecipeIdToLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none cursor-pointer focus:border-amber-500"
                >
                  <option value="">-- No Recipe Linked (Manual / Bar Item) --</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) — {r.ingredients ? r.ingredients.length : 0} ingredients
                    </option>
                  ))}
                </select>
              </div>

              {selectedRecipeIdToLink && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <p className="font-bold text-amber-400">Selected Recipe Preview:</p>
                  {(() => {
                    const r = recipes.find(rec => rec.id === selectedRecipeIdToLink);
                    if (!r) return null;
                    return (
                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <p>Name: <strong>{r.name}</strong> ({r.code})</p>
                        <p>Ingredients: {r.ingredients?.map(ri => ri.ingredientName).join(', ')}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecipeAssignment}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-1"
              >
                <Link className="w-4 h-4" />
                <span>Save Recipe Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
