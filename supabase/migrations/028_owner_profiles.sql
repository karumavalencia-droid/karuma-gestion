-- ─────────────────────────────────────────────────────────────────────────────
-- 028 · owner_profiles + gate helper is_owner_aal2()
-- Zona privada del propietario (Karuma OS · owner MFA private finance).
--
-- Modelo de acceso: la identidad "owner" NUNCA se decide con user_metadata (el
-- usuario podría modificarlo). Se decide con esta tabla, controlada solo por el
-- service role del servidor, + el nivel de garantía MFA (aal2) del token.
--
-- Idempotente: se puede volver a ejecutar sin efectos secundarios.
-- NO crea ningún usuario real ni datos personales.
-- Aplicar manualmente en el SQL Editor del dashboard (no en un pipeline).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.owner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

-- El propietario puede leer SOLO su propia fila (para que la app sepa que lo es).
-- Las escrituras las hace únicamente el service role (que ignora RLS).
DROP POLICY IF EXISTS owner_profiles_select_self ON public.owner_profiles;
CREATE POLICY owner_profiles_select_self ON public.owner_profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── Gate central: ¿es owner activo Y la sesión llegó a aal2 (MFA verificado)? ──
-- SECURITY DEFINER para poder leer owner_profiles sin recursión de RLS.
-- search_path bloqueado para evitar secuestro de resolución de nombres.
-- El nivel aal viene del token de Supabase Auth (auth.jwt()->>'aal'),
-- imposible de falsificar desde el cliente.
CREATE OR REPLACE FUNCTION public.is_owner_aal2()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE((auth.jwt() ->> 'aal') = 'aal2', FALSE)
    AND EXISTS (
      SELECT 1
      FROM public.owner_profiles op
      WHERE op.user_id = auth.uid()
        AND op.is_active = TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.is_owner_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner_aal2() TO authenticated;

COMMENT ON FUNCTION public.is_owner_aal2() IS
  'TRUE solo si auth.uid() es owner activo en owner_profiles y el token tiene aal2 (MFA verificado). Base de todas las policies de la zona privada.';
