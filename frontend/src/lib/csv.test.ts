import { describe, it, expect } from "vitest";
import { parseCSVLine, buildCsv, findColumnIndex, mapCsvRowToProduct } from "./csv";

describe("parseCSVLine", () => {
  it("splits a simple comma-separated line", () => {
    expect(parseCSVLine("Ganesh,Brass,2.5")).toEqual(["Ganesh", "Brass", "2.5"]);
  });

  it("keeps commas inside quoted fields intact", () => {
    expect(parseCSVLine('"Ganesh, Large",Brass,2.5')).toEqual(["Ganesh, Large", "Brass", "2.5"]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCSVLine('"He said ""hi""",Brass')).toEqual(['He said "hi"', "Brass"]);
  });

  it("trims surrounding whitespace from each field", () => {
    expect(parseCSVLine(" Ganesh , Brass ")).toEqual(["Ganesh", "Brass"]);
  });
});

describe("buildCsv", () => {
  it("quotes every field and joins rows with newlines", () => {
    const csv = buildCsv(["Name", "Rate"], [["Ganesh", 1500]]);
    expect(csv).toBe('"Name","Rate"\n"Ganesh","1500"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = buildCsv(["Name"], [['He said "hi"']]);
    expect(csv).toContain('"He said ""hi"""');
  });

  it("renders null/undefined cells as empty strings, not the literal word", () => {
    const csv = buildCsv(["Name", "Note"], [["Ganesh", null]]);
    expect(csv).toBe('"Name","Note"\n"Ganesh",""');
  });
});

describe("findColumnIndex", () => {
  it("matches case-insensitively and on partial names", () => {
    expect(findColumnIndex(["Direct Rate (₹)", "Name"], "direct rate")).toBe(0);
  });

  it("returns -1 when there's no match", () => {
    expect(findColumnIndex(["Name"], "weight")).toBe(-1);
  });
});

describe("mapCsvRowToProduct", () => {
  const headers = ["Name", "Category", "Weight (kg)", "Height (in)", "Length (in)", "Rate Type", "Direct Rate (₹)"];

  it("maps a complete row to product fields", () => {
    const row = ["Ganesh", "Ganpati", "2.5", "10", "6", "per_kg", "1500"];
    expect(mapCsvRowToProduct(headers, row)).toEqual({
      name: "Ganesh",
      categoryName: "Ganpati",
      weightKg: 2.5,
      heightInches: "10",
      lengthInches: "6",
      rateType: "per_kg",
      directRate: 1500,
    });
  });

  it("returns null when the name column is blank — the row is skippable", () => {
    const row = ["", "Ganpati", "2.5", "10", "6", "per_kg", "1500"];
    expect(mapCsvRowToProduct(headers, row)).toBeNull();
  });

  it("defaults rate type to per_piece when the column is missing or blank", () => {
    const minimalHeaders = ["Name"];
    expect(mapCsvRowToProduct(minimalHeaders, ["Ganesh"])?.rateType).toBe("per_piece");
  });

  it("leaves optional fields null when their columns are absent", () => {
    const minimalHeaders = ["Name"];
    const mapped = mapCsvRowToProduct(minimalHeaders, ["Ganesh"]);
    expect(mapped).toMatchObject({
      name: "Ganesh",
      categoryName: null,
      weightKg: null,
      directRate: null,
    });
  });
});
