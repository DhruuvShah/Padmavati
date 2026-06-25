import { supabase } from "@/lib/supabase";

export class DashboardService {
  static async getCounts() {
    const [
      { count: productsCount },
      { count: categoriesCount },
      { count: cataloguesCount },
      { count: pendingSharesCount }
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('catalogues').select('*', { count: 'exact', head: true }),
      supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    return {
      products: productsCount || 0,
      categories: categoriesCount || 0,
      catalogues: cataloguesCount || 0,
      pendingShares: pendingSharesCount || 0
    };
  }

  static async getRecentProducts(limit: number = 3) {
    const { data } = await supabase
      .from('products')
      .select(`
        id,
        name,
        rate_type,
        direct_rate,
        category:categories(name),
        rate_code:rate_codes(code, value)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}
