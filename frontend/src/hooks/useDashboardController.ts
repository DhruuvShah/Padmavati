import { useState, useEffect } from "react";
import { DashboardService } from "@/services/dashboard.service";

export function useDashboardController() {
  const [counts, setCounts] = useState({
    products: 0,
    categories: 0,
    catalogues: 0,
    pendingShares: 0
  });

  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const [fetchedCounts, fetchedRecent] = await Promise.all([
          DashboardService.getCounts(),
          DashboardService.getRecentProducts(3)
        ]);
        
        setCounts(fetchedCounts);
        setRecentProducts(fetchedRecent);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  return {
    counts,
    recentProducts,
    isLoading
  };
}
