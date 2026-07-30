-- ─────────────────────────────────────────────────────────────────────────────
-- 032 · Bucket privado 'private-finance' + policies de storage.objects
--
-- - Bucket NO público (public = false): no hay URL pública posible.
-- - Solo owner + aal2 puede subir / leer / borrar objetos del bucket.
-- - Las descargas se hacen con signed URL de corta duración generada en el
--   servidor (nunca se expone la service-role key al navegador).
-- Idempotente. No sube ningún fichero.
-- ─────────────────────────────────────────────────────────────────────────────

-- Crear el bucket privado (o dejarlo privado si ya existe).
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-finance', 'private-finance', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Policies sobre storage.objects, acotadas al bucket y a owner+aal2.
DROP POLICY IF EXISTS private_finance_objects_sel ON storage.objects;
CREATE POLICY private_finance_objects_sel ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'private-finance' AND (SELECT public.is_owner_aal2()));

DROP POLICY IF EXISTS private_finance_objects_ins ON storage.objects;
CREATE POLICY private_finance_objects_ins ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-finance' AND (SELECT public.is_owner_aal2()));

DROP POLICY IF EXISTS private_finance_objects_upd ON storage.objects;
CREATE POLICY private_finance_objects_upd ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'private-finance' AND (SELECT public.is_owner_aal2()))
  WITH CHECK (bucket_id = 'private-finance' AND (SELECT public.is_owner_aal2()));

DROP POLICY IF EXISTS private_finance_objects_del ON storage.objects;
CREATE POLICY private_finance_objects_del ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'private-finance' AND (SELECT public.is_owner_aal2()));
