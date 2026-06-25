import { useState, useEffect, useCallback } from "react";
import { ProductService } from "@/services/product.service";
import { toast } from "sonner";

export function useProductController() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        ProductService.getProducts(),
        ProductService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      toast.error("Failed to load products: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term);
    const matchesCategory = categoryFilter === "all" || p.category?.id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return {
    products: filteredProducts,
    categories,
    loading,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    refetch: loadData
  };
}
