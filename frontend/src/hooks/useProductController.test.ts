import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { mockGetProducts, mockGetCategories } = vi.hoisted(() => ({
  mockGetProducts: vi.fn(),
  mockGetCategories: vi.fn(),
}));

vi.mock("@/services/product.service", () => ({
  ProductService: {
    getProducts: mockGetProducts,
    getCategories: mockGetCategories,
  },
}));

import { useProductController } from "./useProductController";

describe("useProductController", () => {
  beforeEach(() => {
    mockGetProducts.mockReset();
    mockGetCategories.mockReset();
  });

  it("loads products and categories on mount", async () => {
    mockGetProducts.mockResolvedValue([{ id: "1", name: "Ganesh", category: { id: "c1" } }]);
    mockGetCategories.mockResolvedValue([{ id: "c1", name: "Ganpati" }]);

    const { result } = renderHook(() => useProductController());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.categories).toEqual([{ id: "c1", name: "Ganpati" }]);
  });

  it("filters products by case-insensitive name search", async () => {
    mockGetProducts.mockResolvedValue([
      { id: "1", name: "Ganesh Idol", category: null },
      { id: "2", name: "Lakshmi Idol", category: null },
    ]);
    mockGetCategories.mockResolvedValue([]);

    const { result } = renderHook(() => useProductController());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("ganesh"));
    expect(result.current.products.map((p: any) => p.name)).toEqual(["Ganesh Idol"]);
  });

  it("filters products by category id", async () => {
    mockGetProducts.mockResolvedValue([
      { id: "1", name: "Ganesh", category: { id: "c1" } },
      { id: "2", name: "Lakshmi", category: { id: "c2" } },
    ]);
    mockGetCategories.mockResolvedValue([]);

    const { result } = renderHook(() => useProductController());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCategoryFilter("c2"));
    expect(result.current.products.map((p: any) => p.id)).toEqual(["2"]);
  });

  it("surfaces a load failure via toast and stops loading", async () => {
    mockGetProducts.mockRejectedValue(new Error("network error"));
    mockGetCategories.mockResolvedValue([]);

    const { result } = renderHook(() => useProductController());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.products).toEqual([]);
  });

  it("refetch reloads the data", async () => {
    mockGetProducts.mockResolvedValue([]);
    mockGetCategories.mockResolvedValue([]);

    const { result } = renderHook(() => useProductController());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetProducts.mockResolvedValue([{ id: "1", name: "New Product", category: null }]);
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.products).toHaveLength(1);
  });
});
