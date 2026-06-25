import * as bwipjs from "bwip-js/node";
import { toBuffer as qrToBuffer } from "qrcode";

/** Renders a scannable Code128 barcode PNG encoding the product's SKU. */
export async function generateBarcodePng(sku: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: sku,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: "center",
  });
}

/** Renders a QR code PNG that opens straight to the product's admin page when scanned. */
export async function generateQrPng(productUrl: string): Promise<Buffer> {
  return qrToBuffer(productUrl, { type: "png", margin: 1, width: 300 });
}

/** Builds the URL a scanned QR code should open. */
export function buildProductUrl(frontendOrigin: string, productId: string): string {
  return `${frontendOrigin.replace(/\/$/, "")}/admin/products/${productId}/edit`;
}
