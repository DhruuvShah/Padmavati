-- Edge case found in Phase 3 testing: a manually-overridden SKU (e.g.
-- "GAN-050" set while the GAN sequence counter is still at 3) was never
-- reflected back into sku_sequences. The auto-counter kept climbing from
-- its old position (GAN-004, GAN-005, ...) until it eventually reached 050
-- and collided with the manual one, causing a future, unrelated product
-- save to fail with a unique-constraint error. Fix: whenever a SKU is set
-- (or changed) and it matches the "<prefix>-<number>" pattern, advance that
-- prefix's sequence past it so the auto-counter can never catch up to it.
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

  NEW.sku := v_prefix || '-' || lpad(v_number::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
