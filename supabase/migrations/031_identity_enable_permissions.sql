-- Karuma Identity System v1.0 · Activar control de permisos
-- Crea la tabla de configuración y las funciones de verificación de permisos.

-- Tabla de configuración global (si no existe).
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  -- Activar/desactivar la verificación de permisos a nivel de API/página.
  permissions_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Máximo de intentos de OTP antes de bloqueo temporal.
  otp_max_attempts INT NOT NULL DEFAULT 3,
  -- Duración de validez del OTP (en minutos).
  otp_validity_minutes INT NOT NULL DEFAULT 5,
  -- Duración de la sesión (en días).
  session_duration_days INT NOT NULL DEFAULT 7,
  -- Teléfono del owner (inicial, para setup).
  owner_phone TEXT,
  -- Cuándo se actualizó por última vez.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un solo registro en esta tabla.
  CONSTRAINT only_one_config CHECK (id = 1)
);

-- Insertar la configuración inicial si no existe.
INSERT INTO app_config (id, permissions_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- Funciones de verificación de permisos
-- ─────────────────────────────────────────────────────────────────────────────

-- Función: verificar si un usuario tiene acceso a un módulo.
-- Retorna TRUE si tiene permisos, FALSE si no.
CREATE OR REPLACE FUNCTION check_user_module_access(
  p_module TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_role_id TEXT;
  v_has_access BOOLEAN;
BEGIN
  -- Obtener el rol del usuario autenticado.
  SELECT role_id INTO v_role_id
  FROM auth_accounts
  WHERE auth_user_id = auth.uid();

  -- Si no hay usuario autenticado o no existe en auth_accounts, denegar.
  IF v_role_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar si el rol tiene permiso para este módulo.
  -- (En la fase 2 crearemos una tabla role_permissions con esta relación).
  -- Por ahora, solo permitimos a Owner acceder a todo.
  CASE v_role_id
    WHEN 'owner' THEN RETURN true;
    WHEN 'manager' THEN
      RETURN p_module IN ('dashboard', 'sales', 'staff', 'schedule', 'inventory', 'reviews');
    WHEN 'kitchen' THEN
      RETURN p_module IN ('recipes', 'ingredients', 'schedule');
    WHEN 'staff' THEN
      RETURN p_module IN ('schedule', 'attendance');
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: obtener el rol del usuario autenticado.
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role_id
    FROM auth_accounts
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: obtener la ID de la cuenta del usuario autenticado.
CREATE OR REPLACE FUNCTION get_current_account_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id
    FROM auth_accounts
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: verificar si el usuario es Owner.
CREATE OR REPLACE FUNCTION is_current_user_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role_id = 'owner'
    FROM auth_accounts
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: actualizar updated_at en app_config
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_app_config_updated_at ON app_config;
CREATE TRIGGER trigger_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_config_updated_at();
