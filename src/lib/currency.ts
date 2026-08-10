export const DEFAULT_CURRENCY = 'RWF';

/**
 * Formats amount into Rwandan Franc (RWF)
 * e.g. 1500 -> "1,500 RWF"
 */
export function formatCurrency(amount: number, showSymbol: boolean = true): string {
  const val = Math.round(amount || 0);
  const formatted = val.toLocaleString('en-US');
  return showSymbol ? `${formatted} RWF` : formatted;
}
