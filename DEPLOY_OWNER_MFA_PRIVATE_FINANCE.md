# Despliegue · Zona del propietario (MFA + finanzas privadas)

Checklist para activar en un Supabase **real** la funcionalidad del PR
`feat/owner-mfa-private-finance`. Sigue los pasos **en orden**. No hace falta
tocar código: todo se hace en el dashboard de Supabase, en las variables de
entorno del hosting (Vercel) y probando en el navegador.

> Recomendado: hazlo primero en un proyecto de **staging** y solo después en
> producción. Nada de esto crea datos reales por ti.

Leyenda: ⬜ pendiente · ✅ hecho.

---

## 0. Requisitos previos

- ⬜ Acceso al **dashboard de Supabase** del proyecto (rol admin).
- ⬜ Acceso a las **variables de entorno** del hosting (Vercel).
- ⬜ Una app de **Authenticator** en el móvil del propietario (Google
  Authenticator, Authy, 1Password, etc.).
- ⬜ El PR `feat/owner-mfa-private-finance` desplegado (preview o producción).
  Vercel: push a `main` = producción; el PR genera un preview.

---

## 1. Variables de entorno (no hay ninguna nueva)

La función reutiliza variables que ya existen. Verifica que estas **4** están
definidas en el entorno donde corre la app:

- ⬜ `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto.
- ⬜ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública (anon). La usa el navegador
  para el login del propietario y el MFA.
- ⬜ `SUPABASE_SERVICE_ROLE_KEY` — clave privada. **Solo servidor.** Nunca la
  pongas con prefijo `NEXT_PUBLIC_`.
- ⬜ `KARUMA_AUTH_SECRET` — secreto del cookie propio (≥ 32 caracteres).

> En Vercel las variables se enlazan **en el build**: si añades o cambias
> alguna, **redespliega** para que surta efecto.

---

## 2. Aplicar las migraciones (SQL Editor del dashboard)

Las tablas se crean con SQL. En este proyecto el DDL se aplica **a mano en el
SQL Editor del dashboard** (no hay connection string ni script automático).

Abre **Dashboard → SQL Editor → New query** y ejecuta el contenido de cada
fichero, **en este orden exacto**, uno por uno:

1. ⬜ `supabase/migrations/028_owner_profiles.sql`
   — crea `owner_profiles` y la función `public.is_owner_aal2()`.
2. ⬜ `supabase/migrations/029_private_finance_tables.sql`
   — `bank_transactions`, `payroll_records`, `rent_expenses`, `private_expenses`.
3. ⬜ `supabase/migrations/030_private_financial_documents.sql`
   — `private_financial_documents`.
4. ⬜ `supabase/migrations/031_private_audit_logs.sql`
   — `private_audit_logs` (solo lectura + inserción; inmutable).
5. ⬜ `supabase/migrations/032_private_finance_storage.sql`
   — bucket privado `private-finance` + policies de storage.

Son **idempotentes**: si repites una, no rompe nada. **No crean ningún usuario
ni dato real.**

**Comprobación rápida** (ejecuta en el SQL Editor; deben devolver `true`):

```sql
-- ¿Existe la función gate?
select exists (select 1 from pg_proc where proname = 'is_owner_aal2') as fn_ok;

-- ¿RLS activada en las 7 tablas?
select bool_and(rowsecurity) as rls_ok
from pg_tables
where schemaname = 'public'
  and tablename in (
    'owner_profiles','bank_transactions','payroll_records','rent_expenses',
    'private_expenses','private_financial_documents','private_audit_logs'
  );

-- ¿El bucket es privado?
select id, public from storage.buckets where id = 'private-finance';  -- public = false
```

---

## 3. Habilitar MFA (TOTP) en Supabase Auth

- ⬜ **Dashboard → Authentication → Sign In / Providers** (o **MFA**): asegúrate
  de que **TOTP (Authenticator app)** está habilitado como factor MFA.
- ⬜ (Opcional) No hace falta forzar MFA a nivel de proyecto: la app **ya obliga**
  al propietario a registrar y verificar TOTP antes de entrar en `/owner`.

---

## 4. Crear el usuario del propietario (Supabase Auth)

> **Este usuario NO se crea desde el código.** Lo creas tú aquí.

- ⬜ **Dashboard → Authentication → Users → Add user → Create new user**.
- ⬜ Introduce el **email** del propietario y una **contraseña** inicial fuerte.
- ⬜ Marca el email como confirmado (o envía invitación), según tu política.
- ⬜ Anota el **User UID** (lo necesitas en el paso 5).

> No pongas la contraseña en Git, en el código ni en este documento.

---

## 5. Marcar ese usuario como propietario (`owner_profiles`)

El rol *owner* **no** sale de `user_metadata` (el usuario podría cambiarlo);
sale de la tabla `owner_profiles`, que solo escribe el servidor. Insértalo tú
una vez, en el **SQL Editor**, sustituyendo el email:

```sql
insert into public.owner_profiles (user_id, email, display_name, is_active)
select id, email, 'Propietario', true
from auth.users
where email = 'EMAIL_DEL_PROPIETARIO'   -- <-- cámbialo
on conflict (user_id) do update set is_active = true, email = excluded.email;
```

Comprobación:

```sql
select user_id, email, is_active from public.owner_profiles;
```

- ⬜ Aparece **una fila** con el email correcto e `is_active = true`.

> Para **revocar** el acceso de owner sin borrar nada:
> `update public.owner_profiles set is_active = false where email = '...';`

---

## 6. Storage (bucket `private-finance`)

El bucket lo crea la migración 032. Verifica en **Dashboard → Storage**:

- ⬜ Existe el bucket **`private-finance`**.
- ⬜ Está marcado como **privado** (no público). Si aparece público, vuelve a
  ejecutar la migración 032.
- ⬜ No añadas ninguna policy pública ni URL pública: las descargas se hacen con
  **signed URL de 60 s** que genera el servidor.

---

## 7. Verificación funcional (navegador)

Con la app desplegada y los pasos 1–6 hechos:

1. ⬜ Ve a **`/login`** → pulsa **“Acceso seguro del propietario”**
   (o entra directo en **`/security/login`**).
2. ⬜ Introduce el **email + contraseña** del paso 4. Debe llevarte a
   **`/security/setup-mfa`**.
3. ⬜ Escanea el **QR** con el Authenticator (o usa la clave manual). Guarda una
   copia de seguridad del acceso al Authenticator.
4. ⬜ Introduce el código de 6 dígitos → debe entrar en **`/owner`**.
5. ⬜ Entra en **Banco / Nóminas / Alquiler**, crea un registro de prueba y bórralo.
   La cuenta bancaria debe mostrarse enmascarada (`•••• 1234`).
6. ⬜ En **`/owner/security`** comprueba: `aal = aal2`, *MFA registrado = Sí* y que
   aparecen entradas en el **registro de auditoría**.
7. ⬜ Cierra sesión y vuelve a entrar: ahora debe pedir **`/security/verify-mfa`**
   (ya no el registro), pedir el código y volver a `/owner`.
8. ⬜ **Inactividad**: deja `/owner` sin tocar 15 min → debe exigir volver a
   verificar el MFA.

### Verificación de que NADIE más entra

- ⬜ Con un **PIN de empleado**: el portal de empleado funciona igual; al intentar
  abrir `/owner` → redirige fuera (no entra).
- ⬜ Con una cuenta de **encargado/gestión** (login de oficina): `/owner` redirige
  a `/security/login` y `GET /api/owner/finanzas/bank` responde **401/403**.
- ⬜ Sin sesión: cualquier `/api/owner/...` responde **401**; cualquier `/owner/...`
  redirige a `/security/login`.

---

## 8. Supabase Security Advisor

Tras aplicar las migraciones (paso 2):

- ⬜ **Dashboard → Advisors → Security Advisor** → *Run / Refresh*.
- ⬜ Revisa que **no haya avisos** sobre las tablas nuevas. En concreto que NO
  aparezcan:
  - `rls_disabled_in_public` / “RLS disabled” en ninguna de las 7 tablas.
  - `policy_exists_rls_disabled`.
  - `security_definer_view` (no usamos vistas).
  - `function_search_path_mutable` para `is_owner_aal2` / `_apply_owner_aal2_policies`.
  - Bucket `private-finance` público.
- ⬜ Revisa también el **Performance Advisor**: las policies ya envuelven el gate
  en `(select public.is_owner_aal2())`, así que no debería avisar de
  `auth_rls_initplan`.

Si algún aviso aparece, anótalo y no continúes en producción hasta resolverlo.

---

## 9. Rollback (solo si hay que revertir)

- ⬜ Ejecuta en el **SQL Editor** el contenido de
  `supabase/migrations/rollback/028-032_owner_private_finance.down.sql`.
- ⚠️ **Borra** las tablas financieras privadas y el bucket. Haz copia de
  seguridad antes si ya contienen datos reales.

---

## Resumen de lo que toca cada paso

| Paso | Dónde | Crea / cambia |
|---|---|---|
| 1 | Hosting (Vercel) | Variables de entorno (verificar) |
| 2 | SQL Editor | 7 tablas + función gate + bucket + policies |
| 3 | Auth settings | Habilitar TOTP |
| 4 | Auth → Users | Usuario del propietario |
| 5 | SQL Editor | Fila en `owner_profiles` |
| 6 | Storage | Verificar bucket privado |
| 7 | Navegador | Prueba de extremo a extremo |
| 8 | Advisors | Verificación de seguridad |
| 9 | SQL Editor | (Opcional) rollback |

**Reglas de oro:** la `SERVICE_ROLE_KEY` nunca va al navegador; ni contraseñas,
ni claves MFA, ni códigos de recuperación se guardan en Git ni en este documento.
