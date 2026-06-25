import { Router } from "express";
import crypto from "crypto";
import { supabase, adminSupabase } from "../lib/supabase";
import { buildCatalogueHtml, sortProductsByRequestedOrder } from "../lib/catalogueTemplate";
import { renderHtmlToPdf } from "../lib/renderPdf";

export const catalogueRouter = Router();

catalogueRouter.post("/api/generate-catalogue", async (req, res) => {
  try {
    const { title, productIds } = req.body;
    if (!title || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "Missing title or productIds" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const { data: products, error: pErr } = await adminSupabase
      .from("products")
      .select(`
        id,
        name,
        image_url,
        weight_kg,
        height_inches,
        length_inches,
        rate_type,
        direct_rate,
        category:categories(name),
        rate_code:rate_codes(code, value),
        variants:product_variants(id, weight_kg, direct_rate, rate_code_id, height_inches, length_inches, rate_code:rate_codes(code, value))
      `)
      .in("id", productIds);

    if (pErr) throw new Error("Failed to fetch products: " + pErr.message);

    const sortedProducts = sortProductsByRequestedOrder(productIds, products ?? []);
    const html = buildCatalogueHtml(title, sortedProducts as any);
    const pdfBuffer = await renderHtmlToPdf(html);

    const share_uuid = crypto.randomUUID();
    const fileName = share_uuid + ".pdf";

    const { data: buckets } = await adminSupabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "catalogue-pdfs")) {
      await adminSupabase.storage.createBucket("catalogue-pdfs", { public: true });
    }

    const { error: uploadErr } = await adminSupabase.storage
      .from("catalogue-pdfs")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      throw new Error("Failed to upload PDF: " + uploadErr.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("catalogue-pdfs")
      .getPublicUrl(fileName);

    const { data: catData, error: catErr } = await adminSupabase
      .from("catalogues")
      .insert({
        title: title,
        share_uuid: share_uuid,
        pdf_url: publicUrl,
      })
      .select()
      .single();

    if (catErr) {
      throw new Error("Failed to insert catalogue: " + catErr.message);
    }

    const catalogueId = catData.id;

    const catalogueProducts = sortedProducts.map((p, index) => ({
      catalogue_id: catalogueId,
      product_id: p.id,
      sort_order: index,
    }));

    const { error: cpErr } = await adminSupabase
      .from("catalogue_products")
      .insert(catalogueProducts);

    if (cpErr) {
      throw new Error("Failed to insert catalogue products: " + cpErr.message);
    }

    res.json({ success: true, catalogue: catData });
  } catch (err: any) {
    console.error("Generate Catalogue Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});
