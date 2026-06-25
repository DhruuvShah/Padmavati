-- sku_sequences was created with RLS enabled but no policy, which denies
-- all access by default — including the assign_product_sku trigger's own
-- internal INSERT/UPDATE (it runs as the caller, not as a privileged role).
-- Mirrors the existing "Admins can manage X" pattern on categories/products.
CREATE POLICY "Admins can manage sku sequences" ON "sku_sequences"
AS PERMISSIVE FOR ALL TO public
USING (is_admin())
WITH CHECK (is_admin());
