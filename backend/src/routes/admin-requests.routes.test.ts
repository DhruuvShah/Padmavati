import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

vi.mock("../middleware/requireAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

let accessRequestsBuilder = createMockQueryBuilder<any>({ data: null, error: null });

vi.mock("../lib/supabase", () => ({
  adminSupabase: { from: () => accessRequestsBuilder },
  supabaseAnonKey: "test-anon-key",
}));

async function buildApp() {
  const { adminRequestsRouter } = await import("./admin-requests.routes");
  const app = express();
  app.use(express.json());
  app.use(adminRequestsRouter);
  return app;
}

describe("GET /api/admin/pending-requests", () => {
  it("returns the pending, email-verified requests", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: [{ id: "r1", name: "Alice", status: "pending" }],
      error: null,
    });
    const app = await buildApp();
    const res = await request(app).get("/api/admin/pending-requests");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "r1", name: "Alice", status: "pending" }]);
  });

  it("returns 500 when the query fails", async () => {
    accessRequestsBuilder = createMockQueryBuilder({ data: null, error: { message: "db down" } });
    const app = await buildApp();
    const res = await request(app).get("/api/admin/pending-requests");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("db down");
  });
});

describe("POST /api/admin/approve-request", () => {
  beforeEach(() => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: { email: "a@b.com", catalogue: { title: "X", pdf_url: "https://x" } },
      error: null,
    });
  });

  it("approves the request and returns success", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/admin/approve-request").send({ id: "r1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe("POST /api/admin/deny-request", () => {
  it("denies the request and returns success", async () => {
    accessRequestsBuilder = createMockQueryBuilder({ data: null, error: null });
    const app = await buildApp();
    const res = await request(app).post("/api/admin/deny-request").send({ id: "r1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
