import { describe, it, expect } from "vitest";
import { renderCataloguePdf } from "./CatalogueDocument";
import type { CatalogueProduct } from "./catalogueTemplate";

// image_url/barcode_url/qr_code_url are intentionally omitted in these
// fixtures so renders never attempt a real network fetch — that's covered
// by manual/integration testing. Their absence is exercised implicitly by
// every test below, since baseProduct never sets them.
const baseProduct: CatalogueProduct = {
  id: "1",
  name: "Ganesh Idol",
  weight_kg: 2.5,
  height_inches: "10",
  length_inches: "6",
  rate_type: "per_kg",
  direct_rate: 1500,
  category: { name: "Ganpati" },
};

async function isValidPdf(buf: Buffer) {
  return buf.length > 0 && buf.subarray(0, 5).toString("utf-8") === "%PDF-";
}

describe("renderCataloguePdf", () => {
  it("produces a valid PDF buffer for a single product", async () => {
    const pdf = await renderCataloguePdf("Festival Collection 2026", [baseProduct]);
    expect(await isValidPdf(pdf)).toBe(true);
  });

  it("renders a product with no image without throwing", async () => {
    const pdf = await renderCataloguePdf("Title", [{ ...baseProduct, image_url: null }]);
    expect(await isValidPdf(pdf)).toBe(true);
  });

  it("renders a product with no category without throwing", async () => {
    const pdf = await renderCataloguePdf("Title", [{ ...baseProduct, category: null }]);
    expect(await isValidPdf(pdf)).toBe(true);
  });

  it("renders a product with variants without throwing", async () => {
    const pdf = await renderCataloguePdf("Title", [
      {
        ...baseProduct,
        variants: [{ weight_kg: 1, direct_rate: 700, height_inches: "8", length_inches: "5" }],
      },
    ]);
    expect(await isValidPdf(pdf)).toBe(true);
  });

  it("renders multiple products on the page without throwing", async () => {
    const pdf = await renderCataloguePdf("Title", [
      { ...baseProduct, id: "1", name: "First" },
      { ...baseProduct, id: "2", name: "Second" },
    ]);
    expect(await isValidPdf(pdf)).toBe(true);
  });

  it("renders an empty product list without throwing", async () => {
    const pdf = await renderCataloguePdf("Title", []);
    expect(await isValidPdf(pdf)).toBe(true);
  });
});
