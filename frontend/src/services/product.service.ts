import { supabase } from "@/lib/supabase";

export class ProductService {
  static async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        sku,
        qr_code_url,
        weight_kg,
        height_inches, 
        length_inches, 
        rate_type,
        direct_rate,
        image_url,
        category:categories(id, name),
        rate_code:rate_codes(id, code, value)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  }

  static async getCategories() {
    const { data, error } = await supabase.from("categories").select("*").order("name");
    if (error) {
      throw error;
    }
    return data || [];
  }

  /** Looks up a product's id by its exact SKU (as decoded from a scanned barcode). */
  static async getIdBySku(sku: string): Promise<string | null> {
    const { data, error } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
    if (error) {
      throw error;
    }
    return data?.id ?? null;
  }
}
