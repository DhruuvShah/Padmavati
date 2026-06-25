export interface PriceableProduct {
  direct_rate?: number | string | null;
  rate_code?: { value: number | string } | null;
}

export interface WeighableProduct {
  weight_kg?: number | string | null;
}

/** A product's effective selling price: a direct rate always wins over a linked rate code. */
export function getProductPrice(product: PriceableProduct): number {
  if (product.direct_rate) return Number(product.direct_rate);
  if (product.rate_code) return Number(product.rate_code.value);
  return 0;
}

/** Product weight converted from kg (as stored) to grams (as the weight filter UI works in). */
export function getProductWeightGrams(product: WeighableProduct): number {
  return product.weight_kg ? Number(product.weight_kg) * 1000 : 0;
}

/**
 * Sizes a [0, max] filter range to the actual data instead of a fixed default,
 * so a product whose price/weight exceeds the default ceiling isn't silently
 * excluded by a filter the user never touched.
 */
export function computeRangeCeiling(values: number[], defaultCeiling: number): number {
  if (values.length === 0) return defaultCeiling;
  return Math.max(defaultCeiling, ...values);
}
