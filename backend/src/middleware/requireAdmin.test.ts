import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import { requireAdmin, type AuthedRequest } from "./requireAdmin";

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));
const { mockCreateServerClient } = vi.hoisted(() => ({ mockCreateServerClient: vi.fn() }));

vi.mock("../lib/supabase", () => ({
  supabase: { auth: { getUser: mockGetUser } },
  supabaseUrl: "http://localhost:54321",
  supabaseAnonKey: "test-anon-key",
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
  parseCookieHeader: (header: string) =>
    header
      .split(";")
      .filter(Boolean)
      .map((pair) => {
        const [name, value] = pair.trim().split("=");
        return { name, value };
      }),
}));

function mockReqRes(overrides: Partial<AuthedRequest> = {}) {
  const req = { headers: {}, signedCookies: {}, ...overrides } as AuthedRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe("requireAdmin", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateServerClient.mockReset();
  });

  it("calls next() and attaches the token when the Bearer token is valid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const { req, res, next } = mockReqRes({ headers: { authorization: "Bearer good-token" } });

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.supabaseToken).toBe("good-token");
    expect(req.user).toEqual({ id: "u1", email: undefined });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("falls back to cookie auth when the Bearer token is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "session-token" } } }),
      },
    });
    const { req, res, next } = mockReqRes({ headers: { authorization: "Bearer bad-token" } });

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.supabaseToken).toBe("session-token");
  });

  it("returns 401 when there's no Bearer token and no valid cookie session", async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "no session" } }),
        getSession: vi.fn(),
      },
    });
    const { req, res, next } = mockReqRes();

    await requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 401 if an unexpected error is thrown", async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error("boom");
    });
    const { req, res, next } = mockReqRes();

    await requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
