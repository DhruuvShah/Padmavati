import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

let productsBuilder = createMockQueryBuilder({ data: null, error: null });
let categoriesBuilder = createMockQueryBuilder({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "products") return productsBuilder;
      if (table === "categories") return categoriesBuilder;
      throw new Error(`Unexpected table in test: ${table}`);
    },
  },
}));

async function importService() {
  const mod = await import("./product.service");
  return mod.ProductService;
}

describe("ProductService.getProducts", () => {
  beforeEach(() => {
    productsBuilder = createMockQueryBuilder({ data: null, error: null });
  });

  it("returns the product list on success", async () => {
    productsBuilder = createMockQueryBuilder({ data: [{ id: "1", name: "Ganesh" }], error: null });
    const ProductService = await importService();
    expect(await ProductService.getProducts()).toEqual([{ id: "1", name: "Ganesh" }]);
  });

  it("returns an empty array instead of null when there's no data", async () => {
    productsBuilder = createMockQueryBuilder({ data: null, error: null });
    const ProductService = await importService();
    expect(await ProductService.getProducts()).toEqual([]);
  });

  it("throws when the query errors, so callers can surface it", async () => {
    productsBuilder = createMockQueryBuilder({ data: null, error: { message: "db down" } });
    const ProductService = await importService();
    await expect(ProductService.getProducts()).rejects.toEqual({ message: "db down" });
  });
});

describe("ProductService.getCategories", () => {
  beforeEach(() => {
    categoriesBuilder = createMockQueryBuilder({ data: null, error: null });
  });

  it("returns the category list on success", async () => {
    categoriesBuilder = createMockQueryBuilder({ data: [{ id: "1", name: "Ganpati" }], error: null });
    const ProductService = await importService();
    expect(await ProductService.getCategories()).toEqual([{ id: "1", name: "Ganpati" }]);
  });

  it("throws when the query errors", async () => {
    categoriesBuilder = createMockQueryBuilder({ data: null, error: { message: "boom" } });
    const ProductService = await importService();
    await expect(ProductService.getCategories()).rejects.toEqual({ message: "boom" });
  });
});
