-- Karuma Identity System v1.0 · Rastreo de sesiones multi-dispositivo
-- Permite a Owner ver todos los dispositivos activos de un usuario.
-- Útil para: logouts remotos, detección de sesiones robadas, auditoría.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK a auth_accounts.
  account_id UUID NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  -- ID único del dispositivo (generado por el cliente, ej: browser fingerprint).
  device_id TEXT NOT NULL,
  -- Nombre amigable del dispositivo (ej: "iPhone 14 Pro", "MacBook Pro").
  device_name TEXT,
  -- Tipo de dispositivo: 'mobile', 'desktop', 'tablet'.
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  -- Nombre del navegador (ej: "Chrome", "Safari", "Firefox").
  browser_name TEXT,
  -- Versión del navegador (ej: "120.0.1").
  browser_version TEXT,
  -- SO (ej: "Windows 10", "iOS 17", "macOS 13").
  os TEXT,
  -- IP desde la que accede.
  ip_address TEXT,
  -- Cuándo fue activo por última vez.
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Cuándo expira esta sesión (7 días por defecto).
  expires_at TIMESTAMPTZ NOT NULL,
  -- Si fue revocada manualmente (logout remoto).
  revoked_at TIMESTAMPTZ,
  -- Cuándo se creó.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice: sesiones activas de una cuenta (últimas 10).
CREATE INDEX IF NOT EXISTS idx_auth_sessions_account_id
  ON auth_sessions(account_id, created_at DESC)
  WHERE revoked_at IS NULL;

-- Índice: limpiar sesiones expiradas.
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions(expires_at)
  WHERE revoked_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Un usuario puede ver sus propias sesiones.
CREATE POLICY "users_can_view_own_sessions" ON auth_sessions
  FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Un usuario puede revocar sus propias sesiones (logout remoto).
CREATE POLICY "users_can_revoke_own_sessions" ON auth_sessions
  FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- Owner puede ver todas las sesiones (auditoría).
CREATE POLICY "owner_can_view_all_sessions" ON auth_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );

-- Owner puede revocar sesiones de cualquier usuario.
CREATE POLICY "owner_can_revoke_any_session" ON auth_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- Función: limpiar sesiones expiradas y revocadas
-- Se ejecuta periódicamente (ej: cada día a las 2am).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions
  WHERE (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days')
     OR (expires_at < now());
END;
$$ LANGUAGE plpgsql;
