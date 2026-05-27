import { supabase } from "@/lib/supabase";

export class ProductService {
  static async getProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, 
        name, 
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
}
