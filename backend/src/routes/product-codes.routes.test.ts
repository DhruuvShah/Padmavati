import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

vi.mock("../middleware/requireAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

const { mockGenerateBarcodePng, mockGenerateQrPng, mockEnsurePublicBucket } = vi.hoisted(() => ({
  mockGenerateBarcodePng: vi.fn().mockResolvedValue(Buffer.from("fake-barcode")),
  mockGenerateQrPng: vi.fn().mockResolvedValue(Buffer.from("fake-qr")),
  mockEnsurePublicBucket: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../lib/productCodes", () => ({
  generateBarcodePng: mockGenerateBarcodePng,
  generateQrPng: mockGenerateQrPng,
  buildProductUrl: (origin: string, id: string) => `${origin}/admin/products/${id}/edit`,
}));
vi.mock("../lib/storage", () => ({ ensurePublicBucket: mockEnsurePublicBucket }));

let productsBuilder = createMockQueryBuilder<any>({ data: null, error: null });
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: mockGetPublicUrl }) } },
  adminSupabase: {
    from: () => productsBuilder,
    storage: { from: () => ({ upload: mockUpload }) },
  },
}));

async function buildApp() {
  const { productCodesRouter } = await import("./product-codes.routes");
  const app = express();
  app.use(express.json());
  app.use(productCodesRouter);
  return app;
}

describe("POST /api/admin/generate-product-codes", () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockGetPublicUrl
      .mockReset()
      .mockReturnValueOnce({ data: { publicUrl: "https://example.com/GAN-001-barcode.png" } })
      .mockReturnValueOnce({ data: { publicUrl: "https://example.com/GAN-001-qr.png" } });
    mockGenerateBarcodePng.mockClear();
    mockGenerateQrPng.mockClear();
    mockEnsurePublicBucket.mockClear();
  });

  it("returns 400 when productId is missing", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/admin/generate-product-codes").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when the product doesn't exist", async () => {
    productsBuilder = createMockQueryBuilder({ data: null, error: { message: "not found" } });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/generate-product-codes").send({ productId: "p1" });
    expect(res.status).toBe(404);
  });

  it("returns 400 when the product has no sku yet", async () => {
    productsBuilder = createMockQueryBuilder({ data: { id: "p1", sku: null }, error: null });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/generate-product-codes").send({ productId: "p1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no SKU/);
  });

  it("generates and uploads barcode + QR, then saves their URLs", async () => {
    productsBuilder = createMockQueryBuilder({ data: { id: "p1", sku: "GAN-001" }, error: null });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/generate-product-codes").send({ productId: "p1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      barcodeUrl: "https://example.com/GAN-001-barcode.png",
      qrCodeUrl: "https://example.com/GAN-001-qr.png",
    });
    expect(mockGenerateBarcodePng).toHaveBeenCalledWith("GAN-001");
    expect(mockGenerateQrPng).toHaveBeenCalledOnce();
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when the barcode upload fails", async () => {
    productsBuilder = createMockQueryBuilder({ data: { id: "p1", sku: "GAN-001" }, error: null });
    mockUpload.mockResolvedValueOnce({ error: { message: "storage down" } });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/generate-product-codes").send({ productId: "p1" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/storage down/);
  });
});
