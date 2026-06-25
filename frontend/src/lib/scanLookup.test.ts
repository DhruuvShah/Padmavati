import { describe, it, expect } from "vitest";
import { parseScannedText } from "./scanLookup";

describe("parseScannedText", () => {
  it("extracts the admin edit path from a full QR-encoded URL", () => {
    expect(parseScannedText("http://localhost:3000/admin/products/abc-123/edit")).toEqual({
      kind: "path",
      path: "/admin/products/abc-123/edit",
    });
  });

  it("extracts the path regardless of domain/port (scanned on a different deployment)", () => {
    expect(parseScannedText("https://padmavati-corp.vercel.app/admin/products/uuid-here/edit")).toEqual({
      kind: "path",
      path: "/admin/products/uuid-here/edit",
    });
  });

  it("trims surrounding whitespace from the decoded text", () => {
    expect(parseScannedText("  GAN-001  ")).toEqual({ kind: "sku", sku: "GAN-001" });
  });

  it("recognizes a plain SKU string", () => {
    expect(parseScannedText("GAN-001")).toEqual({ kind: "sku", sku: "GAN-001" });
  });

  it("recognizes a SKU with a category-number suffix prefix (e.g. GAN2)", () => {
    expect(parseScannedText("GAN2-042")).toEqual({ kind: "sku", sku: "GAN2-042" });
  });

  it("recognizes a SKU with 4+ digit numbers (the lpad-overflow fix case)", () => {
    expect(parseScannedText("ZZT-1000")).toEqual({ kind: "sku", sku: "ZZT-1000" });
  });

  it("returns unknown for unrelated text", () => {
    expect(parseScannedText("not a real code")).toEqual({ kind: "unknown" });
  });

  it("returns unknown for an empty string", () => {
    expect(parseScannedText("")).toEqual({ kind: "unknown" });
  });

  it("returns unknown for a URL that isn't a product edit page", () => {
    expect(parseScannedText("https://example.com/some/other/page")).toEqual({ kind: "unknown" });
  });
});
