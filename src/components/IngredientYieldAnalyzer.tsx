import React, { useState, useMemo } from 'react';
import { MenuItem, KitchenIngredient, RecipeIngredient, PurchaseOrder, AppUser } from '../types';
import { formatCurrency } from '../lib/currency';
import { convertRecipeQtyToStoreQty, calculateEffectiveRecipeQty } from '../lib/unitConversion';
import { printReportHTML } from '../lib/exporter';
import { 
  Utensils, Calculator, TrendingUp, AlertTriangle, CheckCircle2, XCircle, 
  Package, DollarSign, Printer, Search, Filter, Plus, ArrowUpRight, ShieldAlert,
  Flame, Sparkles, ChefHat, Layers, RefreshCw
} from 'lucide-react';

interface IngredientYieldAnalyzerProps {
  menuItems: MenuItem[];
  ingredients: KitchenIngredient[];
  onCreatePurchaseOrder?: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'timestamp'>) => void;
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

export interface RecipeYieldAnalysis {
  menuItem: MenuItem;
  recipe: RecipeIngredient[];
  costPerPortion: number;
  sellingPrice: number;
  profitPerPortion: number;
  profitMarginPercent: number;
  maxPortionsPossible: number;
  bottleneckIngredientName: string;
  bottleneckCurrentStock: number;
  bottleneckUnit: string;
  totalPotentialRevenue: number;
  totalPotentialCost: number;
  totalPotentialProfit: number;
  ingredientBreakdown: {
    ingredientName: string;
    requiredQtyPerPortion: number;
    recipeUnit: string;
    storeQtyPerPortion: number;
    storeUnit: string;
    currentStoreStock: number;
    costPerUnit: number;
    portionsPossible: number;
    isBottleneck: boolean;
  }[];
}

export const IngredientYieldAnalyzer: React.FC<IngredientYieldAnalyzerProps> = ({
  menuItems,
  ingredients = [],
  onCreatePurchaseOrder,
  loggedInUser,
  darkMode = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'Available' | 'Low' | 'OutOfStock'>('All');
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

  // Budget Simulation State (Default e.g. 300,000 RWF)
  const [simulatedBudget, setSimulatedBudget] = useState<number>(300000);
  const [useSimulationMode, setUseSimulationMode] = useState<boolean>(false);

  // Helper to construct a fallback recipe for dishes that don't have explicit recipe BOM
  const getEffectiveRecipe = (item: MenuItem): RecipeIngredient[] => {
    if (item.recipe && item.recipe.length > 0) {
      return item.recipe;
    }

    // Default intelligent recipe matching based on name/category
    const nameLower = item.name.toLowerCase();
    const fallbackRecipe: RecipeIngredient[] = [];

    const findIng = (term: string) => 
      ingredients.find(i => i.name.toLowerCase().includes(term.toLowerCase()));

    const foil = findIng('foil') || findIng('aluminium') || findIng('aluminum');

    if (nameLower.includes('chicken')) {
      const chk = findIng('chicken');
      const oil = findIng('oil');
      if (chk) fallbackRecipe.push({ ingredientId: chk.id, ingredientName: chk.name, quantity: 250, unit: 'g', costPerUnit: chk.costPerUnit || 3800 });
      if (oil) fallbackRecipe.push({ ingredientId: oil.id, ingredientName: oil.name, quantity: 30, unit: 'ml', costPerUnit: oil.costPerUnit || 2200 });
      if (foil) fallbackRecipe.push({ ingredientId: foil.id, ingredientName: foil.name, quantity: 0.5, unit: 'Meters', costPerUnit: foil.costPerUnit || 250 });
    } else if (nameLower.includes('fries') || nameLower.includes('chips')) {
      const pot = findIng('potat') || findIng('chips');
      const oil = findIng('oil');
      if (pot) fallbackRecipe.push({ ingredientId: pot.id, ingredientName: pot.name, quantity: 350, unit: 'g', costPerUnit: pot.costPerUnit || 600 });
      if (oil) fallbackRecipe.push({ ingredientId: oil.id, ingredientName: oil.name, quantity: 50, unit: 'ml', costPerUnit: oil.costPerUnit || 2200 });
    } else if (nameLower.includes('beef') || nameLower.includes('brochette') || nameLower.includes('steak')) {
      const beef = findIng('beef') || findIng('meat');
      const oil = findIng('oil');
      if (beef) fallbackRecipe.push({ ingredientId: beef.id, ingredientName: beef.name, quantity: 200, unit: 'g', costPerUnit: beef.costPerUnit || 4500 });
      if (oil) fallbackRecipe.push({ ingredientId: oil.id, ingredientName: oil.name, quantity: 20, unit: 'ml', costPerUnit: oil.costPerUnit || 2200 });
      if (foil) fallbackRecipe.push({ ingredientId: foil.id, ingredientName: foil.name, quantity: 0.4, unit: 'Meters', costPerUnit: foil.costPerUnit || 250 });
    } else if (nameLower.includes('rice')) {
      const rice = findIng('rice');
      const oil = findIng('oil');
      if (rice) fallbackRecipe.push({ ingredientId: rice.id, ingredientName: rice.name, quantity: 150, unit: 'g', costPerUnit: rice.costPerUnit || 1800 });
      if (oil) fallbackRecipe.push({ ingredientId: oil.id, ingredientName: oil.name, quantity: 15, unit: 'ml', costPerUnit: oil.costPerUnit || 2200 });
    } else if (nameLower.includes('fish') || nameLower.includes('tilapia')) {
      const fish = findIng('fish') || findIng('tilapia');
      const oil = findIng('oil');
      if (fish) fallbackRecipe.push({ ingredientId: fish.id, ingredientName: fish.name, quantity: 1, unit: 'Piece', costPerUnit: fish.costPerUnit || 3500 });
      if (oil) fallbackRecipe.push({ ingredientId: oil.id, ingredientName: oil.name, quantity: 40, unit: 'ml', costPerUnit: oil.costPerUnit || 2200 });
      if (foil) fallbackRecipe.push({ ingredientId: foil.id, ingredientName: foil.name, quantity: 0.6, unit: 'Meters', costPerUnit: foil.costPerUnit || 250 });
    }

    return fallbackRecipe;
  };

  // Compute Yield Analysis across all food/kitchen dishes
  const yieldAnalyses: RecipeYieldAnalysis[] = useMemo(() => {
    // Calculate total ingredient cost value in stock
    const actualTotalStockValue = ingredients.reduce((acc, ing) => acc + (ing.stockQuantity * (ing.costPerUnit || 0)), 0);
    const simulationScaleFactor = useSimulationMode && actualTotalStockValue > 0 
      ? (simulatedBudget / actualTotalStockValue) 
      : 1;

    return menuItems
      .filter(item => item.isFood !== false) // focus on kitchen food items and dishes
      .map(item => {
        const recipe = getEffectiveRecipe(item);

        let costPerPortion = 0;
        let minPortionsPossible = Infinity;
        let bottleneckName = 'None / Direct Stock';
        let bottleneckStock = 0;
        let bottleneckUnit = 'Units';

        const breakdown = recipe.map(rItem => {
          if (rItem.active === false) return null;
          const ing = ingredients.find(g => g.id === rItem.ingredientId || g.name.toLowerCase() === rItem.ingredientName.toLowerCase());

          const effQty = calculateEffectiveRecipeQty(rItem.quantity, rItem.wastePercentage || 0, rItem.yieldPercentage || 100);
          const storeQtyNeeded = convertRecipeQtyToStoreQty(effQty, rItem.unit, ing?.unit || 'Kg', ing?.conversionRate);
          const unitCost = ing?.costPerUnit || rItem.costPerUnit || 0;

          const itemCost = storeQtyNeeded * unitCost;
          costPerPortion += itemCost;

          // Scale stock quantity if in simulated budget mode
          const rawStock = ing ? ing.stockQuantity : 0;
          const effectiveStock = useSimulationMode ? (rawStock * simulationScaleFactor) : rawStock;

          let portionsFromThis = 0;
          if (storeQtyNeeded > 0) {
            portionsFromThis = Math.floor(effectiveStock / storeQtyNeeded);
          } else {
            portionsFromThis = 999;
          }

          if (portionsFromThis < minPortionsPossible) {
            minPortionsPossible = portionsFromThis;
            bottleneckName = ing ? ing.name : rItem.ingredientName;
            bottleneckStock = effectiveStock;
            bottleneckUnit = ing ? ing.unit : rItem.unit;
          }

          return {
            ingredientName: ing ? ing.name : rItem.ingredientName,
            requiredQtyPerPortion: rItem.quantity,
            recipeUnit: rItem.unit,
            storeQtyPerPortion: storeQtyNeeded,
            storeUnit: ing ? ing.unit : 'Kg',
            currentStoreStock: effectiveStock,
            costPerUnit: unitCost,
            portionsPossible: portionsFromThis,
            isBottleneck: false
          };
        }).filter(Boolean) as RecipeYieldAnalysis['ingredientBreakdown'];

        // Mark bottleneck
        breakdown.forEach(b => {
          if (b.ingredientName === bottleneckName) {
            b.isBottleneck = true;
          }
        });

        // Fallback for items with no recipe defined
        if (recipe.length === 0) {
          minPortionsPossible = item.stockQuantity || 0;
          costPerPortion = item.costPrice || Math.round(item.price * 0.5);
          bottleneckName = 'Direct Dish Stock';
          bottleneckStock = item.stockQuantity || 0;
          bottleneckUnit = item.unit || 'Portion';
        }

        const maxPortions = minPortionsPossible === Infinity ? 0 : Math.max(0, minPortionsPossible);
        const sellingPrice = item.price || 0;
        const profitPerPortion = Math.max(0, sellingPrice - costPerPortion);
        const profitMarginPercent = sellingPrice > 0 ? (profitPerPortion / sellingPrice) * 100 : 0;

        const totalPotentialRevenue = maxPortions * sellingPrice;
        const totalPotentialCost = maxPortions * costPerPortion;
        const totalPotentialProfit = maxPortions * profitPerPortion;

        return {
          menuItem: item,
          recipe,
          costPerPortion,
          sellingPrice,
          profitPerPortion,
          profitMarginPercent,
          maxPortionsPossible: maxPortions,
          bottleneckIngredientName: bottleneckName,
          bottleneckCurrentStock: bottleneckStock,
          bottleneckUnit,
          totalPotentialRevenue,
          totalPotentialCost,
          totalPotentialProfit,
          ingredientBreakdown: breakdown
        };
      });
  }, [menuItems, ingredients, useSimulationMode, simulatedBudget]);

  // Overall Aggregated Totals
  const overallTotals = useMemo(() => {
    const totalPortions = yieldAnalyses.reduce((acc, y) => acc + y.maxPortionsPossible, 0);
    const totalRevenue = yieldAnalyses.reduce((acc, y) => acc + y.totalPotentialRevenue, 0);
    const totalCost = yieldAnalyses.reduce((acc, y) => acc + y.totalPotentialCost, 0);
    const totalProfit = yieldAnalyses.reduce((acc, y) => acc + y.totalPotentialProfit, 0);
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roiRatio = totalCost > 0 ? (totalRevenue / totalCost) : 0;

    return {
      totalPortions,
      totalRevenue,
      totalCost,
      totalProfit,
      overallMargin,
      roiRatio
    };
  }, [yieldAnalyses]);

  // Filtered List
  const filteredAnalyses = useMemo(() => {
    return yieldAnalyses.filter(item => {
      const matchesSearch = item.menuItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bottleneckIngredientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCat = selectedCategory === 'All' || item.menuItem.category === selectedCategory || item.menuItem.foodCategory === selectedCategory;

      let matchesStatus = true;
      if (stockStatusFilter === 'Available') matchesStatus = item.maxPortionsPossible >= 10;
      if (stockStatusFilter === 'Low') matchesStatus = item.maxPortionsPossible > 0 && item.maxPortionsPossible < 10;
      if (stockStatusFilter === 'OutOfStock') matchesStatus = item.maxPortionsPossible === 0;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [yieldAnalyses, searchTerm, selectedCategory, stockStatusFilter]);

  // Handle Quick Order for Bottleneck Ingredient
  const handleOrderBottleneck = (analysis: RecipeYieldAnalysis) => {
    const ingName = analysis.bottleneckIngredientName;
    const ing = ingredients.find(g => g.name.toLowerCase() === ingName.toLowerCase());

    if (onCreatePurchaseOrder) {
      onCreatePurchaseOrder({
        supplierName: ing?.supplier || 'Local Market / Wholesaler',
        department: 'Kitchen',
        items: [{
          itemId: ing?.id || `custom-${Date.now()}`,
          itemName: ingName,
          category: ing?.category || 'Meat & Produce',
          quantity: 20,
          unitCost: ing?.costPerUnit || 3000,
          totalCost: (20 * (ing?.costPerUnit || 3000)),
          destination: 'Kitchen Stock'
        }],
        totalAmount: (20 * (ing?.costPerUnit || 3000)),
        status: 'Pending',
        paymentStatus: 'Paid',
        notes: `Auto-generated purchase order for recipe bottleneck constraint on "${analysis.menuItem.name}"`,
        createdByName: loggedInUser?.fullName || 'Kitchen Manager'
      });
      alert(`✅ Created Purchase Order for bottleneck ingredient "${ingName}"! Check the Purchasing tab.`);
    }
  };

  // Print Full Yield & Profit Report
  const handlePrintYieldReport = () => {
    const html = `
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 12px; }
        .header { text-align: center; border-bottom: 3px double #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
        .resort-title { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }
        .report-title { font-size: 14px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin: 3px 0; }

        .summary-grid { display: flex; gap: 10px; margin-bottom: 12px; }
        .summary-card { flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
        .summary-val { font-size: 14px; font-weight: 900; color: #0284c7; }
        .summary-lbl { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background: #0f172a; color: #ffffff; padding: 6px; text-align: left; font-weight: 800; text-transform: uppercase; }
        td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: middle; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bottleneck { color: #dc2626; font-weight: 800; background: #fef2f2; padding: 2px 5px; border-radius: 4px; }
      </style>

      <div class="header">
        <h1 class="resort-title">SEVEN TO SEVEN - SKY VIEW RESORT</h1>
        <div class="report-title">INGREDIENT STOCK PRODUCTION CAPACITY & PROFIT YIELD REPORT</div>
        <div style="font-size: 10px; color: #64748b;">Analysis of Raw Materials Stock vs Kitchen Recipe Maximum Order Capacity</div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-val">${overallTotals.totalPortions.toLocaleString()} Servings</div>
          <div class="summary-lbl">Total Dish Capacity</div>
        </div>
        <div class="summary-card">
          <div class="summary-val">${formatCurrency(overallTotals.totalRevenue)}</div>
          <div class="summary-lbl">Potential Sales Revenue</div>
        </div>
        <div class="summary-card">
          <div class="summary-val">${formatCurrency(overallTotals.totalCost)}</div>
          <div class="summary-lbl">Total Raw Material Cost</div>
        </div>
        <div class="summary-card">
          <div class="summary-val" style="color: #16a34a;">${formatCurrency(overallTotals.totalProfit)}</div>
          <div class="summary-lbl">Projected Gross Profit (${overallTotals.overallMargin.toFixed(1)}%)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dish Name</th>
            <th class="text-right">Selling Price</th>
            <th class="text-right">Food Cost</th>
            <th class="text-right">Profit / Dish</th>
            <th class="text-center">Limit Orders (Max Portions)</th>
            <th>Limiting Bottleneck Raw Material</th>
            <th class="text-right">Potential Revenue</th>
            <th class="text-right">Potential Gross Profit</th>
          </tr>
        </thead>
        <tbody>
          ${filteredAnalyses.map(a => `
            <tr>
              <td><strong>${a.menuItem.name}</strong> (${a.menuItem.category})</td>
              <td class="text-right">${formatCurrency(a.sellingPrice)}</td>
              <td class="text-right">${formatCurrency(a.costPerPortion)}</td>
              <td class="text-right" style="color: #16a34a; font-weight: 700;">+${formatCurrency(a.profitPerPortion)} (${a.profitMarginPercent.toFixed(0)}%)</td>
              <td class="text-center" style="font-size: 12px; font-weight: 900; color: ${a.maxPortionsPossible === 0 ? '#dc2626' : '#0f172a'};">
                ${a.maxPortionsPossible} ${a.menuItem.unit || 'Portions'}
              </td>
              <td><span class="bottleneck">⚠️ ${a.bottleneckIngredientName}</span></td>
              <td class="text-right" style="font-weight: 800;">${formatCurrency(a.totalPotentialRevenue)}</td>
              <td class="text-right" style="font-weight: 900; color: #16a34a;">${formatCurrency(a.totalPotentialProfit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #475569;">
        <div>Executive Chef: ___________________________</div>
        <div>Storekeeper: ___________________________</div>
        <div>Date & Time: ${new Date().toLocaleString()}</div>
      </div>
    `;

    printReportHTML('Ingredient Yield & Profit Report', html);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className={`p-6 rounded-2xl border transition-colors shadow-xl ${
        darkMode ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30' : 'bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-emerald-200'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Ingredient Limit Orders & Profit Yield Analyzer
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                  Live Stock Capacity
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                Automatically maps raw kitchen stock against recipe formulas to calculate exact dish portion limits, bottleneck raw materials, potential sales income & gross profit margins.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
            <button
              onClick={handlePrintYieldReport}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-2 border border-slate-700 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Yield Report</span>
            </button>
          </div>
        </div>

        {/* Budget Investment Simulator Bar */}
        <div className="mt-5 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">
                300,000 RWF Ingredient Cost Investment & Stock Simulator
              </span>
              <span className="text-[11px] text-gray-400">
                {useSimulationMode 
                  ? `Simulating output based on a fixed ${formatCurrency(simulatedBudget)} raw material budget` 
                  : 'Currently analyzing live actual kitchen raw ingredient stock in store'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full md:w-auto">
            <button
              onClick={() => {
                setUseSimulationMode(true);
                setSimulatedBudget(300000);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                useSimulationMode && simulatedBudget === 300000
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                  : 'bg-slate-800 text-gray-300 border-slate-700 hover:text-white'
              }`}
            >
              Simulate 300,000 RWF Budget
            </button>
            <button
              onClick={() => {
                setUseSimulationMode(true);
                setSimulatedBudget(500000);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                useSimulationMode && simulatedBudget === 500000
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                  : 'bg-slate-800 text-gray-300 border-slate-700 hover:text-white'
              }`}
            >
              500,000 RWF
            </button>
            <button
              onClick={() => {
                setUseSimulationMode(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                !useSimulationMode
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-md'
                  : 'bg-slate-800 text-gray-300 border-slate-700 hover:text-white'
              }`}
            >
              🔄 Actual Live Inventory
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portions */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-colors ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Total Limit Orders
            </span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            {overallTotals.totalPortions.toLocaleString()} <span className="text-xs font-bold text-gray-400">Dishes / Plates</span>
          </div>
          <p className="text-[11px] font-semibold text-purple-300 mt-1">
            Max cookable servings from current ingredients
          </p>
        </div>

        {/* Potential Income / Revenue */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-colors ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Potential Gross Income
            </span>
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-400 tracking-tight">
            {formatCurrency(overallTotals.totalRevenue)}
          </div>
          <p className="text-[11px] font-semibold text-sky-300 mt-1">
            Expected sales revenue when prepared and sold
          </p>
        </div>

        {/* Total Food Cost */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-colors ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Raw Ingredients Cost
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(overallTotals.totalCost)}
          </div>
          <p className="text-[11px] font-semibold text-amber-300 mt-1">
            Raw material food cost investment
          </p>
        </div>

        {/* Expected Gross Profit */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-colors ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Projected Gross Profit
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight flex items-baseline gap-2">
            <span>{formatCurrency(overallTotals.totalProfit)}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-emerald-300">
            <span>Profit Margin: {overallTotals.overallMargin.toFixed(1)}%</span>
            <span>ROI: {overallTotals.roiRatio.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search dish name or bottleneck raw material (e.g. Chicken, Rice, Oil)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-semibold ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStockStatusFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                stockStatusFilter === 'All'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              All Dishes ({yieldAnalyses.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('Available')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                stockStatusFilter === 'Available'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              In Stock (≥10)
            </button>
            <button
              onClick={() => setStockStatusFilter('Low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                stockStatusFilter === 'Low'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              Low (1-9)
            </button>
            <button
              onClick={() => setStockStatusFilter('OutOfStock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                stockStatusFilter === 'OutOfStock'
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              Out of Stock (0)
            </button>
          </div>
        </div>
      </div>

      {/* Dish Capacity & Yield Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAnalyses.length === 0 ? (
          <div className="col-span-2 p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-gray-400 space-y-2">
            <ChefHat className="w-10 h-10 text-emerald-500/50 mx-auto" />
            <div className="text-sm font-bold text-white">No dishes match your search filter.</div>
            <p className="text-xs text-gray-500">Try adjusting your category filter or search keywords.</p>
          </div>
        ) : (
          filteredAnalyses.map(analysis => {
            const isExpanded = expandedDishId === analysis.menuItem.id;
            const isZero = analysis.maxPortionsPossible === 0;

            return (
              <div 
                key={analysis.menuItem.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isZero
                    ? 'bg-slate-900/80 border-rose-500/30 shadow-lg'
                    : analysis.maxPortionsPossible < 10
                    ? 'bg-slate-900/90 border-amber-500/30 shadow-lg'
                    : 'bg-slate-900/90 border-slate-800 shadow-lg hover:border-emerald-500/40'
                }`}
              >
                <div>
                  {/* Card Header: Dish Name, Category, Max Orders Badge */}
                  <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-black text-white">{analysis.menuItem.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-gray-300 border border-slate-700">
                          {analysis.menuItem.category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center space-x-3">
                        <span>Selling Price: <strong className="text-white">{formatCurrency(analysis.sellingPrice)}</strong></span>
                        <span>•</span>
                        <span>Food Cost: <strong className="text-amber-400">{formatCurrency(analysis.costPerPortion)}</strong></span>
                      </div>
                    </div>

                    {/* Limit Orders Badge */}
                    <div className="text-right">
                      <div className={`px-3 py-1.5 rounded-xl font-black text-xs inline-flex items-center space-x-1.5 shadow-md ${
                        isZero 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : analysis.maxPortionsPossible < 10
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        <Flame className="w-3.5 h-3.5" />
                        <span>{analysis.maxPortionsPossible} {analysis.menuItem.unit || 'Servings'}</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 mt-1">
                        Max Capacity
                      </div>
                    </div>
                  </div>

                  {/* Bottleneck Constraint Bar */}
                  <div className="py-2.5 px-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className={`w-4 h-4 ${isZero ? 'text-rose-400' : 'text-amber-400'}`} />
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-gray-400 block">Limiting Bottleneck Raw Material:</span>
                        <span className={`font-black ${isZero ? 'text-rose-400' : 'text-amber-300'}`}>
                          {analysis.bottleneckIngredientName} ({analysis.bottleneckCurrentStock.toFixed(1)} {analysis.bottleneckUnit} left)
                        </span>
                      </div>
                    </div>

                    {onCreatePurchaseOrder && (
                      <button
                        onClick={() => handleOrderBottleneck(analysis)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[11px] flex items-center space-x-1 shadow cursor-pointer transition-all"
                        title="Directly launch a Purchase Order for this bottleneck ingredient"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Re-order</span>
                      </button>
                    )}
                  </div>

                  {/* Financial Yield Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 my-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block">Profit Per Dish:</span>
                      <span className="font-black text-emerald-400 text-sm">
                        +{formatCurrency(analysis.profitPerPortion)}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold ml-1">
                        ({analysis.profitMarginPercent.toFixed(0)}% Margin)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold block">Total Potential Sales Income:</span>
                      <span className="font-black text-sky-400 text-sm">
                        {formatCurrency(analysis.totalPotentialRevenue)}
                      </span>
                      <div className="text-[10px] text-gray-400 font-medium">
                        Net Profit: <strong className="text-emerald-400">{formatCurrency(analysis.totalPotentialProfit)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipe Ingredient Breakdown Drawer */}
                <div className="mt-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setExpandedDishId(isExpanded ? null : analysis.menuItem.id)}
                    className="w-full text-xs font-bold text-gray-400 hover:text-white flex items-center justify-between cursor-pointer py-1"
                  >
                    <span>Recipe Raw Material Formulas ({analysis.ingredientBreakdown.length} ingredients)</span>
                    <span className="text-emerald-400 text-[11px] font-black">{isExpanded ? 'Hide Formula ▲' : 'View Formula Breakdown ▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {analysis.ingredientBreakdown.length === 0 ? (
                        <div className="text-gray-500 text-[11px]">No ingredients configured in recipe yet. Uses direct dish stock.</div>
                      ) : (
                        analysis.ingredientBreakdown.map((ing, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-900 last:border-0">
                            <div>
                              <span className="font-bold text-white block">{ing.ingredientName}</span>
                              <span className="text-[10px] text-gray-400">
                                Requires {ing.requiredQtyPerPortion} {ing.recipeUnit} per portion • Stock: {ing.currentStoreStock.toFixed(1)} {ing.storeUnit}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                ing.isBottleneck ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-emerald-400'
                              }`}>
                                Max {ing.portionsPossible} Portions
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
