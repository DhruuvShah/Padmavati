import { describe, it, expect } from "vitest";
import {
  sortProductsByRequestedOrder,
  formatRate,
  getCategoryName,
  getWeightText,
  getDimensionsText,
  type CatalogueProduct,
} from "./catalogueTemplate";

describe("sortProductsByRequestedOrder", () => {
  it("reorders products to match the requested id order, not DB order", () => {
    const products = [{ id: "b" }, { id: "a" }, { id: "c" }];
    const result = sortProductsByRequestedOrder(["c", "a", "b"], products);
    expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  it("drops ids that have no matching product instead of throwing", () => {
    const products = [{ id: "a" }];
    const result = sortProductsByRequestedOrder(["a", "missing"], products);
    expect(result).toEqual([{ id: "a" }]);
  });

  it("returns an empty array when no ids match", () => {
    expect(sortProductsByRequestedOrder(["x"], [{ id: "a" }])).toEqual([]);
  });
});

describe("formatRate", () => {
  it("prefers direct_rate over rate_code when both could apply", () => {
    expect(formatRate("per_kg", 999, { code: "SS1", value: 1200 })).toBe("₹999/kg");
  });

  it("falls back to rate_code when direct_rate is absent", () => {
    expect(formatRate("per_kg", null, { code: "SS1", value: 1200 })).toBe("SS1 → ₹1200/kg");
  });

  it("returns a dash when neither direct_rate nor rate_code is set", () => {
    expect(formatRate("per_piece", null, null)).toBe("-");
  });

  it("uses the 'piece' unit for per_piece products", () => {
    expect(formatRate("per_piece", 500, null)).toBe("₹500/piece");
  });
});

describe("getCategoryName", () => {
  const base: CatalogueProduct = { id: "1", name: "Ganesh", rate_type: "per_kg" };

  it("returns the category name when present", () => {
    expect(getCategoryName({ ...base, category: { name: "Ganpati" } })).toBe("Ganpati");
  });

  it("falls back to 'Uncategorized' when category is missing", () => {
    expect(getCategoryName({ ...base, category: null })).toBe("Uncategorized");
  });
});

describe("getWeightText", () => {
  const base: CatalogueProduct = { id: "1", name: "Ganesh", rate_type: "per_kg" };

  it("formats a present weight in kg", () => {
    expect(getWeightText({ ...base, weight_kg: 2.5 })).toBe("2.5 kg");
  });

  it("returns a dash when weight is missing", () => {
    expect(getWeightText({ ...base, weight_kg: null })).toBe("-");
  });
});

describe("getDimensionsText", () => {
  const base: CatalogueProduct = { id: "1", name: "Ganesh", rate_type: "per_kg" };

  it("formats height and length when present", () => {
    expect(getDimensionsText({ ...base, height_inches: "10", length_inches: "6" })).toBe("H: 10 × L: 6");
  });

  it("fills in a dash for whichever dimension is missing", () => {
    expect(getDimensionsText({ ...base, height_inches: "10", length_inches: null })).toBe("H: 10 × L: -");
  });

  it("returns a dash when both dimensions are missing", () => {
    expect(getDimensionsText({ ...base, height_inches: null, length_inches: null })).toBe("-");
  });
});
