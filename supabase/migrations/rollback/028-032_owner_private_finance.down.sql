-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de las migraciones 028–032 (zona privada del propietario).
-- Orden inverso de dependencias. NO se ejecuta automáticamente: aplicar a mano
-- en el SQL Editor solo si hay que revertir la funcionalidad.
--
-- ⚠️ Esto BORRA todas las tablas financieras privadas y el bucket. Haz copia
-- de seguridad antes si ya contienen datos reales.
-- ─────────────────────────────────────────────────────────────────────────────

-- 032 · Storage policies + bucket
DROP POLICY IF EXISTS private_finance_objects_sel ON storage.objects;
DROP POLICY IF EXISTS private_finance_objects_ins ON storage.objects;
DROP POLICY IF EXISTS private_finance_objects_upd ON storage.objects;
DROP POLICY IF EXISTS private_finance_objects_del ON storage.objects;
-- Borra objetos del bucket antes de eliminarlo (si existieran).
DELETE FROM storage.objects WHERE bucket_id = 'private-finance';
DELETE FROM storage.buckets WHERE id = 'private-finance';

-- 031 · Audit logs
DROP TABLE IF EXISTS public.private_audit_logs CASCADE;

-- 030 · Documentos
DROP TABLE IF EXISTS public.private_financial_documents CASCADE;

-- 029 · Tablas financieras
DROP TABLE IF EXISTS public.bank_transactions CASCADE;
DROP TABLE IF EXISTS public.payroll_records CASCADE;
DROP TABLE IF EXISTS public.rent_expenses CASCADE;
DROP TABLE IF EXISTS public.private_expenses CASCADE;
DROP FUNCTION IF EXISTS public._apply_owner_aal2_policies(regclass);

-- 028 · owner_profiles + helper
DROP FUNCTION IF EXISTS public.is_owner_aal2();
DROP TABLE IF EXISTS public.owner_profiles CASCADE;
