# Karuma Identity System v1.0 — Fase 1 Completada

**Fecha**: 2026-07-13  
**Estado**: ✅ Completada (lista para revisión y migración manual)  
**Rama**: `feat/identity-system-v1`

---

## Resumen Ejecutivo

Fase 1 establece la **infraestructura de base de datos y tipos** para el nuevo sistema de identidad comercial de Karuma. Todos los cambios son **aditivos** (sin modificar código existente):

- ✅ 3 nuevas **migrations** SQL (RLS completo)
- ✅ **Tipos TypeScript** actualizados
- ✅ 3 **librerías de servidor** listas para APIs

---

## Cambios de Base de Datos

### Migration 029: Tablas de Autenticación Core

**Tablas creadas**:
1. `auth_accounts` — Cuentas de usuario (vinculadas a `auth.users` de Supabase)
2. `auth_otp_sessions` — Sesiones OTP temporales (6 dígitos, 5 min válido)
3. `auth_login_logs` — Auditoría: registro de todos los intentos de login

**Características**:
- ✅ RLS habilitado: cada usuario ve solo sus propios datos
- ✅ Owner puede gestionar todas las cuentas
- ✅ Índices optimizados para búsquedas por teléfono, IP, estado
- ✅ Triggers automáticos para `updated_at`

**Ejemplo de uso**:
```sql
-- Usuario ve su propia cuenta
SELECT * FROM auth_accounts WHERE auth_user_id = auth.uid();

-- Owner ve todas las cuentas (RLS lo permite)
SELECT * FROM auth_accounts;

-- Logs de login de un usuario
SELECT * FROM auth_login_logs
WHERE account_id = (SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid());
```

### Migration 030: Rastreo de Sesiones Multi-Dispositivo

**Tabla creada**:
- `auth_sessions` — Dispositivos activos de cada usuario

**Propósito**:
- Permite ver qué dispositivos tiene activos
- Permite logout remoto (revocar sesión)
- Auditoría: IP, navegador, SO, fecha

**Ejemplo**:
```sql
-- Mis dispositivos activos
SELECT device_name, browser_name, os, last_active_at
FROM auth_sessions
WHERE account_id = (SELECT id FROM auth_accounts WHERE auth_user_id = auth.uid())
  AND revoked_at IS NULL;
```

### Migration 031: Activar Control de Permisos

**Cambios**:
- Crea tabla `app_config` (configuración global)
- Crea 4 funciones helper SQL:
  - `check_user_module_access(module)` — ¿Tiene permiso?
  - `get_current_user_role()` — ¿Qué rol tiene?
  - `get_current_account_id()` — ¿Cuál es su ID?
  - `is_current_user_owner()` — ¿Es Owner?

**Estado**: `PERMISSIONS_ENABLED = true` (listo para fase 3)

---

## Cambios de Código

### 1. Types (`lib/supabase/types.ts`)

**Nuevos tipos TypeScript** (9 tipos + inserts):
```typescript
DbAuthAccount       // Cuenta de usuario
DbAuthOtpSession    // Sesión OTP
DbAuthLoginLog      // Log de auditoría
DbAuthSession       // Sesión de dispositivo
DbAppConfig         // Configuración
// + Insert variants para cada uno
```

Actualizados: `Database` type con todas las nuevas tablas.

### 2. Servicios de Servidor

#### `lib/auth/otp-service.ts` (120 líneas)
Gestión de OTP completa:
```typescript
requestOtp(phone)         // Generar 6 dígitos → guardar en BD
verifyOtp(phone, code)    // Validar código → marcar como verificado
cleanupExpiredOtps()      // Limpieza periódica
```

**Características**:
- Genera códigos aleatorios de 6 dígitos
- Almacena con expiración (5 min configurable)
- Maneja reintentos (máx 3 intentos)
- Validación de formato de teléfono

#### `lib/auth/supabase-auth.ts` (290 líneas)
Integración con Supabase Auth:
```typescript
createAuthUser(phone, name, role)    // Crear usuario en Supabase + auth_accounts
getAccountByPhone(phone)              // Buscar cuenta por teléfono
updateLastLogin(accountId, ip)        // Auditoría
logLoginEvent(...)                    // Registrar intento de login
getOrCreateSession(accountId, device) // Rastrear dispositivo
disableAccount(accountId)             // Deshabilitar (sin eliminar datos)
enableAccount(accountId)              // Habilitar
updateAccountRole(accountId, roleId)  // Cambiar rol
```

#### `lib/auth/permission-guard.ts` (80 líneas)
Middleware de permisos:
```typescript
requireSession(request)        // ¿Hay sesión?
requireModuleAccess(module)    // ¿Tiene permiso para módulo?
requireOwner(request)          // ¿Es Owner?
requireRouteAccess(pathname)   // ¿Puede acceder a ruta?
```

---

## Próximos Pasos (Fase 2-3)

Para continuar, **DEBE**:

1. **Aplicar migrations manualmente** en Supabase (SQL Editor del dashboard):
   ```bash
   supabase/migrations/029_identity_auth_tables.sql
   supabase/migrations/030_identity_session_tracking.sql
   supabase/migrations/031_identity_enable_permissions.sql
   ```

2. **Crear APIs de login** (próximo PR):
   - `POST /api/auth/login/otp/request` — Solicitar OTP
   - `POST /api/auth/login/otp/verify` — Verificar OTP
   - `POST /api/auth/register` — Crear cuenta (solo Owner)
   - `POST /api/auth/logout` — Cerrar sesión

3. **Actualizar UI de login** (`app/login/page.tsx`):
   - Cambiar de contraseña a **entrada de teléfono + OTP**

4. **Habilitar permission checks** en API routes y middleware

---

## Variables de Entorno (Nuevas)

Agregar a `.env.local`:
```env
# OTP configuration
OTP_LENGTH=6
OTP_VALIDITY_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Session configuration
SESSION_DURATION_DAYS=7

# SMS Provider (fase 2)
SMS_PROVIDER=mock          # mock | twilio | aliyun
# TWILIO_ACCOUNT_SID=...   # Si uses Twilio
# TWILIO_AUTH_TOKEN=...
# TWILIO_FROM_NUMBER=...
```

---

## Verificación Local

Después de aplicar las migrations:

1. **Comprobar tablas en Supabase Dashboard**:
   - SQL Editor → `SELECT * FROM auth_accounts;` (vacío ✓)
   - SQL Editor → `SELECT * FROM auth_login_logs;` (vacío ✓)

2. **Verificar RLS**:
   - Conectar como usuario con `anon_key`
   - Intentar `SELECT * FROM auth_accounts;`
   - Debe retornar error (RLS bloqueado ✓)

3. **Verificar funciones**:
   - SQL Editor: `SELECT check_user_module_access('dashboard');`
   - Debe retornar `false` (sin usuario autenticado)

---

## Consideraciones de Seguridad

✅ **RLS habilitado**: Cada usuario solo ve sus propios datos  
✅ **OTP limitado**: 3 intentos máx, 5 min de validez  
✅ **Auditoría completa**: Todos los logins registrados (IP, dispositivo, resultado)  
✅ **Deshabilitar sin borrar**: Cuentas pueden ser deshabilitadas sin pérdida de datos  
✅ **Multi-dispositivo**: Cada sesión tiene ID único + device fingerprint  

⚠️ **Aún no implementado**:
- SMS real (fase 2; ahora es mock en console)
- Password reset (fase 2)
- 2FA (fase 2)
- Google/Apple OAuth (fase 2)

---

## Rollback (Si es necesario)

```sql
-- En Supabase SQL Editor, ejecutar en orden inverso:
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS auth_login_logs CASCADE;
DROP TABLE IF EXISTS auth_otp_sessions CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;
DROP FUNCTION IF EXISTS check_user_module_access CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role CASCADE;
DROP FUNCTION IF EXISTS get_current_account_id CASCADE;
DROP FUNCTION IF EXISTS is_current_user_owner CASCADE;
```

---

## Estadísticas

| Métrica | Valor |
|---------|-------|
| **Migrations** | 3 (029-031) |
| **Tablas nuevas** | 5 (auth_accounts, auth_otp_sessions, auth_login_logs, auth_sessions, app_config) |
| **Tipos TypeScript** | 9 + inserts |
| **Funciones SQL** | 4 |
| **Librerías nuevas** | 3 (otp-service, supabase-auth, permission-guard) |
| **Líneas de código** | ~500 |
| **RLS policies** | 12 (per-table) |
| **Índices** | 8 (optimizados) |

---

## Archivos Modificados/Creados

**Nuevos**:
- ✅ `supabase/migrations/029_identity_auth_tables.sql`
- ✅ `supabase/migrations/030_identity_session_tracking.sql`
- ✅ `supabase/migrations/031_identity_enable_permissions.sql`
- ✅ `lib/auth/otp-service.ts`
- ✅ `lib/auth/supabase-auth.ts`
- ✅ `lib/auth/permission-guard.ts`

**Modificados**:
- ✅ `lib/supabase/types.ts` (agregados 9 tipos)

**Este documento**:
- ✅ `IDENTITY_SYSTEM_PHASE1.md`

---

## Próxima Revisión

- Code review de migrations + tipos
- Validar RLS policies
- Validar tipos TypeScript
- Aprobar para que sea mergeado a `main`
- Luego: crear PR para Fase 2 (APIs)

---

*Fase 1 lista. Esperando instrucciones para continuar a Fase 2 (OTP login APIs).*
