import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { readBarcodes } from "zxing-wasm/reader";
import { generateBarcodePng, generateQrPng, buildProductUrl } from "./productCodes";

// zxing-wasm's bundled PNG decoder doesn't read bwip-js's RGBA output reliably,
// so flatten + grayscale first -- this is exactly what a phone camera's own
// pipeline does before handing frames to its barcode reader, making this the
// closest automatable stand-in for "does this actually scan".
async function toScannableBuffer(png: Buffer): Promise<Uint8Array> {
  const flat = await sharp(png).flatten({ background: "#ffffff" }).grayscale().png().toBuffer();
  return new Uint8Array(flat);
}

describe("barcode/QR scan round-trip", () => {
  it("decodes a generated Code128 barcode back to the exact SKU", async () => {
    const sku = "GAN-001";
    const png = await generateBarcodePng(sku);
    const results = await readBarcodes(await toScannableBuffer(png), { formats: ["Code128"] });
    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
    expect(results[0].text).toBe(sku);
  });

  it("decodes a generated QR code back to the exact product URL", async () => {
    const url = buildProductUrl("http://localhost:3000", "714a6250-0cc2-4b28-987a-309a8a9514ae");
    const png = await generateQrPng(url);
    const results = await readBarcodes(await toScannableBuffer(png), { formats: ["QRCode"] });
    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
    expect(results[0].text).toBe(url);
  });

  it("round-trips SKUs containing only the characters our generator produces", async () => {
    for (const sku of ["GEN-001", "GAN2-999", "ZZT-1000"]) {
      const png = await generateBarcodePng(sku);
      const results = await readBarcodes(await toScannableBuffer(png), { formats: ["Code128"] });
      expect(results[0]?.text).toBe(sku);
    }
  });
});
