export interface CatalogueProductVariant {
  weight_kg?: string | number | null;
  direct_rate?: string | number | null;
  height_inches?: string | number | null;
  length_inches?: string | number | null;
  rate_code?: { code: string; value: string | number } | null;
}

export interface CatalogueProduct {
  id: string;
  name: string;
  image_url?: string | null;
  weight_kg?: string | number | null;
  height_inches?: string | number | null;
  length_inches?: string | number | null;
  rate_type: "per_kg" | "per_piece";
  direct_rate?: string | number | null;
  category?: { name: string } | null;
  rate_code?: { code: string; value: string | number } | null;
  variants?: CatalogueProductVariant[] | null;
}

/** Preserves the caller's requested ordering rather than the DB's natural order. */
export function sortProductsByRequestedOrder<T extends { id: string }>(
  productIds: string[],
  products: T[]
): T[] {
  return productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is T => p != null);
}

function formatRate(rateType: "per_kg" | "per_piece", directRate?: string | number | null, rateCode?: { code: string; value: string | number } | null): string {
  const unit = rateType === "per_kg" ? "kg" : "piece";
  if (directRate) return `₹${directRate}/${unit}`;
  if (rateCode) return `${rateCode.code} → ₹${rateCode.value}/${unit}`;
  return "-";
}

function buildVariantsTable(product: CatalogueProduct): string {
  if (!product.variants || product.variants.length === 0) return "";

  const rows = product.variants
    .map((v) => {
      const vRateText = v.direct_rate
        ? `₹${v.direct_rate}/${product.rate_type === "per_kg" ? "kg" : "piece"}`
        : v.rate_code
        ? `${v.rate_code.code} → ₹${v.rate_code.value}/${product.rate_type === "per_kg" ? "kg" : "piece"}`
        : "-";
      const vDims = v.height_inches || v.length_inches
        ? `H:${v.height_inches || "-"}×L:${v.length_inches || "-"}`
        : "-";
      return `<tr><td>${v.weight_kg ? `${v.weight_kg}kg` : "-"}</td><td>${vDims}</td><td>${vRateText}</td></tr>`;
    })
    .join("");

  return `
    <table class="variants-table">
      <tr><th>Weight</th><th>Dimensions</th><th>Rate</th></tr>
      ${rows}
    </table>
  `;
}

function buildProductCard(product: CatalogueProduct): string {
  const category = product.category ? product.category.name : "Uncategorized";
  const weight = product.weight_kg ? `${product.weight_kg} kg` : "-";
  const dims = product.height_inches || product.length_inches
    ? `H: ${product.height_inches || "-"} × L: ${product.length_inches || "-"}`
    : "-";
  const rateText = formatRate(product.rate_type, product.direct_rate, product.rate_code);

  return `
    <div class="product-card">
      <div class="image-container">
        ${product.image_url ? `<img src="${product.image_url}" />` : `<div style="color:#aaa; font-size:9pt;">No Image</div>`}
      </div>
      <div class="product-name">${product.name}</div>
      <div class="meta-line"><span>Category</span> <span>${category}</span></div>
      <div class="meta-line"><span>Weight</span> <span>${weight}</span></div>
      <div class="meta-line"><span>Dimensions</span> <span>${dims}</span></div>
      <div class="rate-box">
        <span>Rate (${product.rate_type === "per_kg" ? "Per Kg" : "Per Piece"})</span>
        <span>${rateText}</span>
      </div>
      ${buildVariantsTable(product)}
    </div>
  `;
}

export function buildCatalogueHtml(title: string, products: CatalogueProduct[]): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: #fff;
          color: #111;
          padding: 20mm;
          letter-spacing: normal !important;
        }
        .header {
          text-align: center;
          margin-bottom: 30pt;
        }
        .title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: normal !important;
          color: #000;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22pt;
        }
        .product-card {
          width: calc(50% - 15pt);
          box-sizing: border-box;
          border: 1px solid #eaeaea;
          border-radius: 6pt;
          padding: 15pt;
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-column-break-inside: avoid;
          letter-spacing: normal !important;
        }
        .image-container {
          width: 100%;
          height: 210pt;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 15pt;
        }
        .image-container img {
          max-width: 210pt;
          max-height: 210pt;
          object-fit: contain;
        }
        .product-name {
          font-family: 'Playfair Display', serif;
          font-size: 14pt;
          font-weight: 700;
          margin-bottom: 6pt;
          line-height: 1.2;
          letter-spacing: normal !important;
        }
        .meta-line {
          font-size: 9pt;
          color: #666;
          margin-bottom: 3pt;
          display: flex;
          justify-content: space-between;
          letter-spacing: normal !important;
        }
        .rate-box {
          margin-top: 9pt;
          padding-top: 9pt;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
          font-weight: 600;
          color: #000;
          letter-spacing: normal !important;
        }
        .variants-table tr { break-inside: avoid; page-break-inside: avoid; }
        .variants-table {
          width: 100%;
          margin-top: 12pt;
          border-collapse: collapse;
          font-size: 8pt;
        }
        .variants-table th, .variants-table td {
          border: 1px solid #eee;
          padding: 5pt;
          text-align: left;
          color: #444;
          letter-spacing: normal !important;
        }
        .variants-table th {
          background: #fafafa;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${title}</div>
      </div>
      <div class="grid">
        ${products.map(buildProductCard).join("")}
      </div>
    </body>
    </html>
  `;
}
