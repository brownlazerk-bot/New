import { KitchenIngredient, RecipeIngredient } from '../types';

/**
 * Normalizes unit strings for robust matching.
 */
export function normalizeUnit(unit: string): string {
  if (!unit) return '';
  const u = unit.trim().toLowerCase();
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms' || u === 'kilo') return 'kg';
  if (u === 'g' || u === 'gram' || u === 'grams') return 'g';
  if (u === 'litre' || u === 'litres' || u === 'liter' || u === 'liters' || u === 'l') return 'l';
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return 'ml';
  if (u === 'piece' || u === 'pieces' || u === 'pc' || u === 'pcs') return 'pcs';
  if (u === 'bottle' || u === 'bottles' || u === 'btl') return 'bottle';
  if (u === 'can' || u === 'cans') return 'can';
  if (u === 'box' || u === 'boxes') return 'box';
  if (u === 'pack' || u === 'packs' || u === 'packet') return 'pack';
  if (u === 'tray' || u === 'trays') return 'tray';
  return u;
}

/**
 * Converts a quantity from recipe unit to store unit.
 * Example: Recipe requires 300 g of Chicken. Store unit is Kg.
 * Result: 300 g -> 0.3 Kg.
 */
export function convertRecipeQtyToStoreQty(
  qty: number,
  recipeUnit: string,
  storeUnit: string,
  conversionRate?: number
): number {
  const normRecipe = normalizeUnit(recipeUnit);
  const normStore = normalizeUnit(storeUnit);

  if (normRecipe === normStore) {
    return qty;
  }

  // Weight conversions
  if (normRecipe === 'g' && normStore === 'kg') {
    return qty / 1000;
  }
  if (normRecipe === 'kg' && normStore === 'g') {
    return qty * 1000;
  }

  // Volume conversions
  if (normRecipe === 'ml' && normStore === 'l') {
    return qty / 1000;
  }
  if (normRecipe === 'l' && normStore === 'ml') {
    return qty * 1000;
  }

  // Count & custom packaging conversions
  // If store is Box and recipe is Bottle/Piece, conversionRate = Bottles per Box (e.g., 24)
  if (conversionRate && conversionRate > 0) {
    if (normStore === 'box' || normStore === 'pack' || normStore === 'tray') {
      return qty / conversionRate;
    }
  }

  // Default fallback if unknown custom units
  return qty;
}

/**
 * Calculates total effective quantity considering waste and yield percentages.
 * Yield % = 90% means 10% loss during prep, so required raw ingredient = recipeQty / 0.9.
 */
export function calculateEffectiveRecipeQty(
  baseQty: number,
  wastePercentage: number = 0,
  yieldPercentage: number = 100
): number {
  let qty = baseQty;
  if (wastePercentage > 0) {
    qty = qty * (1 + wastePercentage / 100);
  }
  if (yieldPercentage > 0 && yieldPercentage < 100) {
    qty = qty / (yieldPercentage / 100);
  }
  return Math.round(qty * 10000) / 10000;
}

/**
 * Calculates raw food cost for a single recipe ingredient item.
 */
export function calculateRecipeIngredientCost(
  recipeItem: RecipeIngredient,
  ingredient?: KitchenIngredient
): number {
  if (!ingredient) return (recipeItem.quantity * (recipeItem.costPerUnit || 0));

  const effectiveQty = calculateEffectiveRecipeQty(
    recipeItem.quantity,
    recipeItem.wastePercentage || 0,
    recipeItem.yieldPercentage || 100
  );

  // Convert recipe quantity to ingredient's store unit to calculate exact cost
  const storeQty = convertRecipeQtyToStoreQty(
    effectiveQty,
    recipeItem.unit,
    ingredient.unit,
    ingredient.conversionRate
  );

  return storeQty * ingredient.costPerUnit;
}
