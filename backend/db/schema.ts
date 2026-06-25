import { pgTable, uuid, text, numeric, timestamp, jsonb, boolean, pgEnum, primaryKey, integer, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin"]);
export const rateTypeEnum = pgEnum("rate_type", ["per_kg", "per_piece"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "denied"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // refers to auth.users in Supabase
  email: text("email").notNull(),
  role: roleEnum("role").default("admin").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  tags: text("tags").array(),
  // SKU prefix for this category's products (e.g. "GAN"). Auto-derived from
  // the name on insert if left blank — see the assign_category_sku_prefix
  // trigger — but admin-editable afterward.
  skuPrefix: text("sku_prefix").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Race-safe per-prefix counter backing auto-generated product SKUs.
// Incremented atomically via INSERT ... ON CONFLICT DO UPDATE in the
// assign_product_sku trigger, so concurrent inserts can't hand out the
// same number twice.
export const skuSequences = pgTable("sku_sequences", {
  prefix: text("prefix").primaryKey(),
  lastNumber: integer("last_number").default(0).notNull(),
});

export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  codeName: text("code_name").notNull().unique(),
  actualName: text("actual_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rateCodes = pgTable("rate_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  rateType: rateTypeEnum("rate_type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Permanent, auto-generated on insert via the assign_product_sku trigger
  // (category prefix + race-safe sequence number). Admin can override it
  // manually afterward; the trigger only fills it in when null.
  sku: text("sku").unique(),
  // Code128 barcode and QR code PNGs, rendered from the sku and stored in
  // Supabase Storage once it's assigned (see /api/admin/generate-product-codes).
  barcodeUrl: text("barcode_url"),
  qrCodeUrl: text("qr_code_url"),
  categoryId: uuid("category_id").notNull().references(() => categories.id),
  partyId: uuid("party_id").references(() => parties.id),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }),
  rateType: rateTypeEnum("rate_type").notNull(),
  rateCodeId: uuid("rate_code_id").references(() => rateCodes.id),
  directRate: numeric("direct_rate", { precision: 10, scale: 2 }),
  heightInches: numeric("height_inches"),
  lengthInches: numeric("length_inches"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check("rate_check", sql`(${t.rateCodeId} IS NOT NULL AND ${t.directRate} IS NULL) OR (${t.rateCodeId} IS NULL AND ${t.directRate} IS NOT NULL)`)
]);

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }),
  rateCodeId: uuid("rate_code_id").references(() => rateCodes.id),
  directRate: numeric("direct_rate", { precision: 10, scale: 2 }),
  heightInches: numeric("height_inches"),
  lengthInches: numeric("length_inches"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const catalogues = pgTable("catalogues", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  shareUuid: uuid("share_uuid").notNull().unique().defaultRandom(),
  pdfUrl: text("pdf_url"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const catalogueProducts = pgTable("catalogue_products", {
  catalogueId: uuid("catalogue_id").notNull().references(() => catalogues.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
}, (t) => [
  primaryKey({ columns: [t.catalogueId, t.productId] })
]);

export const accessRequests = pgTable("access_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  catalogueId: uuid("catalogue_id").notNull().references(() => catalogues.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mobile: text("mobile"),
  email: text("email").notNull(),
  otpCodeHash: text("otp_code_hash"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  status: requestStatusEnum("status").default("pending").notNull(),
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
