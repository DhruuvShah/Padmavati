import { describe, it, expect } from "vitest";
import { buildCatalogueHtml, sortProductsByRequestedOrder, type CatalogueProduct } from "./catalogueTemplate";

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

describe("buildCatalogueHtml", () => {
  const baseProduct: CatalogueProduct = {
    id: "1",
    name: "Ganesh Idol",
    image_url: "https://example.com/ganesh.jpg",
    weight_kg: 2.5,
    height_inches: "10",
    length_inches: "6",
    rate_type: "per_kg",
    direct_rate: 1500,
    category: { name: "Ganpati" },
  };

  it("includes the catalogue title", () => {
    const html = buildCatalogueHtml("Festival Collection 2026", [baseProduct]);
    expect(html).toContain("Festival Collection 2026");
  });

  it("renders product name, category, weight and dimensions", () => {
    const html = buildCatalogueHtml("Title", [baseProduct]);
    expect(html).toContain("Ganesh Idol");
    expect(html).toContain("Ganpati");
    expect(html).toContain("2.5 kg");
    expect(html).toContain("H: 10 × L: 6");
  });

  it("prefers direct_rate over rate_code when both could apply", () => {
    const html = buildCatalogueHtml("Title", [
      { ...baseProduct, direct_rate: 999, rate_code: { code: "SS1", value: 1200 } },
    ]);
    expect(html).toContain("₹999/kg");
    expect(html).not.toContain("SS1");
  });

  it("falls back to rate_code when direct_rate is absent", () => {
    const html = buildCatalogueHtml("Title", [
      { ...baseProduct, direct_rate: null, rate_code: { code: "SS1", value: 1200 } },
    ]);
    expect(html).toContain("SS1 → ₹1200/kg");
  });

  it("shows a placeholder when a product has no image", () => {
    const html = buildCatalogueHtml("Title", [{ ...baseProduct, image_url: null }]);
    expect(html).toContain("No Image");
  });

  it("falls back to 'Uncategorized' when category is missing", () => {
    const html = buildCatalogueHtml("Title", [{ ...baseProduct, category: null }]);
    expect(html).toContain("Uncategorized");
  });

  it("renders a variants table only when variants exist", () => {
    // Note: the <style> block always contains the literal text "variants-table"
    // in its CSS selectors, so we assert on the actual markup, not a bare substring.
    const withoutVariants = buildCatalogueHtml("Title", [{ ...baseProduct, variants: [] }]);
    expect(withoutVariants).not.toContain('<table class="variants-table">');

    const withVariants = buildCatalogueHtml("Title", [
      {
        ...baseProduct,
        variants: [{ weight_kg: 1, direct_rate: 700, height_inches: "8", length_inches: "5" }],
      },
    ]);
    expect(withVariants).toContain('<table class="variants-table">');
    expect(withVariants).toContain("₹700/kg");
  });

  it("renders one product-card per product, preserving array order", () => {
    const html = buildCatalogueHtml("Title", [
      { ...baseProduct, id: "1", name: "First" },
      { ...baseProduct, id: "2", name: "Second" },
    ]);
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html.match(/product-card/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
