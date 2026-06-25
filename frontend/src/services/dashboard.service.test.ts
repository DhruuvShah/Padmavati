import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

let builders: Record<string, ReturnType<typeof createMockQueryBuilder>> = {};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (!builders[table]) throw new Error(`No mock configured for table: ${table}`);
      return builders[table];
    },
  },
}));

async function importService() {
  const mod = await import("./dashboard.service");
  return mod.DashboardService;
}

describe("DashboardService.getCounts", () => {
  beforeEach(() => {
    builders = {
      products: createMockQueryBuilder({ data: null, error: null, count: 12 }),
      categories: createMockQueryBuilder({ data: null, error: null, count: 4 }),
      catalogues: createMockQueryBuilder({ data: null, error: null, count: 7 }),
      access_requests: createMockQueryBuilder({ data: null, error: null, count: 2 }),
    };
  });

  it("returns the count from each table, mapped to named fields", async () => {
    const DashboardService = await importService();
    expect(await DashboardService.getCounts()).toEqual({
      products: 12,
      categories: 4,
      catalogues: 7,
      pendingShares: 2,
    });
  });

  it("defaults every count to 0 instead of null/undefined", async () => {
    builders = {
      products: createMockQueryBuilder({ data: null, error: null, count: null }),
      categories: createMockQueryBuilder({ data: null, error: null, count: null }),
      catalogues: createMockQueryBuilder({ data: null, error: null, count: null }),
      access_requests: createMockQueryBuilder({ data: null, error: null, count: null }),
    };
    const DashboardService = await importService();
    expect(await DashboardService.getCounts()).toEqual({
      products: 0,
      categories: 0,
      catalogues: 0,
      pendingShares: 0,
    });
  });
});

describe("DashboardService.getRecentProducts", () => {
  beforeEach(() => {
    builders = {
      products: createMockQueryBuilder({ data: [{ id: "1", name: "Ganesh" }], error: null }),
    };
  });

  it("returns the recent products list", async () => {
    const DashboardService = await importService();
    expect(await DashboardService.getRecentProducts(3)).toEqual([{ id: "1", name: "Ganesh" }]);
  });

  it("returns an empty array when there's no data", async () => {
    builders.products = createMockQueryBuilder({ data: null, error: null });
    const DashboardService = await importService();
    expect(await DashboardService.getRecentProducts()).toEqual([]);
  });
});
