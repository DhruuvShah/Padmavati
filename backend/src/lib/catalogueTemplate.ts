export interface CatalogueProductVariant {
  weight_kg?: string | number | null;
  direct_rate?: string | number | null;
  height_inches?: string | number | null;
  length_inches?: string | number | null;
  rate_code?: { code: string; value: string | number } | null;
}

export interface CatalogueProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode_url?: string | null;
  qr_code_url?: string | null;
  image_url?: string | null;
  weight_kg?: string | number | null;
  height_inches?: string | number | null;
  length_inches?: string | number | null;
  rate_type: "per_kg" | "per_piece";
  direct_rate?: string | number | null;
  category?: { name: string } | null;
  rate_code?: { code: string; value: string | number } | null;
  variants?: CatalogueProductVariant[] | null;
}

/** Preserves the caller's requested ordering rather than the DB's natural order. */
export function sortProductsByRequestedOrder<T extends { id: string }>(
  productIds: string[],
  products: T[]
): T[] {
  return productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is T => p != null);
}

export function formatRate(
  rateType: "per_kg" | "per_piece",
  directRate?: string | number | null,
  rateCode?: { code: string; value: string | number } | null
): string {
  const unit = rateType === "per_kg" ? "kg" : "piece";
  if (directRate) return `₹${directRate}/${unit}`;
  if (rateCode) return `${rateCode.code} → ₹${rateCode.value}/${unit}`;
  return "-";
}

export function getCategoryName(product: CatalogueProduct): string {
  return product.category ? product.category.name : "Uncategorized";
}

export function getWeightText(product: CatalogueProduct): string {
  return product.weight_kg ? `${product.weight_kg} kg` : "-";
}

export function getDimensionsText(product: CatalogueProduct): string {
  return product.height_inches || product.length_inches
    ? `H: ${product.height_inches || "-"} × L: ${product.length_inches || "-"}`
    : "-";
}
