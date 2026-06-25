/**
 * QR codes encode a full URL to a product's admin edit page; Code128
 * barcodes encode just the SKU. This figures out which one we got and what
 * to do with it, kept pure (no camera/network) so it's unit-testable.
 */
export type ScanTarget =
  | { kind: "path"; path: string }
  | { kind: "sku"; sku: string }
  | { kind: "unknown" };

const PRODUCT_EDIT_PATH = /\/admin\/products\/[^/]+\/edit/;
const SKU_PATTERN = /^[A-Za-z0-9]+-[0-9]+$/;

export function parseScannedText(rawText: string): ScanTarget {
  const text = rawText.trim();

  const pathMatch = text.match(PRODUCT_EDIT_PATH);
  if (pathMatch) {
    return { kind: "path", path: pathMatch[0] };
  }

  if (SKU_PATTERN.test(text)) {
    return { kind: "sku", sku: text };
  }

  return { kind: "unknown" };
}
