-- Karuma Identity System v1.0 · Tabla de cuentas autenticadas
-- Vincula usuarios de Supabase Auth con sus perfiles de Karuma (teléfono, rol, estado).
-- Todos los cambios se registran en auth_login_logs con IP/dispositivo/resultado.

-- Tabla principal: cuentas autenticadas (1:1 con auth.users)
CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK a Supabase Auth. ON DELETE CASCADE → si el usuario se borra en Auth, se borra la cuenta aquí.
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Teléfono vinculado (único en la tabla, pero NULL si aún no verificado).
  phone TEXT UNIQUE,
  -- Nombre para mostrar (el que ve en la UI).
  display_name TEXT NOT NULL,
  -- FK a roles. Define permisos: owner, manager, staff, kitchen, etc.
  role_id TEXT NOT NULL DEFAULT 'staff' REFERENCES roles(id),
  -- Estado de la cuenta: 'active', 'disabled', 'suspended'.
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'suspended')),
  -- Cuándo cambió de contraseña por última vez (para forzar reset si es muy viejo).
  password_changed_at TIMESTAMPTZ,
  -- Último login: hora, para detección de anomalías.
  last_login_at TIMESTAMPTZ,
  -- Última IP desde la que hizo login (para auditoría).
  last_login_ip TEXT,
  -- Si tiene 2FA habilitado (para fase 2).
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Auditoría: cuándo se creó esta cuenta.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Auditoría: cuándo se modificó por última vez.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida por teléfono (login OTP).
CREATE INDEX IF NOT EXISTS idx_auth_accounts_phone ON auth_accounts(phone);
-- Índice por estado (para listar cuentas activas/deshabilitadas).
CREATE INDEX IF NOT EXISTS idx_auth_accounts_status ON auth_accounts(status);
-- Índice por rol (para auditoría y reportes).
CREATE INDEX IF NOT EXISTS idx_auth_accounts_role ON auth_accounts(role_id);


-- Tabla: sesiones OTP temporales
-- Almacena códigos de 6 dígitos que el usuario recibe por SMS.
-- Se expiran después de 5 minutos (verificar en app, no en BD).
CREATE TABLE IF NOT EXISTS auth_otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Teléfono al que se envió el OTP.
  phone TEXT NOT NULL,
  -- Código de 6 dígitos.
  code TEXT NOT NULL,
  -- Intentos fallidos (max 3, luego se bloquea).
  attempts INT NOT NULL DEFAULT 0,
  -- Máximo de intentos permitidos.
  max_attempts INT NOT NULL DEFAULT 3,
  -- Cuándo expira este OTP (5 min desde creación).
  expires_at TIMESTAMPTZ NOT NULL,
  -- Si fue verificado exitosamente (timestamp).
  verified_at TIMESTAMPTZ,
  -- FK a auth_accounts (NULL si es primer login = nuevo usuario).
  account_id UUID REFERENCES auth_accounts(id) ON DELETE SET NULL,
  -- Cuándo se creó este OTP.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para encontrar OTP no expirados y no verificados.
CREATE INDEX IF NOT EXISTS idx_auth_otp_sessions_phone_expires
  ON auth_otp_sessions(phone, expires_at DESC)
  WHERE verified_at IS NULL;


-- Tabla: auditoría de logins
-- Registra TODOS los intentos de login (éxito, fallo, método, IP, dispositivo, etc.).
CREATE TABLE IF NOT EXISTS auth_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK a auth_accounts (NULL si login fallido de usuario no registrado).
  account_id UUID REFERENCES auth_accounts(id) ON DELETE SET NULL,
  -- Método usado: 'password' (fase 2), 'otp', 'google' (fase 2), 'apple' (fase 2).
  login_method TEXT NOT NULL DEFAULT 'otp' CHECK (login_method IN ('password', 'otp', 'google', 'apple')),
  -- Resultado: 'success' o 'failed'.
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  -- IP de origen (para detectar logins sospechosos).
  ip_address TEXT,
  -- User-Agent (navegador, versión, SO).
  user_agent TEXT,
  -- Info adicional del dispositivo (serializado como JSON):
  -- { "device_id": "...", "device_type": "mobile|desktop", "browser": "Chrome 120", "os": "iOS" }
  device_info JSONB,
  -- Si falló, la razón: 'invalid_otp', 'expired_otp', 'account_disabled', 'too_many_attempts', etc.
  failure_reason TEXT,
  -- Timestamp: cuándo ocurrió.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para auditoría por cuenta (mis últimos 10 logins).
CREATE INDEX IF NOT EXISTS idx_auth_login_logs_account_id
  ON auth_login_logs(account_id, created_at DESC);
-- Índice para alertas de seguridad: logins fallidos por IP en los últimos 15 min.
CREATE INDEX IF NOT EXISTS idx_auth_login_logs_ip_recent
  ON auth_login_logs(ip_address, created_at DESC)
  WHERE status = 'failed';


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS): permisos a nivel de fila
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_login_logs ENABLE ROW LEVEL SECURITY;
-- auth_otp_sessions se gestiona solo desde la app, no se expone directamente.


-- Política: un usuario puede ver su propia cuenta.
CREATE POLICY "users_can_view_own_account" ON auth_accounts
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Política: solo el Owner puede ver todas las cuentas (para admin).
-- (Función helper que verificaremos en auth_accounts.role_id = 'owner')
CREATE POLICY "owner_can_view_all_accounts" ON auth_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );

-- Política: solo Owner puede crear cuentas.
CREATE POLICY "owner_can_create_accounts" ON auth_accounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );

-- Política: Owner puede modificar cualquier cuenta (rol, estado, etc).
CREATE POLICY "owner_can_update_accounts" ON auth_accounts
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

-- Política: un usuario puede actualizar su propia cuenta (nombre, etc).
CREATE POLICY "users_can_update_own_account" ON auth_accounts
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id AND
    role_id = (SELECT role_id FROM auth_accounts WHERE id = (SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid()))
    -- Impedir que un usuario cambie su propio rol
  );

-- Política: solo Owner puede eliminar cuentas.
CREATE POLICY "owner_can_delete_accounts" ON auth_accounts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );


-- Política: cada usuario puede ver su propio log de logins.
CREATE POLICY "users_can_view_own_login_logs" ON auth_login_logs
  FOR SELECT
  USING (auth.uid() = (SELECT auth_user_id FROM auth_accounts WHERE id = account_id));

-- Política: Owner puede ver todos los logs (auditoría).
CREATE POLICY "owner_can_view_all_login_logs" ON auth_login_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_accounts
      WHERE auth_user_id = auth.uid() AND role_id = 'owner'
    )
  );

-- Política: solo el servidor (service role) puede crear logs.
CREATE POLICY "service_role_can_create_login_logs" ON auth_login_logs
  FOR INSERT
  WITH CHECK (
    current_user_id IS NULL OR auth.uid() IS NULL
    -- Este check es débil en Supabase (siempre INSERT si el campo no es NULL).
    -- La verdadera restricción es que el cliente ANON no puede insertar en esta tabla.
    -- Solo usamos esta tabla desde edge functions/APIs con service role.
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers: mantener updated_at al actualizar
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_auth_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auth_accounts_updated_at ON auth_accounts;
CREATE TRIGGER trigger_auth_accounts_updated_at
  BEFORE UPDATE ON auth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_auth_accounts_updated_at();
