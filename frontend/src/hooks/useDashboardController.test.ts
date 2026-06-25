import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const { mockGetCounts, mockGetRecentProducts } = vi.hoisted(() => ({
  mockGetCounts: vi.fn(),
  mockGetRecentProducts: vi.fn(),
}));

vi.mock("@/services/dashboard.service", () => ({
  DashboardService: {
    getCounts: mockGetCounts,
    getRecentProducts: mockGetRecentProducts,
  },
}));

import { useDashboardController } from "./useDashboardController";

describe("useDashboardController", () => {
  beforeEach(() => {
    mockGetCounts.mockReset();
    mockGetRecentProducts.mockReset();
  });

  it("starts in a loading state and resolves with the fetched data", async () => {
    mockGetCounts.mockResolvedValue({ products: 5, categories: 2, catalogues: 1, pendingShares: 0 });
    mockGetRecentProducts.mockResolvedValue([{ id: "1", name: "Ganesh" }]);

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.counts).toEqual({ products: 5, categories: 2, catalogues: 1, pendingShares: 0 });
    expect(result.current.recentProducts).toEqual([{ id: "1", name: "Ganesh" }]);
  });

  it("requests recent products limited to 3", async () => {
    mockGetCounts.mockResolvedValue({ products: 0, categories: 0, catalogues: 0, pendingShares: 0 });
    mockGetRecentProducts.mockResolvedValue([]);

    renderHook(() => useDashboardController());

    await waitFor(() => expect(mockGetRecentProducts).toHaveBeenCalledWith(3));
  });

  it("stops loading and keeps default counts if a fetch fails", async () => {
    mockGetCounts.mockRejectedValue(new Error("network error"));
    mockGetRecentProducts.mockResolvedValue([]);

    const { result } = renderHook(() => useDashboardController());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.counts).toEqual({ products: 0, categories: 0, catalogues: 0, pendingShares: 0 });
  });
});
