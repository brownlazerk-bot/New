import React, { useState } from 'react';
import { 
  Recipe, RecipeIngredient, KitchenIngredient, MenuItem, 
  RecipeVersionRecord, AppUser 
} from '../types';
import { formatCurrency } from '../lib/currency';
import { 
  convertRecipeQtyToStoreQty, calculateEffectiveRecipeQty, calculateRecipeIngredientCost 
} from '../lib/unitConversion';
import { printReportHTML } from '../lib/exporter';
import { 
  Utensils, Plus, Edit2, Trash2, Copy, Printer, Search, Filter, 
  DollarSign, Calculator, Layers, CheckCircle2, XCircle, History, 
  BookOpen, Sparkles, AlertCircle, ArrowUpRight, Clock, User, ChevronRight, FileText 
} from 'lucide-react';

interface RecipeModuleProps {
  recipes: Recipe[];
  ingredients: KitchenIngredient[];
  menuItems: MenuItem[];
  onSaveRecipes: (recipes: Recipe[]) => void;
  onSaveMenuItems?: (menuItems: MenuItem[]) => void;
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

export const RecipeModule: React.FC<RecipeModuleProps> = ({
  recipes,
  ingredients,
  menuItems,
  onSaveRecipes,
  onSaveMenuItems,
  loggedInUser,
  darkMode = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal States
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Form draft state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLinkedMenuItemId, setFormLinkedMenuItemId] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formYieldServings, setFormYieldServings] = useState<number>(1);
  const [formIngredientsDraft, setFormIngredientsDraft] = useState<RecipeIngredient[]>([]);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [changeSummary, setChangeSummary] = useState('');

  // Cost Analysis Modal State
  const [analyzingRecipe, setAnalyzingRecipe] = useState<Recipe | null>(null);

  // Version History Modal State
  const [historyRecipe, setHistoryRecipe] = useState<Recipe | null>(null);

  // Print Recipe Modal State
  const [printRecipeModal, setPrintRecipeModal] = useState<{
    open: boolean;
    recipe: Recipe | null;
    scalePortions: number;
  }>({ open: false, recipe: null, scalePortions: 1 });

  // Open Create Recipe
  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setFormCode(`REC-${(recipes.length + 101).toString()}`);
    setFormName('');
    setFormLinkedMenuItemId('');
    setFormInstructions('');
    setFormYieldServings(1);
    setFormIngredientsDraft([]);
    setFormStatus('Active');
    setChangeSummary('Initial recipe creation');
    setShowEditorModal(true);
  };

  // Open Edit Recipe
  const handleOpenEdit = (rec: Recipe) => {
    setEditingRecipe(rec);
    setFormCode(rec.code);
    setFormName(rec.name);
    setFormLinkedMenuItemId(rec.linkedMenuItemId || '');
    setFormInstructions(rec.instructions || '');
    setFormYieldServings(rec.yieldServings || 1);
    setFormIngredientsDraft(rec.ingredients ? [...rec.ingredients] : []);
    setFormStatus(rec.status);
    setChangeSummary('');
    setShowEditorModal(true);
  };

  // Add Line Ingredient to Draft
  const handleAddIngredientRow = () => {
    if (ingredients.length === 0) {
      alert('Please add kitchen raw ingredients in the Ingredients module first.');
      return;
    }

    const firstIng = ingredients[0];
    const newRow: RecipeIngredient = {
      id: `ri-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: firstIng.id,
      ingredientName: firstIng.name,
      quantity: 100,
      unit: firstIng.recipeUnit || 'g',
      costPerUnit: firstIng.costPerUnit,
      wastePercentage: 5,
      yieldPercentage: 95,
      preparationNotes: '',
      active: true
    };
    setFormIngredientsDraft([...formIngredientsDraft, newRow]);
  };

  // Update Ingredient Row in Draft
  const handleUpdateIngredientRow = (index: number, updates: Partial<RecipeIngredient>) => {
    const updated = [...formIngredientsDraft];

    if (updates.ingredientId) {
      const selectedIng = ingredients.find(g => g.id === updates.ingredientId);
      if (selectedIng) {
        updates.ingredientName = selectedIng.name;
        updates.unit = selectedIng.recipeUnit || 'g';
        updates.costPerUnit = selectedIng.costPerUnit;
      }
    }

    updated[index] = { ...updated[index], ...updates };
    setFormIngredientsDraft(updated);
  };

  // Remove Ingredient Row
  const handleRemoveIngredientRow = (index: number) => {
    const updated = formIngredientsDraft.filter((_, i) => i !== index);
    setFormIngredientsDraft(updated);
  };

  // Calculate total food cost for a recipe draft or recipe object
  const calculateTotalFoodCost = (recipeIngs: RecipeIngredient[]) => {
    return recipeIngs.reduce((sum, item) => {
      const ing = ingredients.find(
        g => g.id === item.ingredientId || g.name.toLowerCase() === item.ingredientName.toLowerCase()
      );
      const lineCost = calculateRecipeIngredientCost(item, ing);
      return sum + lineCost;
    }, 0);
  };

  // Save Recipe (Create or Update with Version History)
  const handleSaveRecipeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter recipe name');
      return;
    }

    const linkedMenu = menuItems.find(m => m.id === formLinkedMenuItemId);
    const now = new Date().toISOString();

    if (editingRecipe) {
      // Update existing recipe & record version history snapshot
      const nextVersion = (editingRecipe.version || 1) + 1;
      const historySnapshot: RecipeVersionRecord = {
        version: editingRecipe.version || 1,
        updatedAt: editingRecipe.updatedAt || now,
        updatedBy: editingRecipe.updatedBy || loggedInUser?.fullName || 'System Chef',
        changeSummary: changeSummary || 'Recipe details updated',
        ingredients: [...editingRecipe.ingredients],
        instructions: editingRecipe.instructions,
        yieldServings: editingRecipe.yieldServings
      };

      const updatedRecipe: Recipe = {
        ...editingRecipe,
        code: formCode,
        name: formName.trim(),
        linkedMenuItemId: formLinkedMenuItemId || undefined,
        linkedMenuItemName: linkedMenu ? linkedMenu.name : undefined,
        instructions: formInstructions,
        yieldServings: formYieldServings,
        ingredients: formIngredientsDraft,
        status: formStatus,
        version: nextVersion,
        history: [historySnapshot, ...(editingRecipe.history || [])],
        updatedAt: now,
        updatedBy: loggedInUser?.fullName || 'System Chef'
      };

      const newRecipesList = recipes.map(r => r.id === editingRecipe.id ? updatedRecipe : r);
      onSaveRecipes(newRecipesList);

      // Also sync linked MenuItem if present
      if (formLinkedMenuItemId && onSaveMenuItems) {
        const updatedMenuItems = menuItems.map(m => {
          if (m.id === formLinkedMenuItemId) {
            return {
              ...m,
              hasRecipe: true,
              recipeId: updatedRecipe.id,
              recipe: formIngredientsDraft
            };
          }
          return m;
        });
        onSaveMenuItems(updatedMenuItems);
      }
    } else {
      // Create new recipe
      const newRecipe: Recipe = {
        id: `rec-${Date.now()}`,
        code: formCode || `REC-${Math.floor(100 + Math.random() * 900)}`,
        name: formName.trim(),
        linkedMenuItemId: formLinkedMenuItemId || undefined,
        linkedMenuItemName: linkedMenu ? linkedMenu.name : undefined,
        instructions: formInstructions,
        yieldServings: formYieldServings,
        ingredients: formIngredientsDraft,
        status: formStatus,
        version: 1,
        history: [],
        createdAt: now,
        updatedAt: now,
        createdBy: loggedInUser?.fullName || 'System Chef',
        updatedBy: loggedInUser?.fullName || 'System Chef'
      };

      onSaveRecipes([newRecipe, ...recipes]);

      if (formLinkedMenuItemId && onSaveMenuItems) {
        const updatedMenuItems = menuItems.map(m => {
          if (m.id === formLinkedMenuItemId) {
            return {
              ...m,
              hasRecipe: true,
              recipeId: newRecipe.id,
              recipe: formIngredientsDraft
            };
          }
          return m;
        });
        onSaveMenuItems(updatedMenuItems);
      }
    }

    setShowEditorModal(false);
  };

  // Duplicate Recipe
  const handleDuplicateRecipe = (rec: Recipe) => {
    const duplicated: Recipe = {
      ...rec,
      id: `rec-${Date.now()}`,
      code: `${rec.code}-COPY`,
      name: `${rec.name} (Copy)`,
      linkedMenuItemId: undefined,
      linkedMenuItemName: undefined,
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: loggedInUser?.fullName || 'System Chef'
    };
    onSaveRecipes([duplicated, ...recipes]);
  };

  // Delete Recipe
  const handleDeleteRecipe = (rec: Recipe) => {
    if (window.confirm(`Are you sure you want to delete recipe "${rec.name}"?`)) {
      const filtered = recipes.filter(r => r.id !== rec.id);
      onSaveRecipes(filtered);
    }
  };

  // Print Scaled Recipe
  const handlePrintRecipeSheet = (recipe: Recipe, portions: number = 1) => {
    const scale = portions / (recipe.yieldServings || 1);
    const totalCost = calculateTotalFoodCost(recipe.ingredients) * scale;

    const ingRows = recipe.ingredients.map((ri, idx) => {
      const scaledQty = ri.quantity * scale;
      const ing = ingredients.find(g => g.id === ri.ingredientId || g.name.toLowerCase() === ri.ingredientName.toLowerCase());
      const cost = calculateRecipeIngredientCost(ri, ing) * scale;

      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold;">${ri.ingredientName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; text-align: right; color: #d97706;">${scaledQty.toFixed(2)} ${ri.unit}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;">${formatCurrency(cost)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${ri.preparationNotes || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="padding: 24px; font-family: system-ui, sans-serif;">
        <div style="border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 22px; color: #0f172a;">SKY VIEW RESORT — KITCHEN RECIPE SHEET</h2>
          <h3 style="margin: 4px 0 0 0; color: #d97706; font-size: 16px;">${recipe.name} (${recipe.code})</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
            Scaled for: <strong>${portions} Portion(s)</strong> | Version: v${recipe.version} | Estimated Raw Cost: <strong>${formatCurrency(totalCost)}</strong>
          </p>
        </div>

        <h4 style="margin-bottom: 8px; font-size: 14px; color: #1e293b;">Raw Ingredients Needed:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 11px;">
              <th style="padding: 8px; text-align: left;">#</th>
              <th style="padding: 8px; text-align: left;">Ingredient Name</th>
              <th style="padding: 8px; text-align: right;">Quantity Required</th>
              <th style="padding: 8px; text-align: right;">Line Raw Cost</th>
              <th style="padding: 8px; text-align: left;">Preparation Notes</th>
            </tr>
          </thead>
          <tbody>
            ${ingRows}
          </tbody>
        </table>

        ${recipe.instructions ? `
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #0f172a;">Preparation Instructions:</h4>
            <p style="margin: 0; font-size: 12px; white-space: pre-line; color: #334155;">${recipe.instructions}</p>
          </div>
        ` : ''}
      </div>
    `;

    printReportHTML(`Recipe Sheet — ${recipe.name}`, html);
  };

  // Filter recipes
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.linkedMenuItemName && r.linkedMenuItemName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level stats
  const totalRecipesCount = recipes.length;
  const activeRecipesCount = recipes.filter(r => r.status === 'Active').length;
  const avgCost = recipes.length > 0
    ? recipes.reduce((sum, r) => sum + calculateTotalFoodCost(r.ingredients), 0) / recipes.length
    : 0;

  return (
    <div className={`p-4 sm:p-6 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              👨‍🍳 Recipe Management Module
            </h1>
            <p className="text-xs text-slate-400">
              Standalone master recipe catalog, raw material cost breakdown & version history
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create Master Recipe</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Master Recipes</span>
          <div className="text-2xl font-black">{totalRecipesCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Menu Recipes</span>
          <div className="text-2xl font-black text-emerald-400">{activeRecipesCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Raw Food Cost</span>
          <div className="text-xl font-black text-amber-400">{formatCurrency(avgCost)}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Catalog Status</span>
          <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1 mt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready for POS sales</span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className={`p-4 rounded-2xl border mb-6 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipes by name, code, or linked menu item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-semibold outline-none border transition-colors ${
              darkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Recipes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-bold">No recipes found in master catalog.</p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => {
            const rawCost = calculateTotalFoodCost(recipe.ingredients);
            const linkedMenuItem = menuItems.find(m => m.id === recipe.linkedMenuItemId);
            const sellingPrice = linkedMenuItem ? linkedMenuItem.price : 0;
            const profit = sellingPrice > 0 ? sellingPrice - rawCost : 0;
            const marginPct = sellingPrice > 0 ? ((profit / sellingPrice) * 100).toFixed(1) : '0';

            return (
              <div 
                key={recipe.id}
                className={`p-5 rounded-3xl border transition-all duration-200 ${
                  darkMode ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                } shadow-sm space-y-4 flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold">
                          {recipe.code}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">v{recipe.version}</span>
                      </div>
                      <h3 className="font-black text-base text-white mt-1">{recipe.name}</h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                      recipe.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {recipe.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1">
                    Linked Menu: <strong className="text-slate-200">{recipe.linkedMenuItemName || 'Not Linked'}</strong>
                  </p>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block font-bold">Raw Food Cost</span>
                      <span className="font-mono font-black text-amber-400">{formatCurrency(rawCost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block font-bold">Selling Price</span>
                      <span className="font-mono font-bold text-white">{sellingPrice > 0 ? formatCurrency(sellingPrice) : 'N/A'}</span>
                    </div>
                    {sellingPrice > 0 && (
                      <div className="col-span-2 pt-1 border-t border-slate-800/80 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Profit Margin:</span>
                        <span className="font-mono font-bold text-emerald-400">{formatCurrency(profit)} ({marginPct}%)</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-slate-300">Ingredients ({recipe.ingredients ? recipe.ingredients.length : 0}):</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {recipe.ingredients && recipe.ingredients.slice(0, 4).map((ri, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                          {ri.ingredientName} ({ri.quantity}{ri.unit})
                        </span>
                      ))}
                      {recipe.ingredients && recipe.ingredients.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                          +{recipe.ingredients.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(recipe)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors cursor-pointer"
                      title="Edit Recipe"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDuplicateRecipe(recipe)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors cursor-pointer"
                      title="Duplicate Recipe"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setHistoryRecipe(recipe)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors cursor-pointer"
                      title="Version History"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePrintRecipeSheet(recipe, 1)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors cursor-pointer"
                      title="Print Recipe Sheet"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteRecipe(recipe)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors cursor-pointer"
                    title="Delete Recipe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingRecipe ? `Edit Recipe — ${editingRecipe.name} (v${editingRecipe.version + 1})` : 'Create New Master Recipe'}
                  </h3>
                  <p className="text-xs text-slate-400">Add raw materials from Ingredients module & configure quantities</p>
                </div>
              </div>
              <button onClick={() => setShowEditorModal(false)} className="text-slate-400 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveRecipeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Recipe Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="REC-101"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Chicken Rice Special Recipe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Link to Menu Item</label>
                  <select
                    value={formLinkedMenuItemId}
                    onChange={(e) => setFormLinkedMenuItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Standalone (Unlinked) --</option>
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.price)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Yield (Portions / Servings)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formYieldServings}
                    onChange={(e) => setFormYieldServings(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500 cursor-pointer font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Recipe Raw Ingredients Builder Table */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                    <Layers className="w-4 h-4" />
                    <span>Raw Ingredients Composition</span>
                  </h4>

                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formIngredientsDraft.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                      No raw ingredients added yet. Click "+ Add Ingredient" above to select from Ingredients module.
                    </p>
                  ) : (
                    formIngredientsDraft.map((row, idx) => {
                      const ing = ingredients.find(g => g.id === row.ingredientId || g.name.toLowerCase() === row.ingredientName.toLowerCase());
                      const cost = calculateRecipeIngredientCost(row, ing);

                      return (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-5">
                              <label className="text-[10px] text-slate-500 block">Ingredient</label>
                              <select
                                value={row.ingredientId}
                                onChange={(e) => handleUpdateIngredientRow(idx, { ingredientId: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold outline-none"
                              >
                                {ingredients.map(g => (
                                  <option key={g.id} value={g.id}>{g.name} ({g.stockQuantity} {g.unit} in store)</option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[10px] text-slate-500 block">Quantity Per Serving</label>
                              <input
                                type="number"
                                step="0.01"
                                value={row.quantity}
                                onChange={(e) => handleUpdateIngredientRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-bold outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="text-[10px] text-slate-500 block">Unit</label>
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => handleUpdateIngredientRow(idx, { unit: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2 text-right pt-2 sm:pt-0">
                              <span className="text-[10px] text-slate-500 block">Raw Cost</span>
                              <span className="font-mono font-bold text-emerald-400">{formatCurrency(cost)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                            <span className="text-slate-500">Waste: {row.wastePercentage || 0}% | Yield: {row.yieldPercentage || 100}%</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredientRow(idx)}
                              className="text-rose-400 hover:text-rose-300 cursor-pointer font-bold"
                            >
                              Remove Item
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-400">Total Calculated Raw Food Cost / Portion:</span>
                  <span className="font-mono text-base font-black text-amber-400">
                    {formatCurrency(calculateTotalFoodCost(formIngredientsDraft))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 text-xs">Chef Preparation Instructions</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Step-by-step cooking & preparation guidelines..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                />
              </div>

              {editingRecipe && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1 text-xs">Change Summary Note (for Version History)</label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="e.g. Adjusted chicken portion from 250g to 300g..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {editingRecipe ? 'Save Recipe Update' : 'Create Master Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {historyRecipe && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <History className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-black text-base text-white">Version History — {historyRecipe.name}</h3>
                  <p className="text-xs text-slate-400">Current active version: <strong>v{historyRecipe.version}</strong></p>
                </div>
              </div>
              <button onClick={() => setHistoryRecipe(null)} className="text-slate-400 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(!historyRecipe.history || historyRecipe.history.length === 0) ? (
                <p className="text-xs text-slate-500 py-6 text-center">No previous version history recorded for this recipe.</p>
              ) : (
                historyRecipe.history.map((h, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-indigo-400 font-mono">Version v{h.version}</span>
                      <span className="text-slate-500 text-[10px]">{new Date(h.updatedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 font-medium">By: {h.updatedBy}</p>
                    <p className="text-slate-400 italic text-[11px]">{h.changeSummary || 'Recipe updated'}</p>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Ingredients snapshot ({h.ingredients ? h.ingredients.length : 0}): {h.ingredients?.map(ing => ing.ingredientName).join(', ')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryRecipe(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
