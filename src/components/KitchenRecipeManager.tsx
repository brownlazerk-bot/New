import React, { useState } from 'react';
import { 
  MenuItem, KitchenIngredient, RecipeIngredient, KitchenIngredientCategory,
  StockMovementRecord, KitchenWasteRecord, WasteType, AppUser, AccompanyingDrink 
} from '../types';
import { formatCurrency } from '../lib/currency';
import { 
  convertRecipeQtyToStoreQty, calculateEffectiveRecipeQty, calculateRecipeIngredientCost 
} from '../lib/unitConversion';
import { 
  Utensils, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  XCircle, Package, Scale, Layers, ChefHat, Search, Filter, RefreshCw, Info, DollarSign, Calculator,
  TrendingDown, FileText, ArrowUpRight, ArrowDownRight, Activity, ShieldAlert, ShieldCheck, Clock, Calendar, User,
  Wine, Sparkles
} from 'lucide-react';
import { IngredientYieldAnalyzer } from './IngredientYieldAnalyzer';

interface KitchenRecipeManagerProps {
  menuItems: MenuItem[];
  ingredients: KitchenIngredient[];
  stockMovements?: StockMovementRecord[];
  wasteRecords?: KitchenWasteRecord[];
  onSaveIngredients: (ingredients: KitchenIngredient[]) => void;
  onSaveRecipe: (menuItemId: string, recipe: RecipeIngredient[], accompanyingDrinks?: AccompanyingDrink[]) => void;
  onAddWasteRecord?: (waste: Omit<KitchenWasteRecord, 'id' | 'timestamp' | 'date'>) => KitchenWasteRecord;
  loggedInUser?: AppUser;
  darkMode?: boolean;
}

const INGREDIENT_CATEGORIES: KitchenIngredientCategory[] = [
  'Meat & Poultry',
  'Grains & Rice',
  'Vegetables & Produce',
  'Spices & Oils',
  'Dairy & Eggs',
  'Seafood',
  'Kitchen Packaging & Foil',
  'Beverage Raw Materials',
  'Other Raw Materials'
];

const WASTE_TYPES: WasteType[] = [
  'Burnt',
  'Expired',
  'Broken',
  'Spoiled',
  'Cooking Error',
  'Returned Plate',
  'Over Production'
];

export const KitchenRecipeManager: React.FC<KitchenRecipeManagerProps> = ({
  menuItems,
  ingredients,
  stockMovements = [],
  wasteRecords = [],
  onSaveIngredients,
  onSaveRecipe,
  onAddWasteRecord,
  loggedInUser,
  darkMode = true
}) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'ingredients' | 'yield_analyzer' | 'waste' | 'movements' | 'reports'>('recipes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Ingredient Modal State
  const [showIngModal, setShowIngModal] = useState(false);
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [ingCode, setIngCode] = useState('');
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState<KitchenIngredientCategory>('Meat & Poultry');
  const [ingStockQty, setIngStockQty] = useState<number>(10);
  const [ingUnit, setIngUnit] = useState('Kg');
  const [ingPurchaseUnit, setIngPurchaseUnit] = useState('Kg');
  const [ingRecipeUnit, setIngRecipeUnit] = useState('g');
  const [ingConversionRate, setIngConversionRate] = useState<number>(1000);
  const [ingCostPerUnit, setIngCostPerUnit] = useState<number>(2500);
  const [ingAvgCost, setIngAvgCost] = useState<number>(2400);
  const [ingMinAlert, setIngMinAlert] = useState<number>(5);
  const [ingMaxStock, setIngMaxStock] = useState<number>(100);
  const [ingStorageLoc, setIngStorageLoc] = useState('Cold Room #1');
  const [ingSupplier, setIngSupplier] = useState('');
  const [ingExpiryDate, setIngExpiryDate] = useState('');
  const [ingBatchNo, setIngBatchNo] = useState('');
  const [ingNotes, setIngNotes] = useState('');

  // Recipe Modal State
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<RecipeIngredient[]>([]);
  const [accompanyingDrinksDraft, setAccompanyingDrinksDraft] = useState<AccompanyingDrink[]>([]);

  // Waste Modal State
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteIngId, setWasteIngId] = useState('');
  const [wasteType, setWasteType] = useState<WasteType>('Spoiled');
  const [wasteQty, setWasteQty] = useState<number>(1);
  const [wasteUnit, setWasteUnit] = useState('Kg');
  const [wasteDepartment, setWasteDepartment] = useState('Kitchen');
  const [wasteReason, setWasteReason] = useState('');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteReportedBy, setWasteReportedBy] = useState(loggedInUser?.fullName || 'Chef');

  // Filtered Kitchen Menu Items
  const kitchenMenuItems = menuItems.filter(m => 
    m.category === 'Kitchen' || 
    m.category === 'Food' || 
    m.category === 'Grill / Barbecue' ||
    m.category === 'Pool Snacks' ||
    m.isKitchenItem ||
    (!m.category.includes('Beverage') && !m.category.includes('Bar') && !m.category.includes('Beer') && !m.category.includes('Liquor'))
  );

  const filteredKitchenDishes = kitchenMenuItems.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ing.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ing.code && ing.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate Portion Capacity
  const calculateMaxPortions = (item: MenuItem) => {
    if (!item.hasRecipe || !item.recipe || item.recipe.length === 0) {
      return { portions: item.stockQuantity, bottleneck: 'Direct Stock' };
    }

    let minPortions = Infinity;
    let bottleneck = 'None';

    for (const rItem of item.recipe) {
      if (rItem.active === false) continue;
      const ing = ingredients.find(g => g.id === rItem.ingredientId || g.name.toLowerCase() === rItem.ingredientName.toLowerCase());
      if (!ing || ing.stockQuantity <= 0 || rItem.quantity <= 0) {
        return { portions: 0, bottleneck: rItem.ingredientName };
      }

      const effectiveRecipeQty = calculateEffectiveRecipeQty(rItem.quantity, rItem.wastePercentage || 0, rItem.yieldPercentage || 100);
      const storeQtyNeeded = convertRecipeQtyToStoreQty(effectiveRecipeQty, rItem.unit, ing.unit, ing.conversionRate);

      if (storeQtyNeeded <= 0) continue;
      const possible = Math.floor(ing.stockQuantity / storeQtyNeeded);
      if (possible < minPortions) {
        minPortions = possible;
        bottleneck = ing.name;
      }
    }

    return { portions: minPortions === Infinity ? 0 : minPortions, bottleneck };
  };

  // Calculate Food Cost for a Recipe
  const calculateTotalRecipeCost = (recipe: RecipeIngredient[]) => {
    return recipe.reduce((acc, rItem) => {
      if (rItem.active === false) return acc;
      const ing = ingredients.find(g => g.id === rItem.ingredientId || g.name.toLowerCase() === rItem.ingredientName.toLowerCase());
      return acc + calculateRecipeIngredientCost(rItem, ing);
    }, 0);
  };

  // Open Ingredient Modal
  const openIngModal = (ing?: KitchenIngredient) => {
    if (ing) {
      setEditingIngId(ing.id);
      setIngCode(ing.code || '');
      setIngName(ing.name);
      setIngCategory(ing.category);
      setIngStockQty(ing.stockQuantity);
      setIngUnit(ing.unit);
      setIngPurchaseUnit(ing.purchaseUnit || ing.unit);
      setIngRecipeUnit(ing.recipeUnit || 'g');
      setIngConversionRate(ing.conversionRate || 1000);
      setIngCostPerUnit(ing.costPerUnit);
      setIngAvgCost(ing.averageCost || ing.costPerUnit);
      setIngMinAlert(ing.minStockAlert);
      setIngMaxStock(ing.maxStock || 100);
      setIngStorageLoc(ing.storageLocation || 'Main Cold Room');
      setIngSupplier(ing.supplier || '');
      setIngExpiryDate(ing.expiryDate || '');
      setIngBatchNo(ing.batchNumber || '');
      setIngNotes(ing.notes || '');
    } else {
      setEditingIngId(null);
      setIngCode(`RAW-0${ingredients.length + 1}`);
      setIngName('');
      setIngCategory('Meat & Poultry');
      setIngStockQty(10);
      setIngUnit('Kg');
      setIngPurchaseUnit('Kg');
      setIngRecipeUnit('g');
      setIngConversionRate(1000);
      setIngCostPerUnit(3500);
      setIngAvgCost(3400);
      setIngMinAlert(5);
      setIngMaxStock(100);
      setIngStorageLoc('Cold Room #1');
      setIngSupplier('');
      setIngExpiryDate('');
      setIngBatchNo('');
      setIngNotes('');
    }
    setShowIngModal(true);
  };

  // Handle Save Ingredient
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) {
      alert('Please enter ingredient name');
      return;
    }

    const isOut = ingStockQty <= 0;
    const isLow = !isOut && ingStockQty <= ingMinAlert;
    const status = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Available');

    let updatedList: KitchenIngredient[];

    if (editingIngId) {
      updatedList = ingredients.map(ing => ing.id === editingIngId ? {
        ...ing,
        code: ingCode.trim(),
        name: ingName.trim(),
        category: ingCategory,
        stockQuantity: Number(ingStockQty),
        unit: ingUnit,
        purchaseUnit: ingPurchaseUnit,
        recipeUnit: ingRecipeUnit,
        conversionRate: Number(ingConversionRate),
        costPerUnit: Number(ingCostPerUnit),
        averageCost: Number(ingAvgCost),
        minStockAlert: Number(ingMinAlert),
        maxStock: Number(ingMaxStock),
        storageLocation: ingStorageLoc,
        status,
        supplier: ingSupplier.trim(),
        expiryDate: ingExpiryDate,
        batchNumber: ingBatchNo,
        notes: ingNotes.trim(),
        lastRestocked: new Date().toISOString()
      } : ing);
    } else {
      const newIng: KitchenIngredient = {
        id: `ing-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: ingCode.trim() || `RAW-${Date.now().toString().slice(-4)}`,
        name: ingName.trim(),
        category: ingCategory,
        stockQuantity: Number(ingStockQty),
        unit: ingUnit,
        purchaseUnit: ingPurchaseUnit,
        recipeUnit: ingRecipeUnit,
        conversionRate: Number(ingConversionRate),
        costPerUnit: Number(ingCostPerUnit),
        averageCost: Number(ingAvgCost),
        minStockAlert: Number(ingMinAlert),
        maxStock: Number(ingMaxStock),
        storageLocation: ingStorageLoc,
        status,
        supplier: ingSupplier.trim(),
        expiryDate: ingExpiryDate,
        batchNumber: ingBatchNo,
        notes: ingNotes.trim(),
        lastRestocked: new Date().toISOString()
      };
      updatedList = [newIng, ...ingredients];
    }

    onSaveIngredients(updatedList);
    setShowIngModal(false);
  };

  // Open Recipe Modal
  const openRecipeModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setAccompanyingDrinksDraft(item.accompanyingDrinks ? [...item.accompanyingDrinks] : []);
    if (item.recipe && item.recipe.length > 0) {
      setRecipeDraft([...item.recipe]);
    } else {
      if (ingredients.length > 0) {
        setRecipeDraft([{
          id: `rec-${Date.now()}-1`,
          ingredientId: ingredients[0].id,
          ingredientName: ingredients[0].name,
          quantity: 250,
          unit: ingredients[0].recipeUnit || 'g',
          costPerUnit: ingredients[0].costPerUnit,
          wastePercentage: 5,
          yieldPercentage: 95,
          optional: false,
          active: true,
          preparationNotes: 'Standard portion prep'
        }]);
      } else {
        setRecipeDraft([]);
      }
    }
    setShowRecipeModal(true);
  };

  const addRecipeRow = () => {
    if (ingredients.length === 0) {
      alert('Please create at least one raw ingredient first in the Ingredient Database.');
      return;
    }
    const firstIng = ingredients[0];
    setRecipeDraft([
      ...recipeDraft,
      {
        id: `rec-${Date.now()}-${recipeDraft.length + 1}`,
        ingredientId: firstIng.id,
        ingredientName: firstIng.name,
        quantity: 100,
        unit: firstIng.recipeUnit || 'g',
        costPerUnit: firstIng.costPerUnit,
        wastePercentage: 0,
        yieldPercentage: 100,
        optional: false,
        active: true,
        preparationNotes: ''
      }
    ]);
  };

  const updateRecipeRow = (idx: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...recipeDraft];
    if (field === 'ingredientId') {
      const ing = ingredients.find(g => g.id === value);
      if (ing) {
        updated[idx] = {
          ...updated[idx],
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.recipeUnit || ing.unit,
          costPerUnit: ing.costPerUnit
        };
      }
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setRecipeDraft(updated);
  };

  const removeRecipeRow = (idx: number) => {
    const updated = [...recipeDraft];
    updated.splice(idx, 1);
    setRecipeDraft(updated);
  };

  // Accompanying drink handlers
  const addDrinkRow = () => {
    const newDrink: AccompanyingDrink = {
      id: `drk-${Date.now()}-${accompanyingDrinksDraft.length + 1}`,
      drinkName: '',
      quantity: 1,
      unit: 'Bottle',
      extraPrice: 0,
      notes: ''
    };
    setAccompanyingDrinksDraft([...accompanyingDrinksDraft, newDrink]);
  };

  const updateDrinkRow = (idx: number, updates: Partial<AccompanyingDrink>) => {
    const updated = [...accompanyingDrinksDraft];
    updated[idx] = { ...updated[idx], ...updates };
    setAccompanyingDrinksDraft(updated);
  };

  const removeDrinkRow = (idx: number) => {
    const updated = accompanyingDrinksDraft.filter((_, i) => i !== idx);
    setAccompanyingDrinksDraft(updated);
  };

  const handleSaveRecipeDraft = () => {
    if (!selectedMenuItem) return;
    onSaveRecipe(selectedMenuItem.id, recipeDraft, accompanyingDrinksDraft);
    setShowRecipeModal(false);
  };

  // Open Waste Modal
  const openWasteModal = (ing?: KitchenIngredient) => {
    if (ing) {
      setWasteIngId(ing.id);
      setWasteUnit(ing.recipeUnit || ing.unit);
    } else if (ingredients.length > 0) {
      setWasteIngId(ingredients[0].id);
      setWasteUnit(ingredients[0].recipeUnit || ingredients[0].unit);
    }
    setWasteType('Spoiled');
    setWasteQty(1);
    setWasteDepartment('Kitchen');
    setWasteReason('Kitchen prep waste');
    setWasteNotes('');
    setShowWasteModal(true);
  };

  // Submit Waste Record
  const handleSubmitWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteIngId) {
      alert('Please select an ingredient for waste record');
      return;
    }
    const ing = ingredients.find(g => g.id === wasteIngId);
    if (!ing) return;

    const unitCost = ing.costPerUnit;
    const storeQtyDeducted = convertRecipeQtyToStoreQty(wasteQty, wasteUnit, ing.unit, ing.conversionRate);
    const totalCost = storeQtyDeducted * unitCost;

    if (onAddWasteRecord) {
      onAddWasteRecord({
        ingredientId: ing.id,
        ingredientName: ing.name,
        wasteType,
        quantity: wasteQty,
        unit: wasteUnit,
        costPerUnit: unitCost,
        totalCost,
        reportedBy: wasteReportedBy || 'Kitchen Staff',
        reason: wasteReason.trim() || `${wasteType} Waste`,
        department: wasteDepartment,
        notes: wasteNotes
      });
    }

    setShowWasteModal(false);
  };

  // Summary Metrics
  const totalInventoryValuation = ingredients.reduce((sum, ing) => sum + (ing.stockQuantity * ing.costPerUnit), 0);
  const lowStockCount = ingredients.filter(ing => ing.stockQuantity <= ing.minStockAlert).length;
  const outOfStockCount = ingredients.filter(ing => ing.stockQuantity <= 0).length;
  
  const todayDate = new Date().toISOString().split('T')[0];
  const todayWasteVal = wasteRecords
    .filter(w => w.date === todayDate)
    .reduce((sum, w) => sum + w.totalCost, 0);

  const todayConsumptionVal = stockMovements
    .filter(m => m.date === todayDate && (m.movementType === 'Recipe Consumption' || m.movementType === 'Kitchen Consumption'))
    .reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="space-y-6">
      
      {/* HEADER & MODULE SUB-NAV */}
      <div className={`p-6 rounded-3xl border transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Kitchen Recipe & Ingredients Movement Engine</span>
                  <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-wider">
                    BOM Realtime Tracking
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Automated raw ingredient deductions, recipe formulas, waste logs & complete inventory movement audit ledger.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openWasteModal()}
              className="px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Record Kitchen Waste</span>
            </button>

            <button
              onClick={() => openIngModal()}
              className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Raw Ingredient</span>
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/60">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Raw Inventory Value</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{formatCurrency(totalInventoryValuation)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Today's Ingredient Consumption</p>
            <p className="text-lg font-black text-amber-400 mt-0.5">{formatCurrency(todayConsumptionVal)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Today's Waste Cost</p>
            <p className="text-lg font-black text-rose-400 mt-0.5">{formatCurrency(todayWasteVal)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">Low & Out Stock Alert</p>
            <p className="text-lg font-black text-sky-400 mt-0.5">
              <span className="text-amber-400">{lowStockCount} Low</span> / <span className="text-rose-500">{outOfStockCount} Out</span>
            </p>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-800/60">
          {[
            { id: 'recipes', label: 'Dish Recipes & BOM Formulas', icon: Layers },
            { id: 'ingredients', label: `Raw Ingredients Database (${ingredients.length})`, icon: Package },
            { id: 'yield_analyzer', label: '📊 Limit Orders & Profit Yield', icon: Sparkles },
            { id: 'waste', label: `Kitchen Waste Log (${wasteRecords.length})`, icon: Trash2 },
            { id: 'movements', label: `Stock Movement Ledger (${stockMovements.length})`, icon: Activity },
            { id: 'reports', label: 'Food Cost & Profit Reports', icon: Calculator }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: DISH RECIPES & BILL OF MATERIALS (BOM) */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search dish or food category..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-500"
              />
            </div>

            <p className="text-xs text-slate-400">
              Showing <strong>{filteredKitchenDishes.length}</strong> kitchen dishes with constituent ingredient formulas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKitchenDishes.map((item) => {
              const recipeCost = calculateTotalRecipeCost(item.recipe || []);
              const grossProfit = item.price - recipeCost;
              const marginPct = item.price > 0 ? Math.round((grossProfit / item.price) * 100) : 0;
              const { portions, bottleneck } = calculateMaxPortions(item);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-xl space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {item.category}
                        </span>
                        <h3 className="font-black text-base text-white mt-1.5 flex items-center gap-1.5">
                          <Utensils className="w-4 h-4 text-amber-400" />
                          <span>{item.name}</span>
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-black text-amber-400">
                          {formatCurrency(item.price)}
                        </span>
                        <p className="text-[10px] text-slate-400">Selling Price</p>
                      </div>
                    </div>

                    {/* Recipe Ingredients Summary */}
                    <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                        <span>Recipe Ingredients ({item.recipe?.length || 0})</span>
                        <span className="text-emerald-400 font-mono">Cost: {formatCurrency(recipeCost)}</span>
                      </div>

                      {(!item.recipe || item.recipe.length === 0) ? (
                        <p className="text-xs text-rose-400 italic py-1">
                          ⚠️ No recipe configured. Click "Configure Recipe Formula" below.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {item.recipe.map((rec, idx) => {
                            const ing = ingredients.find(g => g.id === rec.ingredientId);
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                                <span>• {rec.ingredientName}</span>
                                <span className="font-mono text-amber-300 font-bold">
                                  {rec.quantity} {rec.unit}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Portions Capacity & Food Cost Margin */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-slate-400 uppercase text-[9px] font-bold">Portion Capacity</p>
                        <p className={`font-black text-sm ${portions > 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {portions} servings
                        </p>
                        <p className="text-[9px] text-slate-500 truncate" title={`Bottleneck: ${bottleneck}`}>
                          Limit: {bottleneck}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-slate-400 uppercase text-[9px] font-bold">Gross Profit Margin</p>
                        <p className="font-black text-sm text-cyan-300">
                          {formatCurrency(grossProfit)} ({marginPct}%)
                        </p>
                        <p className="text-[9px] text-slate-500">Food Cost: {formatCurrency(recipeCost)}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openRecipeModal(item)}
                    className="w-full py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{item.hasRecipe ? 'Edit Recipe Formula (BOM)' : 'Create Recipe Formula'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RAW INGREDIENTS DATABASE */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ingredient, code, supplier..."
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500"
              >
                <option value="All">All Ingredient Categories</option>
                {INGREDIENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => openIngModal()}
              className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Raw Ingredient</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Code / Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3">Recipe Unit / Rate</th>
                    <th className="px-4 py-3 text-right">Unit Cost</th>
                    <th className="px-4 py-3">Storage Location</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredIngredients.map((ing) => {
                    const isOut = ing.stockQuantity <= 0;
                    const isLow = !isOut && ing.stockQuantity <= ing.minStockAlert;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white text-sm">{ing.name}</p>
                          <p className="font-mono text-[10px] text-amber-500">{ing.code || 'RAW-#'}</p>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-300">{ing.category}</td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                          <span className={isOut ? 'text-rose-500' : isLow ? 'text-amber-400' : 'text-emerald-400'}>
                            {ing.stockQuantity} {ing.unit}
                          </span>
                          <p className="text-[9px] text-slate-500">Min: {ing.minStockAlert} {ing.unit}</p>
                        </td>

                        <td className="px-4 py-3 font-mono text-slate-400">
                          {ing.recipeUnit || 'g'} (1 {ing.unit} = {ing.conversionRate || 1000} {ing.recipeUnit || 'g'})
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(ing.costPerUnit)} / {ing.unit}
                        </td>

                        <td className="px-4 py-3 text-slate-400">{ing.storageLocation || 'Main Store'}</td>

                        <td className="px-4 py-3 text-slate-400">{ing.supplier || 'N/A'}</td>

                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isLow
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {ing.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center space-x-1">
                          <button
                            onClick={() => openWasteModal(ing)}
                            title="Record Waste"
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openIngModal(ing)}
                            title="Edit Ingredient"
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB: INGREDIENT LIMIT ORDERS & PROFIT YIELD ANALYZER */}
      {activeTab === 'yield_analyzer' && (
        <IngredientYieldAnalyzer
          menuItems={menuItems}
          ingredients={ingredients}
          loggedInUser={loggedInUser}
          darkMode={darkMode}
        />
      )}
      {activeTab === 'waste' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <span>Kitchen Waste & Spoilage Ledger</span>
            </h3>

            <button
              onClick={() => openWasteModal()}
              className="px-4 py-2 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs transition-all shadow-md flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Log Waste Incident</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date / ID</th>
                    <th className="px-4 py-3">Raw Ingredient</th>
                    <th className="px-4 py-3">Waste Type</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Cost Value</th>
                    <th className="px-4 py-3">Reported By</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {wasteRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                        No kitchen waste records logged yet.
                      </td>
                    </tr>
                  ) : (
                    wasteRecords.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {w.date}
                          <p className="text-[9px] text-amber-500">{w.id}</p>
                        </td>

                        <td className="px-4 py-3 font-bold text-white">{w.ingredientName}</td>

                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {w.wasteType}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-300">
                          {w.quantity} {w.unit}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                          {formatCurrency(w.totalCost)}
                        </td>

                        <td className="px-4 py-3 text-slate-300">{w.reportedBy}</td>

                        <td className="px-4 py-3 text-slate-400">{w.department}</td>

                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={w.reason}>
                          {w.reason}
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

      {/* TAB 4: STOCK MOVEMENTS LEDGER */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>Immutable Inventory Stock Movement Ledger</span>
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date / Time</th>
                    <th className="px-4 py-3">Movement Type</th>
                    <th className="px-4 py-3">Ingredient</th>
                    <th className="px-4 py-3 text-right">In</th>
                    <th className="px-4 py-3 text-right">Out</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Value (RWF)</th>
                    <th className="px-4 py-3">Channel / Ref</th>
                    <th className="px-4 py-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 italic">
                        No stock movement ledger records generated yet. Movements generate automatically on POS order confirmation & kitchen preparation.
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {mov.date} {mov.time}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mov.quantityIn > 0 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {mov.movementType}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-bold text-white">{mov.ingredientName}</td>

                        <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                          {mov.quantityIn > 0 ? `+${mov.quantityIn} ${mov.unit}` : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-amber-400 font-bold">
                          {mov.quantityOut > 0 ? `-${mov.quantityOut} ${mov.unit}` : '-'}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                          {mov.remainingBalance} {mov.unit}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-cyan-300 font-bold">
                          {formatCurrency(mov.cost)}
                        </td>

                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                          {mov.department} {mov.referenceNumber ? `[${mov.referenceNumber}]` : ''}
                        </td>

                        <td className="px-4 py-3 text-slate-300">{mov.user}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & FOOD COST ANALYTICS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>Food Cost & Recipe Profitability Analysis</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenMenuItems.map((item) => {
                const recipeCost = calculateTotalRecipeCost(item.recipe || []);
                const grossProfit = item.price - recipeCost;
                const marginPct = item.price > 0 ? Math.round((grossProfit / item.price) * 100) : 0;
                const foodCostPct = item.price > 0 ? Math.round((recipeCost / item.price) * 100) : 0;

                return (
                  <div key={item.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white">{item.name}</h4>
                      <span className="font-mono text-amber-400 font-bold">{formatCurrency(item.price)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-500 uppercase">Recipe Cost</p>
                        <p className="text-emerald-400 text-xs font-mono">{formatCurrency(recipeCost)}</p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-500 uppercase">Food Cost %</p>
                        <p className={`text-xs font-mono ${foodCostPct > 35 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {foodCostPct}%
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <p className="text-slate-500 uppercase">Profit Margin</p>
                        <p className="text-cyan-300 text-xs font-mono">{marginPct}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT RAW INGREDIENT */}
      {showIngModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                {editingIngId ? 'Edit Raw Ingredient' : 'Create New Raw Ingredient'}
              </h3>
              <button onClick={() => setShowIngModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Code</label>
                  <input
                    type="text"
                    value={ingCode}
                    onChange={(e) => setIngCode(e.target.value)}
                    placeholder="RAW-01"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-mono focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Ingredient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Chicken Meat, White Rice..."
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value as KitchenIngredientCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  >
                    {INGREDIENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Store Unit (Inventory)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meters, Kg, Litre, Roll, Box..."
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Unit Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Quick Measurement Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIngUnit('Meters');
                      setIngPurchaseUnit('Roll');
                      setIngRecipeUnit('Meters');
                      setIngConversionRate(50);
                      if (!ingCategory || ingCategory === 'Other Raw Materials') {
                        setIngCategory('Kitchen Packaging & Foil');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>📏 Foil & Wrap (Meters / Roll)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIngUnit('Meters');
                      setIngPurchaseUnit('Roll');
                      setIngRecipeUnit('cm');
                      setIngConversionRate(5000);
                      if (!ingCategory || ingCategory === 'Other Raw Materials') {
                        setIngCategory('Kitchen Packaging & Foil');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>📐 Foil (Meters / cm)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIngUnit('Kg');
                      setIngPurchaseUnit('Kg');
                      setIngRecipeUnit('g');
                      setIngConversionRate(1000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    ⚖️ Weight (Kg / g)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIngUnit('Litre');
                      setIngPurchaseUnit('Litre');
                      setIngRecipeUnit('ml');
                      setIngConversionRate(1000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    🧪 Volume (Litre / ml)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIngUnit('Tray');
                      setIngPurchaseUnit('Tray');
                      setIngRecipeUnit('Piece');
                      setIngConversionRate(30);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    📦 Count (Tray / Pcs)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 text-[10px]">Purchase Unit</label>
                  <input
                    type="text"
                    value={ingPurchaseUnit}
                    onChange={(e) => setIngPurchaseUnit(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 text-[10px]">Recipe Unit</label>
                  <input
                    type="text"
                    value={ingRecipeUnit}
                    onChange={(e) => setIngRecipeUnit(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 text-[10px]">Conversion Rate</label>
                  <input
                    type="number"
                    value={ingConversionRate}
                    onChange={(e) => setIngConversionRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Stock Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={ingStockQty}
                    onChange={(e) => setIngStockQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-bold focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Cost / Unit (RWF)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={ingCostPerUnit}
                    onChange={(e) => setIngCostPerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Min Low Alert</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={ingMinAlert}
                    onChange={(e) => setIngMinAlert(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-rose-300 font-bold focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Cold Room #1, Dry Pantry"
                    value={ingStorageLoc}
                    onChange={(e) => setIngStorageLoc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. Nyabugogo Market"
                    value={ingSupplier}
                    onChange={(e) => setIngSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowIngModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                >
                  Save Raw Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECIPE BUILDER */}
      {showRecipeModal && selectedMenuItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-400" />
                  Recipe Formula for "{selectedMenuItem.name}"
                </h3>
                <p className="text-xs text-slate-400">
                  Dish Selling Price: <strong className="text-amber-400">{formatCurrency(selectedMenuItem.price)}</strong>
                </p>
              </div>
              <button onClick={() => setShowRecipeModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">×</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300">Constituent Ingredients</span>
                <button
                  onClick={addRecipeRow}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Ingredient</span>
                </button>
              </div>

              {recipeDraft.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  No ingredients added yet. Click "+ Add Ingredient" above.
                </div>
              ) : (
                <div className="space-y-3">
                  {recipeDraft.map((row, idx) => {
                    const ing = ingredients.find(g => g.id === row.ingredientId);
                    const rowCost = calculateRecipeIngredientCost(row, ing);

                    return (
                      <div key={idx} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Ingredient</label>
                            <select
                              value={row.ingredientId}
                              onChange={(e) => updateRecipeRow(idx, 'ingredientId', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                            >
                              {ingredients.map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name} ({g.stockQuantity} {g.unit} in store)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-28">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Qty ({row.unit || 'g'})</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.001"
                              value={row.quantity}
                              onChange={(e) => updateRecipeRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold"
                            />
                          </div>

                          <div className="w-full sm:w-24">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Waste %</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={row.wastePercentage || 0}
                              onChange={(e) => updateRecipeRow(idx, 'wastePercentage', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-rose-300 font-bold"
                            />
                          </div>

                          <div className="w-full sm:w-28 text-right">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Calculated Cost</label>
                            <span className="font-mono text-emerald-400 font-bold">{formatCurrency(rowCost)}</span>
                          </div>

                          <button
                            onClick={() => removeRecipeRow(idx)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Accompanying Drink Pairings Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center bg-sky-950/60 p-3 rounded-xl border border-sky-800/60">
                  <span className="font-bold text-sky-300 flex items-center gap-1.5">
                    <Wine className="w-4 h-4 text-sky-400" />
                    <span>Accompanying Drink Pairings (Beverage Recommendations)</span>
                  </span>
                  <button
                    onClick={addDrinkRow}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Drink Pairing</span>
                  </button>
                </div>

                {accompanyingDrinksDraft.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3 border border-dashed border-slate-800 rounded-xl">
                    No accompanying drinks attached yet. Click "+ Add Drink Pairing" to suggest beverages for this dish.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {accompanyingDrinksDraft.map((drinkRow, dIdx) => (
                      <div key={drinkRow.id || dIdx} className="p-3 bg-slate-950 rounded-2xl border border-sky-900/40 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Select Menu Drink</label>
                            <select
                              value={drinkRow.menuItemId || ''}
                              onChange={(e) => {
                                const selectedMenu = menuItems.find(m => m.id === e.target.value);
                                updateDrinkRow(dIdx, {
                                  menuItemId: e.target.value,
                                  drinkName: selectedMenu ? selectedMenu.name : drinkRow.drinkName
                                });
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                            >
                              <option value="">-- Custom Drink Name --</option>
                              {menuItems.map(m => (
                                <option key={m.id} value={m.id}>
                                  [{m.category}] {m.name} ({formatCurrency(m.price)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Drink Name</label>
                            <input
                              type="text"
                              value={drinkRow.drinkName}
                              onChange={(e) => updateDrinkRow(dIdx, { drinkName: e.target.value })}
                              placeholder="e.g. Fresh Orange Juice"
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-sky-300 font-bold"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Qty & Unit</label>
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                min="1"
                                value={drinkRow.quantity}
                                onChange={(e) => updateDrinkRow(dIdx, { quantity: parseInt(e.target.value) || 1 })}
                                className="w-12 px-1 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold text-center"
                              />
                              <input
                                type="text"
                                value={drinkRow.unit || 'Bottle'}
                                onChange={(e) => updateDrinkRow(dIdx, { unit: e.target.value })}
                                className="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-slate-400 font-bold mb-1">Extra Price</label>
                            <input
                              type="number"
                              value={drinkRow.extraPrice || 0}
                              onChange={(e) => updateDrinkRow(dIdx, { extraPrice: parseFloat(e.target.value) || 0 })}
                              placeholder="0 RWF"
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <input
                            type="text"
                            value={drinkRow.notes || ''}
                            onChange={(e) => updateDrinkRow(dIdx, { notes: e.target.value })}
                            placeholder="Serving notes e.g., 'Served chilled with ice'..."
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300 text-[10px]"
                          />
                          <button
                            onClick={() => removeDrinkRow(dIdx)}
                            className="p-1 text-rose-400 hover:text-rose-300 shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipe Cost Summary */}
              {recipeDraft.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl border border-emerald-500/30 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Recipe Cost</p>
                    <p className="font-black text-emerald-400 text-sm">{formatCurrency(calculateTotalRecipeCost(recipeDraft))}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Selling Price</p>
                    <p className="font-black text-amber-400 text-sm">{formatCurrency(selectedMenuItem.price)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Profit Margin</p>
                    <p className="font-black text-cyan-300 text-sm">
                      {selectedMenuItem.price > 0 ? Math.round(((selectedMenuItem.price - calculateTotalRecipeCost(recipeDraft)) / selectedMenuItem.price) * 100) : 0}%
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecipeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecipeDraft}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                >
                  Save Recipe Formula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG WASTE INCIDENT */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <span>Log Kitchen Waste & Spoilage</span>
              </h3>
              <button onClick={() => setShowWasteModal(false)} className="text-slate-400 hover:text-white font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSubmitWaste} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Raw Ingredient *</label>
                <select
                  value={wasteIngId}
                  onChange={(e) => {
                    setWasteIngId(e.target.value);
                    const ing = ingredients.find(g => g.id === e.target.value);
                    if (ing) setWasteUnit(ing.recipeUnit || ing.unit);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.stockQuantity} {ing.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Waste Type</label>
                  <select
                    value={wasteType}
                    onChange={(e) => setWasteType(e.target.value as WasteType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    {WASTE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Quantity Wasted</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={wasteQty}
                      onChange={(e) => setWasteQty(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-rose-300 font-bold"
                    />
                    <span className="px-3 py-2 bg-slate-800 rounded-xl text-slate-300 font-bold shrink-0">{wasteUnit}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reason / Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Burnt during high heat prep, Expired raw batch..."
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reported By Staff</label>
                <input
                  type="text"
                  required
                  value={wasteReportedBy}
                  onChange={(e) => setWasteReportedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black shadow-lg shadow-rose-500/20"
                >
                  Record & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
