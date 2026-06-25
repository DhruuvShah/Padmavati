import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

const { mockRenderHtmlToPdf } = vi.hoisted(() => ({
  mockRenderHtmlToPdf: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-bytes")),
}));
vi.mock("../lib/renderPdf", () => ({ renderHtmlToPdf: mockRenderHtmlToPdf }));

const mockProductsBuilder = createMockQueryBuilder({
  data: [
    { id: "p1", name: "Ganesh", rate_type: "per_kg", direct_rate: 1500, category: null, rate_code: null, variants: [] },
  ],
  error: null,
});
const mockCataloguesInsertBuilder = createMockQueryBuilder({
  data: { id: "cat1", title: "My Catalogue", share_uuid: "uuid-1", pdf_url: "https://example.com/x.pdf" },
  error: null,
});
const mockCatalogueProductsBuilder = createMockQueryBuilder({ data: null, error: null });

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockListBuckets = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    storage: { from: () => ({ getPublicUrl: mockGetPublicUrl }) },
  },
  adminSupabase: {
    from: (table: string) => {
      if (table === "products") return mockProductsBuilder;
      if (table === "catalogues") return mockCataloguesInsertBuilder;
      if (table === "catalogue_products") return mockCatalogueProductsBuilder;
      throw new Error(`Unexpected table in test: ${table}`);
    },
    storage: {
      listBuckets: mockListBuckets,
      createBucket: vi.fn(),
      from: () => ({ upload: mockUpload }),
    },
  },
}));

async function buildApp() {
  const { catalogueRouter } = await import("./catalogue.routes");
  const app = express();
  app.use(express.json());
  app.use(catalogueRouter);
  return app;
}

describe("POST /api/generate-catalogue", () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: "https://example.com/x.pdf" } });
    mockListBuckets.mockReset().mockResolvedValue({ data: [{ name: "catalogue-pdfs" }] });
    mockRenderHtmlToPdf.mockClear();
  });

  it("returns 400 when title is missing", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/generate-catalogue")
      .set("Authorization", "Bearer token")
      .send({ productIds: ["p1"] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when productIds is empty", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/generate-catalogue")
      .set("Authorization", "Bearer token")
      .send({ title: "X", productIds: [] });
    expect(res.status).toBe(400);
  });

  it("returns 401 when no Authorization header is present", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/generate-catalogue")
      .send({ title: "X", productIds: ["p1"] });
    expect(res.status).toBe(401);
  });

  it("generates a PDF, uploads it, and creates the catalogue + junction rows", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/generate-catalogue")
      .set("Authorization", "Bearer token")
      .send({ title: "My Catalogue", productIds: ["p1"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.catalogue.share_uuid).toBe("uuid-1");
    expect(mockRenderHtmlToPdf).toHaveBeenCalledOnce();
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("returns 500 when the PDF upload to storage fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "storage down" } });
    const app = await buildApp();
    const res = await request(app)
      .post("/api/generate-catalogue")
      .set("Authorization", "Bearer token")
      .send({ title: "My Catalogue", productIds: ["p1"] });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/storage down/);
  });
});
