import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const { mockSharp } = vi.hoisted(() => ({
  mockSharp: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed-image")),
  })),
}));

vi.mock("sharp", () => ({ default: mockSharp }));

// requireAdmin has its own dedicated test file; here we stub it so these
// tests exercise upload logic, not auth.
vi.mock("../middleware/requireAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockListBuckets = vi.fn();
const mockCreateBucket = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    storage: { from: () => ({ getPublicUrl: mockGetPublicUrl }) },
  },
  adminSupabase: {
    storage: {
      listBuckets: mockListBuckets,
      createBucket: mockCreateBucket,
      from: () => ({ upload: mockUpload }),
    },
  },
}));

async function buildApp() {
  const { uploadImageRouter } = await import("./upload-image.routes");
  const app = express();
  app.use(uploadImageRouter);
  return app;
}

describe("POST /api/upload-image", () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: "https://example.com/img.jpg" } });
    mockListBuckets.mockReset().mockResolvedValue({ data: [{ name: "product-images" }] });
    mockCreateBucket.mockReset();
  });

  it("returns 400 when no file is attached", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/upload-image");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no image file/i);
  });

  it("processes the image, uploads it, and returns a public URL", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/upload-image")
      .attach("image", Buffer.from("fake-bytes"), "photo.jpg");

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://example.com/img.jpg");
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("creates the storage bucket if it doesn't exist yet", async () => {
    mockListBuckets.mockResolvedValue({ data: [] });
    const app = await buildApp();
    await request(app).post("/api/upload-image").attach("image", Buffer.from("fake-bytes"), "photo.jpg");

    expect(mockCreateBucket).toHaveBeenCalledWith("product-images", { public: true });
  });

  it("returns 500 when the storage upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "disk full" } });
    const app = await buildApp();
    const res = await request(app)
      .post("/api/upload-image")
      .attach("image", Buffer.from("fake-bytes"), "photo.jpg");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("disk full");
  });
});
