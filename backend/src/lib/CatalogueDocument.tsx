import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import {
  type CatalogueProduct,
  formatRate,
  getCategoryName,
  getWeightText,
  getDimensionsText,
} from "./catalogueTemplate";

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 9, color: "#111111" },
  header: { textAlign: "center", marginBottom: 18 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eaeaea",
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  imageBox: { height: 140, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  image: { maxWidth: 140, maxHeight: 140, objectFit: "contain" },
  noImage: { color: "#aaaaaa", fontSize: 8 },
  name: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sku: { fontSize: 7, color: "#999999", fontFamily: "Courier", marginBottom: 4 },
  metaLine: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rateBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#eeeeee",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  variantsTable: { marginTop: 8, fontSize: 7 },
  variantsHeaderRow: { flexDirection: "row", backgroundColor: "#fafafa" },
  variantsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#eeeeee",
  },
  variantsCell: { flex: 1, padding: 3 },
  codesRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: "#eeeeee",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  barcodeImage: { height: 24, flex: 1, objectFit: "contain" },
  qrImage: { height: 36, width: 36, objectFit: "contain" },
});

function ProductVariantsTable({ product }: { product: CatalogueProduct }) {
  if (!product.variants || product.variants.length === 0) return null;

  return (
    <View style={styles.variantsTable}>
      <View style={styles.variantsHeaderRow}>
        <Text style={styles.variantsCell}>Weight</Text>
        <Text style={styles.variantsCell}>Dimensions</Text>
        <Text style={styles.variantsCell}>Rate</Text>
      </View>
      {product.variants.map((v, i) => (
        <View key={i} style={styles.variantsRow}>
          <Text style={styles.variantsCell}>{v.weight_kg ? `${v.weight_kg}kg` : "-"}</Text>
          <Text style={styles.variantsCell}>
            {v.height_inches || v.length_inches ? `H:${v.height_inches || "-"}xL:${v.length_inches || "-"}` : "-"}
          </Text>
          <Text style={styles.variantsCell}>{formatRate(product.rate_type, v.direct_rate, v.rate_code)}</Text>
        </View>
      ))}
    </View>
  );
}

function ProductCard({ product }: { product: CatalogueProduct }) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.imageBox}>
        {product.image_url ? (
          <Image style={styles.image} src={product.image_url} />
        ) : (
          <Text style={styles.noImage}>No Image</Text>
        )}
      </View>
      <Text style={styles.name}>{product.name}</Text>
      {product.sku && <Text style={styles.sku}>{product.sku}</Text>}
      <View style={styles.metaLine}>
        <Text>Category</Text>
        <Text>{getCategoryName(product)}</Text>
      </View>
      <View style={styles.metaLine}>
        <Text>Weight</Text>
        <Text>{getWeightText(product)}</Text>
      </View>
      <View style={styles.metaLine}>
        <Text>Dimensions</Text>
        <Text>{getDimensionsText(product)}</Text>
      </View>
      <View style={styles.rateBox}>
        <Text>Rate ({product.rate_type === "per_kg" ? "Per Kg" : "Per Piece"})</Text>
        <Text>{formatRate(product.rate_type, product.direct_rate, product.rate_code)}</Text>
      </View>
      <ProductVariantsTable product={product} />
      {(product.barcode_url || product.qr_code_url) && (
        <View style={styles.codesRow}>
          {product.barcode_url && <Image style={styles.barcodeImage} src={product.barcode_url} />}
          {product.qr_code_url && <Image style={styles.qrImage} src={product.qr_code_url} />}
        </View>
      )}
    </View>
  );
}

export function CatalogueDocument({ title, products }: { title: string; products: CatalogueProduct[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </View>
      </Page>
    </Document>
  );
}

/** Renders the catalogue straight to a PDF buffer — no headless browser involved. */
export async function renderCataloguePdf(title: string, products: CatalogueProduct[]): Promise<Buffer> {
  return renderToBuffer(<CatalogueDocument title={title} products={products} />);
}
