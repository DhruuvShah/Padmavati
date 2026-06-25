/** Parses a single CSV line, honoring quoted fields and escaped (doubled) quotes. */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (line[i] === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

/** Builds an RFC-4180-ish CSV string (quotes every field, doubles embedded quotes). */
export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/** Case-insensitive, partial-match column lookup (e.g. "rate type" matches "Rate Type"). */
export function findColumnIndex(headers: string[], name: string): number {
  return headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));
}

export interface ImportedProductRow {
  name: string;
  categoryName: string | null;
  weightKg: number | null;
  heightInches: string | null;
  lengthInches: string | null;
  rateType: "per_kg" | "per_piece";
  directRate: number | null;
}

/**
 * Maps one CSV data row to product fields using flexible column-name matching.
 * Returns null when the row has no product name (nothing to import).
 * Does not touch the network — category creation/lookup stays the caller's job.
 */
export function mapCsvRowToProduct(headers: string[], row: string[]): ImportedProductRow | null {
  const nameIdx = findColumnIndex(headers, "name");
  const name = nameIdx !== -1 ? row[nameIdx]?.trim() : undefined;
  if (!name) return null;

  const catIdx = findColumnIndex(headers, "category");
  const weightIdx = findColumnIndex(headers, "weight");
  const heightIdx = findColumnIndex(headers, "height");
  const lengthIdx = findColumnIndex(headers, "length");
  const rateTypeIdx = findColumnIndex(headers, "rate type");
  const directRateIdx = findColumnIndex(headers, "direct rate");

  const rateType = rateTypeIdx !== -1 ? (row[rateTypeIdx]?.trim() as ImportedProductRow["rateType"]) || "per_piece" : "per_piece";

  return {
    name,
    categoryName: catIdx !== -1 ? row[catIdx]?.trim() || null : null,
    weightKg: weightIdx !== -1 ? parseFloat(row[weightIdx]) || null : null,
    heightInches: heightIdx !== -1 ? row[heightIdx]?.trim() || null : null,
    lengthInches: lengthIdx !== -1 ? row[lengthIdx]?.trim() || null : null,
    rateType,
    directRate: directRateIdx !== -1 ? parseFloat(row[directRateIdx]) || null : null,
  };
}
