import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { healthRouter } from "./health.routes";

function buildApp() {
  const app = express();
  app.use(healthRouter);
  return app;
}

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(buildApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
