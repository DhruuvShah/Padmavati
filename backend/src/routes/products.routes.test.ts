import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

vi.mock("../middleware/requireAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

const { mockGenerateAndStoreProductCodes } = vi.hoisted(() => ({
  mockGenerateAndStoreProductCodes: vi.fn().mockResolvedValue({ barcodeUrl: "x", qrCodeUrl: "y" }),
}));
vi.mock("./product-codes.routes", () => ({
  generateAndStoreProductCodes: mockGenerateAndStoreProductCodes,
}));

let categoriesBuilder = createMockQueryBuilder<any>({ data: [], error: null });
// The route calls .from("products") twice in sequence (the SKU backfill
// update, then the missing-codes select) — track call order so each gets
// its own canned response instead of sharing one.
let productsSkuBackfillBuilder = createMockQueryBuilder<any>({ data: [], error: null });
let productsMissingCodesBuilder = createMockQueryBuilder<any>({ data: [], error: null });
let productsFromCallCount = 0;

vi.mock("../lib/supabase", () => ({
  adminSupabase: {
    from: (table: string) => {
      if (table === "categories") return categoriesBuilder;
      if (table === "products") {
        productsFromCallCount += 1;
        return productsFromCallCount === 1 ? productsSkuBackfillBuilder : productsMissingCodesBuilder;
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  },
}));

async function buildApp() {
  const { productsRouter } = await import("./products.routes");
  const app = express();
  app.use(express.json());
  app.use(productsRouter);
  return app;
}

describe("POST /api/admin/backfill-skus", () => {
  beforeEach(() => {
    productsFromCallCount = 0;
    mockGenerateAndStoreProductCodes.mockClear().mockResolvedValue({ barcodeUrl: "x", qrCodeUrl: "y" });
    categoriesBuilder = createMockQueryBuilder({ data: [{ id: "c1" }], error: null });
    productsSkuBackfillBuilder = createMockQueryBuilder({ data: [{ id: "p1" }, { id: "p2" }], error: null });
    productsMissingCodesBuilder = createMockQueryBuilder({ data: [], error: null });
  });

  it("touches categories and products missing a sku/prefix and reports the counts", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, categoriesBackfilled: 1, productsBackfilled: 2, codesBackfilled: 0 });
  });

  it("returns 500 when the category backfill fails", async () => {
    categoriesBuilder = createMockQueryBuilder({ data: null, error: { message: "db down" } });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/db down/);
  });

  it("returns 500 when the product sku backfill fails", async () => {
    productsSkuBackfillBuilder = createMockQueryBuilder({ data: null, error: { message: "db down" } });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/db down/);
  });

  it("returns 500 when finding products missing codes fails", async () => {
    productsMissingCodesBuilder = createMockQueryBuilder({ data: null, error: { message: "db down" } });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/db down/);
  });

  it("generates codes for products that have a sku but are missing one or both images", async () => {
    productsMissingCodesBuilder = createMockQueryBuilder({ data: [{ id: "p3" }, { id: "p4" }], error: null });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(200);
    expect(res.body.codesBackfilled).toBe(2);
    expect(mockGenerateAndStoreProductCodes).toHaveBeenCalledWith("p3");
    expect(mockGenerateAndStoreProductCodes).toHaveBeenCalledWith("p4");
  });

  it("doesn't let one product's code-generation failure block the others", async () => {
    productsMissingCodesBuilder = createMockQueryBuilder({ data: [{ id: "p3" }, { id: "p4" }], error: null });
    mockGenerateAndStoreProductCodes
      .mockRejectedValueOnce(new Error("render failed"))
      .mockResolvedValueOnce({ barcodeUrl: "x", qrCodeUrl: "y" });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/backfill-skus");

    expect(res.status).toBe(200);
    expect(res.body.codesBackfilled).toBe(1);
  });
});
