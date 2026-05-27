import { useState, useEffect } from "react";
import { ProductService } from "@/services/product.service";
import { toast } from "sonner";

export function useProductController() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
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
    }
    loadData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
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
    setCategoryFilter
  };
}
