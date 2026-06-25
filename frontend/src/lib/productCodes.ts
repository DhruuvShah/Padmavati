import { supabase } from "@/lib/supabase";

/**
 * Asks the backend to render a barcode + QR code for a product's SKU and
 * save them. Called right after a product is created or edited — the
 * frontend's stand-in for "auto-triggered the instant a SKU is assigned",
 * since the SKU itself is assigned by a DB trigger that can't render images.
 */
export async function generateProductCodes(productId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/admin/generate-product-codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate barcode/QR code");
  }
}
