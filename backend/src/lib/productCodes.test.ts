import { describe, it, expect } from "vitest";
import { generateBarcodePng, generateQrPng, buildProductUrl } from "./productCodes";

function isPng(buf: Buffer) {
  return buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}

describe("generateBarcodePng", () => {
  it("renders a valid PNG for a SKU", async () => {
    const png = await generateBarcodePng("GAN-001");
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(0);
  });
});

describe("generateQrPng", () => {
  it("renders a valid PNG for a URL", async () => {
    const png = await generateQrPng("http://localhost:3000/admin/products/abc/edit");
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(0);
  });
});

describe("buildProductUrl", () => {
  it("builds the admin edit page URL for a product", () => {
    expect(buildProductUrl("http://localhost:3000", "abc-123")).toBe(
      "http://localhost:3000/admin/products/abc-123/edit"
    );
  });

  it("strips a trailing slash from the origin", () => {
    expect(buildProductUrl("http://localhost:3000/", "abc-123")).toBe(
      "http://localhost:3000/admin/products/abc-123/edit"
    );
  });
});
