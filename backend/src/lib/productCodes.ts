import * as bwipjs from "bwip-js/node";
import { toBuffer as qrToBuffer } from "qrcode";

/**
 * Renders a scannable Code128 barcode PNG encoding the product's SKU.
 * scale/height are deliberately high — these get printed on physical labels
 * and downloaded directly, so they need to hold up at print resolution, not
 * just look fine as a small on-screen thumbnail.
 */
export async function generateBarcodePng(sku: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: sku,
    scale: 6,
    height: 16,
    includetext: true,
    textxalign: "center",
    // bwip-js leaves unset background pixels fully transparent (alpha 0),
    // not white -- so the gaps between bars silently merge into whatever
    // is behind the image (a dark theme, a blurred panel, a printer
    // flattening transparency) and kill the black/white contrast a barcode
    // scanner depends on. Force an explicit opaque white background plus a
    // real quiet zone -- a standard, scanner-reliable production barcode.
    backgroundcolor: "FFFFFF",
    paddingwidth: 20,
    paddingheight: 10,
  });
}

/** Renders a QR code PNG that opens straight to the product's admin page when scanned. */
export async function generateQrPng(productUrl: string): Promise<Buffer> {
  return qrToBuffer(productUrl, { type: "png", margin: 2, width: 800, errorCorrectionLevel: "H" });
}

/** Builds the URL a scanned QR code should open. */
export function buildProductUrl(frontendOrigin: string, productId: string): string {
  return `${frontendOrigin.replace(/\/$/, "")}/admin/products/${productId}/edit`;
}
