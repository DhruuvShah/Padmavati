-- Critical bug found in Phase 3 bulk-generation testing (7,000+ products):
-- Postgres's lpad(string, length) TRUNCATES the input if it's already longer
-- than `length` -- it doesn't just skip padding. So once a single category's
-- sequence reached 1000, lpad(v_number::text, 3, '0') silently cut "1000"
-- down to "100", colliding with the real SKU already assigned to product
-- #100 in that category. Fix: pad to at least 3 digits, but let the width
-- grow with the number so it's never truncated.
CREATE OR REPLACE FUNCTION assign_product_sku() RETURNS trigger AS $$
DECLARE
  v_prefix text;
  v_number int;
  v_manual_prefix text;
  v_manual_number int;
  v_sku_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_sku_changed := true;
  ELSE
    v_sku_changed := (OLD.sku IS DISTINCT FROM NEW.sku);
  END IF;

  IF NEW.sku IS NOT NULL AND NEW.sku <> '' THEN
    IF v_sku_changed AND NEW.sku ~ '^[A-Za-z0-9]+-[0-9]+$' THEN
      v_manual_prefix := upper(split_part(NEW.sku, '-', 1));
      v_manual_number := split_part(NEW.sku, '-', 2)::int;
      INSERT INTO sku_sequences (prefix, last_number)
      VALUES (v_manual_prefix, v_manual_number)
      ON CONFLICT (prefix) DO UPDATE
        SET last_number = GREATEST(sku_sequences.last_number, v_manual_number);
    END IF;
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

  NEW.sku := v_prefix || '-' || lpad(v_number::text, greatest(3, length(v_number::text)), '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
