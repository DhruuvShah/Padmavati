import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createMockQueryBuilder } from "../test-utils/mockSupabase";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn((val: string) => Promise.resolve(`hashed:${val}`)),
    compare: vi.fn((val: string, hash: string) => Promise.resolve(hash === `hashed:${val}`)),
  },
}));

let cataloguesBuilder = createMockQueryBuilder<any>({ data: null, error: null });
let accessRequestsBuilder = createMockQueryBuilder<any>({ data: null, error: null });

vi.mock("../lib/supabase", () => ({
  adminSupabase: {
    from: (table: string) => {
      if (table === "catalogues") return cataloguesBuilder;
      if (table === "access_requests") return accessRequestsBuilder;
      throw new Error(`Unexpected table in test: ${table}`);
    },
  },
}));

async function buildApp() {
  const { catalogueAccessRouter } = await import("./catalogue-access.routes");
  const app = express();
  app.use(express.json());
  app.use(cookieParser("test-cookie-secret"));
  app.use(catalogueAccessRouter);
  return app;
}

describe("GET /api/catalogue/status", () => {
  beforeEach(() => {
    cataloguesBuilder = createMockQueryBuilder({ data: null, error: null });
    accessRequestsBuilder = createMockQueryBuilder({ data: null, error: null });
  });

  it("returns 400 when uuid is missing", async () => {
    const app = await buildApp();
    const res = await request(app).get("/api/catalogue/status");
    expect(res.status).toBe(400);
  });

  it("returns 404 when the catalogue doesn't exist", async () => {
    cataloguesBuilder = createMockQueryBuilder({ data: null, error: { message: "not found" } });
    const app = await buildApp();
    const res = await request(app).get("/api/catalogue/status?uuid=does-not-exist");
    expect(res.status).toBe(404);
  });

  it("returns 'initial' state when no access request cookie exists yet", async () => {
    cataloguesBuilder = createMockQueryBuilder({ data: { title: "My Catalogue" }, error: null });
    const app = await buildApp();
    const res = await request(app).get("/api/catalogue/status?uuid=abc");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ state: "initial", catalogue: { title: "My Catalogue" } });
  });
});

describe("OTP request → verify flow", () => {
  const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 1000).toISOString();

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0); // deterministic OTP: "100000"
    cataloguesBuilder = createMockQueryBuilder({ data: { id: "cat1" }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 from /request when the catalogue doesn't exist", async () => {
    cataloguesBuilder = createMockQueryBuilder({ data: null, error: null });
    const app = await buildApp();
    const res = await request(app)
      .post("/api/catalogue/request")
      .send({ uuid: "missing", name: "A", mobile: "1", email: "a@b.com" });
    expect(res.status).toBe(404);
  });

  it("creates an access request and sets a signed session cookie", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: { id: "req1", email: "test@example.com" },
      error: null,
    });
    const app = await buildApp();
    const res = await request(app)
      .post("/api/catalogue/request")
      .send({ uuid: "abc", name: "Test User", mobile: "9999999999", email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/cat_req_abc=/);
  });

  it("verifies the OTP using the cookie set by /request, end to end", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: {
        id: "req1",
        email: "test@example.com",
        otp_code_hash: "hashed:100000",
        otp_expires_at: futureDate,
      },
      error: null,
    });
    const app = await buildApp();
    const agent = request.agent(app);

    await agent.post("/api/catalogue/request").send({ uuid: "abc", name: "T", mobile: "1", email: "test@example.com" });
    const verifyRes = await agent.post("/api/catalogue/verify").send({ uuid: "abc", otp: "100000" });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
  });

  it("rejects an incorrect OTP", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: { id: "req1", otp_code_hash: "hashed:100000", otp_expires_at: futureDate },
      error: null,
    });
    const app = await buildApp();
    const agent = request.agent(app);

    await agent.post("/api/catalogue/request").send({ uuid: "abc", name: "T", mobile: "1", email: "e@x.com" });
    const verifyRes = await agent.post("/api/catalogue/verify").send({ uuid: "abc", otp: "999999" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error).toMatch(/invalid otp/i);
  });

  it("rejects an expired OTP", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: { id: "req1", otp_code_hash: "hashed:100000", otp_expires_at: pastDate },
      error: null,
    });
    const app = await buildApp();
    const agent = request.agent(app);

    await agent.post("/api/catalogue/request").send({ uuid: "abc", name: "T", mobile: "1", email: "e@x.com" });
    const verifyRes = await agent.post("/api/catalogue/verify").send({ uuid: "abc", otp: "100000" });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error).toMatch(/expired/i);
  });

  it("returns 400 from /verify when there's no session cookie at all", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/catalogue/verify").send({ uuid: "abc", otp: "100000" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no request session/i);
  });
});

describe("POST /api/catalogue/resend-otp", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when there's no existing session", async () => {
    const app = await buildApp();
    const res = await request(app).post("/api/catalogue/resend-otp").send({ uuid: "abc" });
    expect(res.status).toBe(400);
  });

  it("issues a new OTP for an existing session", async () => {
    accessRequestsBuilder = createMockQueryBuilder({
      data: { id: "req1", email: "test@example.com" },
      error: null,
    });
    cataloguesBuilder = createMockQueryBuilder({ data: { id: "cat1" }, error: null });

    const app = await buildApp();
    const agent = request.agent(app);
    await agent.post("/api/catalogue/request").send({ uuid: "abc", name: "T", mobile: "1", email: "test@example.com" });
    const res = await agent.post("/api/catalogue/resend-otp").send({ uuid: "abc" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
