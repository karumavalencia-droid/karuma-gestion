/**
 * Supabase Auth 封装：创建账户、OTP 登录、管理会话。
 * 所有操作使用 service role key（只在服务端）。
 */

import { createClient } from "@supabase/supabase-js";
import type { DbAuthAccount, DbAuthAccountInsert } from "../supabase/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface CreateAuthUserParams {
  phone: string;
  displayName: string;
  roleId?: string;
}

export interface CreateAuthUserResult {
  success: boolean;
  accountId?: string;
  authUserId?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  accountId?: string;
  displayName?: string;
  roleId?: string;
  error?: string;
}

/**
 * Crear una cuenta de usuario en Supabase Auth + auth_accounts.
 * Solo debe usarse cuando el usuario verifica su OTP por primera vez.
 *
 * @param params Información del usuario (teléfono, nombre, rol)
 * @returns ID de la cuenta y ID del auth user
 */
export async function createAuthUser(
  params: CreateAuthUserParams
): Promise<CreateAuthUserResult> {
  try {
    const { phone, displayName, roleId = "staff" } = params;

    // Paso 1: Crear usuario en Supabase Auth (sin contraseña, solo con teléfono)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser(
      {
        phone: phone,
        email: `${phone}@karuma.local`, // Email placeholder (requerido por Supabase)
        user_metadata: {
          phone: phone,
          display_name: displayName,
        },
        // No asignamos contraseña; solo OTP
      }
    );

    if (authError || !authData.user) {
      console.error("[Auth] Error creando usuario en Supabase:", authError);
      return {
        success: false,
        error:
          authError?.message || "No se pudo crear el usuario de autenticación",
      };
    }

    const authUserId = authData.user.id;

    // Paso 2: Crear registro en auth_accounts
    const { data: account, error: accountError } = await supabase
      .from("auth_accounts")
      .insert({
        auth_user_id: authUserId,
        phone: phone,
        display_name: displayName,
        role_id: roleId,
        status: "active",
      } as DbAuthAccountInsert)
      .select("id")
      .single();

    if (accountError || !account) {
      console.error("[Auth] Error creando auth_accounts:", accountError);
      // Rollback: eliminar el usuario de Supabase Auth
      await supabase.auth.admin.deleteUser(authUserId);
      return {
        success: false,
        error: "No se pudo crear la cuenta de usuario",
      };
    }

    return {
      success: true,
      accountId: account.id,
      authUserId: authUserId,
    };
  } catch (err) {
    console.error("[Auth] Excepción al crear usuario:", err);
    return {
      success: false,
      error: "Error del servidor al crear usuario",
    };
  }
}

/**
 * Buscar la cuenta de un usuario por teléfono.
 * Se llama después de verificar el OTP.
 *
 * @param phone Número de teléfono (formato: +34600123456)
 * @returns Datos de la cuenta o error
 */
export async function getAccountByPhone(
  phone: string
): Promise<(DbAuthAccount & { auth_user_id: string }) | null> {
  try {
    const { data, error } = await supabase
      .from("auth_accounts")
      .select("*")
      .eq("phone", phone.trim())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("[Auth] Error buscando cuenta:", error);
      return null;
    }

    return data as DbAuthAccount & { auth_user_id: string };
  } catch (err) {
    console.error("[Auth] Excepción al buscar cuenta:", err);
    return null;
  }
}

/**
 * Actualizar último login (hora, IP) para auditoría.
 *
 * @param accountId ID de la cuenta
 * @param ip IP del cliente
 */
export async function updateLastLogin(
  accountId: string,
  ip: string | null
): Promise<void> {
  try {
    await supabase
      .from("auth_accounts")
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ip,
      })
      .eq("id", accountId);
  } catch (err) {
    console.error("[Auth] Error actualizando último login:", err);
  }
}

/**
 * Registrar un evento de login en el audit log.
 *
 * @param accountId ID de la cuenta (null si login fallido)
 * @param status 'success' o 'failed'
 * @param loginMethod 'otp', 'password', 'google', 'apple'
 * @param ip IP del cliente
 * @param userAgent User-Agent del navegador
 * @param failureReason Si falló, la razón
 */
export async function logLoginEvent(params: {
  accountId?: string | null;
  status: "success" | "failed";
  loginMethod: "password" | "otp" | "google" | "apple";
  ip?: string | null;
  userAgent?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  failureReason?: string | null;
}): Promise<void> {
  try {
    const {
      accountId,
      status,
      loginMethod,
      ip,
      userAgent,
      deviceInfo,
      failureReason,
    } = params;

    await supabase.from("auth_login_logs").insert({
      account_id: accountId,
      status,
      login_method: loginMethod,
      ip_address: ip,
      user_agent: userAgent,
      device_info: deviceInfo,
      failure_reason: failureReason,
    });
  } catch (err) {
    console.error("[Auth] Error registrando login:", err);
  }
}

/**
 * Obtener o crear una sesión de dispositivo.
 * Usado para rastrear múltiples dispositivos de un usuario.
 *
 * @param accountId ID de la cuenta
 * @param deviceId ID único del dispositivo (ej: browser fingerprint)
 * @param deviceInfo Info del dispositivo (browser, OS, etc)
 * @returns ID de la sesión
 */
export async function getOrCreateSession(params: {
  accountId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  browserName?: string;
  browserVersion?: string;
  os?: string;
  ip?: string;
}): Promise<string | null> {
  try {
    const {
      accountId,
      deviceId,
      deviceName,
      deviceType,
      browserName,
      browserVersion,
      os,
      ip,
    } = params;

    // Intentar encontrar sesión existente
    const { data: existingSession } = await supabase
      .from("auth_sessions")
      .select("id")
      .eq("account_id", accountId)
      .eq("device_id", deviceId)
      .is("revoked_at", null)
      .single();

    if (existingSession) {
      // Actualizar last_active_at
      await supabase
        .from("auth_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", existingSession.id);
      return existingSession.id;
    }

    // Crear nueva sesión
    const sessionDurationDays =
      parseInt(process.env.SESSION_DURATION_DAYS || "7", 10) || 7;
    const expiresAt = new Date(Date.now() + sessionDurationDays * 24 * 60 * 60 * 1000);

    const { data: newSession, error } = await supabase
      .from("auth_sessions")
      .insert({
        account_id: accountId,
        device_id: deviceId,
        device_name: deviceName,
        device_type: deviceType,
        browser_name: browserName,
        browser_version: browserVersion,
        os,
        ip_address: ip,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error || !newSession) {
      console.error("[Auth] Error creando sesión:", error);
      return null;
    }

    return newSession.id;
  } catch (err) {
    console.error("[Auth] Excepción al crear sesión:", err);
    return null;
  }
}

/**
 * Deshabilitar la cuenta de un usuario (solo Owner).
 * Mantiene los datos pero impide login.
 *
 * @param accountId ID de la cuenta a deshabilitar
 */
export async function disableAccount(accountId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("auth_accounts")
      .update({ status: "disabled" })
      .eq("id", accountId);

    if (error) {
      console.error("[Auth] Error deshabilitando cuenta:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Auth] Excepción al deshabilitar cuenta:", err);
    return false;
  }
}

/**
 * Habilitar la cuenta de un usuario.
 *
 * @param accountId ID de la cuenta a habilitar
 */
export async function enableAccount(accountId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("auth_accounts")
      .update({ status: "active" })
      .eq("id", accountId);

    if (error) {
      console.error("[Auth] Error habilitando cuenta:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Auth] Excepción al habilitar cuenta:", err);
    return false;
  }
}

/**
 * Cambiar el rol de una cuenta (solo Owner).
 *
 * @param accountId ID de la cuenta
 * @param roleId Nuevo rol
 */
export async function updateAccountRole(
  accountId: string,
  roleId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("auth_accounts")
      .update({ role_id: roleId })
      .eq("id", accountId);

    if (error) {
      console.error("[Auth] Error actualizando rol:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Auth] Excepción al actualizar rol:", err);
    return false;
  }
}
