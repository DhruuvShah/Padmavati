import { Router } from "express";
import { supabase, adminSupabase } from "../lib/supabase";
import { requireAdmin } from "../middleware/requireAdmin";
import { generateBarcodePng, generateQrPng, buildProductUrl } from "../lib/productCodes";
import { ensurePublicBucket } from "../lib/storage";

const BUCKET = "product-codes";
const FRONTEND_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")[0];

export class ProductNotFoundError extends Error {}
export class ProductMissingSkuError extends Error {}

/**
 * Renders a fresh Code128 barcode + QR code for a product's SKU, stores
 * them, and saves the URLs on the product row. Shared by the single-product
 * route below and the backfill route, since both need the exact same
 * pipeline — this is the closest thing to "auto-triggered the instant a SKU
 * is assigned" we can do from application code (SKU assignment itself
 * happens in a DB trigger, which can't render images).
 */
export async function generateAndStoreProductCodes(productId: string): Promise<{ barcodeUrl: string; qrCodeUrl: string }> {
  const { data: product, error: fetchErr } = await adminSupabase
    .from("products")
    .select("id, sku")
    .eq("id", productId)
    .single();
  if (fetchErr || !product) throw new ProductNotFoundError("Product not found");
  if (!product.sku) throw new ProductMissingSkuError("Product has no SKU yet");

  await ensurePublicBucket(BUCKET);

  const productUrl = buildProductUrl(FRONTEND_ORIGIN, product.id);
  const [barcodePng, qrPng] = await Promise.all([
    generateBarcodePng(product.sku),
    generateQrPng(productUrl),
  ]);

  const barcodeFile = `${product.sku}-barcode.png`;
  const qrFile = `${product.sku}-qr.png`;

  const [barcodeUpload, qrUpload] = await Promise.all([
    adminSupabase.storage.from(BUCKET).upload(barcodeFile, barcodePng, { contentType: "image/png", upsert: true }),
    adminSupabase.storage.from(BUCKET).upload(qrFile, qrPng, { contentType: "image/png", upsert: true }),
  ]);
  if (barcodeUpload.error) throw new Error("Failed to upload barcode: " + barcodeUpload.error.message);
  if (qrUpload.error) throw new Error("Failed to upload QR code: " + qrUpload.error.message);

  const { data: { publicUrl: barcodeUrl } } = supabase.storage.from(BUCKET).getPublicUrl(barcodeFile);
  const { data: { publicUrl: qrCodeUrl } } = supabase.storage.from(BUCKET).getPublicUrl(qrFile);

  const { error: updateErr } = await adminSupabase
    .from("products")
    .update({ barcode_url: barcodeUrl, qr_code_url: qrCodeUrl })
    .eq("id", productId);
  if (updateErr) throw new Error("Failed to save code URLs: " + updateErr.message);

  return { barcodeUrl, qrCodeUrl };
}

export const productCodesRouter = Router();

productCodesRouter.post("/api/admin/generate-product-codes", requireAdmin, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: "Missing productId" });

    const { barcodeUrl, qrCodeUrl } = await generateAndStoreProductCodes(productId);
    res.json({ success: true, barcodeUrl, qrCodeUrl });
  } catch (e: any) {
    if (e instanceof ProductNotFoundError) return res.status(404).json({ error: e.message });
    if (e instanceof ProductMissingSkuError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});
