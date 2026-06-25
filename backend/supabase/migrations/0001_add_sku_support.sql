CREATE TABLE "sku_sequences" (
	"prefix" text PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "sku_prefix" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_sku_prefix_unique" UNIQUE("sku_prefix");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sku_unique" UNIQUE("sku");--> statement-breakpoint
-- Auto-derives a category's SKU prefix from its name on insert (or on an
-- update that doesn't set one explicitly) when it doesn't already have one.
-- Admin-supplied prefixes are left untouched, satisfying "admin-editable".
CREATE OR REPLACE FUNCTION assign_category_sku_prefix() RETURNS trigger AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_suffix int := 1;
BEGIN
  IF NEW.sku_prefix IS NOT NULL AND NEW.sku_prefix <> '' THEN
    RETURN NEW;
  END IF;

  v_base := upper(left(regexp_replace(NEW.name, '[^a-zA-Z]', '', 'g'), 3));
  IF v_base = '' THEN
    v_base := 'CAT';
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM categories WHERE sku_prefix = v_candidate AND id <> NEW.id) LOOP
    v_suffix := v_suffix + 1;
    v_candidate := v_base || v_suffix::text;
  END LOOP;

  NEW.sku_prefix := v_candidate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_assign_category_sku_prefix ON categories;--> statement-breakpoint
CREATE TRIGGER trg_assign_category_sku_prefix
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION assign_category_sku_prefix();--> statement-breakpoint
-- Auto-assigns a permanent SKU (category prefix + race-safe sequence
-- number) to a product on insert, unless one is already set. Leaving an
-- existing sku untouched on UPDATE is what makes manual overrides stick.
-- The INSERT ... ON CONFLICT DO UPDATE ... RETURNING below is atomic, so
-- concurrent inserts under the same prefix can never receive the same
-- number twice.
CREATE OR REPLACE FUNCTION assign_product_sku() RETURNS trigger AS $$
DECLARE
  v_prefix text;
  v_number int;
BEGIN
  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN
    RETURN NEW;
  END IF;

  SELECT sku_prefix INTO v_prefix FROM categories WHERE id = NEW.category_id;
  IF v_prefix IS NULL THEN
    v_prefix := 'GEN';
  END IF;

  INSERT INTO sku_sequences (prefix, last_number)
  VALUES (v_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_number = sku_sequences.last_number + 1
  RETURNING last_number INTO v_number;

  NEW.sku := v_prefix || '-' || lpad(v_number::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_assign_product_sku ON products;--> statement-breakpoint
CREATE TRIGGER trg_assign_product_sku
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION assign_product_sku();--> statement-breakpoint
-- Backfill: existing categories first (products' trigger depends on their prefix)...
UPDATE categories SET updated_at = now() WHERE sku_prefix IS NULL;--> statement-breakpoint
-- ...then existing products.
UPDATE products SET updated_at = now() WHERE sku IS NULL;