import { describe, it, expect } from "vitest";
import { getProductPrice, getProductWeightGrams, computeRangeCeiling } from "./pricing";

describe("getProductPrice", () => {
  it("prefers direct_rate over a linked rate_code", () => {
    expect(getProductPrice({ direct_rate: 1500, rate_code: { value: 999 } })).toBe(1500);
  });

  it("falls back to rate_code.value when there's no direct_rate", () => {
    expect(getProductPrice({ direct_rate: null, rate_code: { value: 1200 } })).toBe(1200);
  });

  it("returns 0 when neither is set", () => {
    expect(getProductPrice({})).toBe(0);
  });

  it("coerces string values to numbers", () => {
    expect(getProductPrice({ direct_rate: "2550.50" })).toBe(2550.5);
  });
});

describe("getProductWeightGrams", () => {
  it("converts kg to grams", () => {
    expect(getProductWeightGrams({ weight_kg: 12.5 })).toBe(12500);
  });

  it("returns 0 when weight is missing", () => {
    expect(getProductWeightGrams({})).toBe(0);
    expect(getProductWeightGrams({ weight_kg: null })).toBe(0);
  });

  it("handles string weights from the database", () => {
    expect(getProductWeightGrams({ weight_kg: "2.5" })).toBe(2500);
  });
});

describe("computeRangeCeiling", () => {
  it("keeps the default ceiling when no value exceeds it", () => {
    expect(computeRangeCeiling([100, 5000], 10000)).toBe(10000);
  });

  it("expands to cover a value that exceeds the default — the create-catalogue bug fix", () => {
    // Regression test: a 12.5kg (12500g) product must not be silently
    // excluded by a default 10,000g weight-range ceiling.
    expect(computeRangeCeiling([12500], 10000)).toBe(12500);
  });

  it("falls back to the default when there are no values at all", () => {
    expect(computeRangeCeiling([], 10000)).toBe(10000);
  });
});
