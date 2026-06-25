import { Router } from "express";
import { adminSupabase } from "../lib/supabase";
import { requireAdmin } from "../middleware/requireAdmin";
import { generateAndStoreProductCodes } from "./product-codes.routes";

export const productsRouter = Router();

const CODE_GENERATION_BATCH_SIZE = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/**
 * Touches every product/category missing a SKU/prefix so the
 * assign_product_sku / assign_category_sku_prefix DB triggers fire and fill
 * them in. Categories first, since the product trigger reads each
 * product's category prefix. Then renders barcode/QR codes for any product
 * that now has a SKU but is still missing one or both images — covers
 * products created before Phase 2 shipped, and any that failed to get
 * codes generated inline when they were saved.
 */
productsRouter.post("/api/admin/backfill-skus", requireAdmin, async (_req, res) => {
  try {
    const { data: categories, error: catErr } = await adminSupabase
      .from("categories")
      .update({ updated_at: new Date().toISOString() })
      .is("sku_prefix", null)
      .select("id");
    if (catErr) throw new Error("Failed to backfill category prefixes: " + catErr.message);

    const { data: products, error: productErr } = await adminSupabase
      .from("products")
      .update({ updated_at: new Date().toISOString() })
      .is("sku", null)
      .select("id");
    if (productErr) throw new Error("Failed to backfill product SKUs: " + productErr.message);

    const { data: missingCodes, error: missingCodesErr } = await adminSupabase
      .from("products")
      .select("id")
      .not("sku", "is", null)
      .or("barcode_url.is.null,qr_code_url.is.null");
    if (missingCodesErr) throw new Error("Failed to find products missing codes: " + missingCodesErr.message);

    let codesBackfilled = 0;
    for (const batch of chunk(missingCodes ?? [], CODE_GENERATION_BATCH_SIZE)) {
      const results = await Promise.allSettled(batch.map((p) => generateAndStoreProductCodes(p.id)));
      codesBackfilled += results.filter((r) => r.status === "fulfilled").length;
    }

    res.json({
      success: true,
      categoriesBackfilled: categories?.length ?? 0,
      productsBackfilled: products?.length ?? 0,
      codesBackfilled,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
