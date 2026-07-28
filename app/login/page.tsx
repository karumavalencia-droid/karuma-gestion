"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

const checkboxRowClass =
  "flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-gray-700";
const checkboxClass =
  "h-4 w-4 shrink-0 rounded border-gray-300 text-karuma-600 focus:ring-karuma-500";

type Mode = "empleado" | "oficina" | "admin";
type OtpStep = "phone" | "code";
type AdminStep = "creds" | "code";

/**
 * Datos recordados en el navegador para no reescribirlos en cada login.
 * Solo identificadores (usuario / teléfono / última pestaña): nunca la
 * contraseña ni el PIN — de eso se encarga el gestor de contraseñas.
 */
const REMEMBER_KEYS = {
  mode: "karuma:login:mode",
  adminUser: "karuma:login:admin-user",
  phone: "karuma:login:phone",
} as const;

function remember(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Safari en modo privado puede bloquear localStorage: no es crítico.
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [mode, setMode] = useState<Mode>("empleado");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OTP login state
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState<number | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Admin (2FA) login state
  const [adminStep, setAdminStep] = useState<AdminStep>("creds");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminPhoneHint, setAdminPhoneHint] = useState("");
  const [adminExpiresIn, setAdminExpiresIn] = useState<number | null>(null);

  // "Recordar este dispositivo 30 días" (salta el segundo factor).
  const [trustDevice, setTrustDevice] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  // Rehidratar lo recordado. En un efecto (no en el estado inicial) para no
  // romper la hidratación: el servidor no ve el localStorage.
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(REMEMBER_KEYS.mode);
      if (savedMode === "empleado" || savedMode === "oficina" || savedMode === "admin") {
        setMode(savedMode);
      }
      setAdminUser(localStorage.getItem(REMEMBER_KEYS.adminUser) ?? "");
      setPhone(localStorage.getItem(REMEMBER_KEYS.phone) ?? "");
    } catch {
      // localStorage no disponible: se entra escribiéndolo todo, como antes.
    }
  }, []);

  /**
   * Navegación dura tras un login correcto.
   *
   * Con `router.push` la página nunca recarga y Chrome/Safari no llegan a
   * registrar que se ha enviado un formulario de acceso, así que no ofrecen
   * guardar la contraseña. Con una navegación real, sí.
   */
  const finishLogin = (destination: string) => {
    window.location.assign(destination);
  };

  // Employee PIN login
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const loggedIn = await login(pin, pin);
    setSubmitting(false);

    if (!loggedIn) {
      setError("PIN incorrecto. Pide tu PIN al encargado.");
      return;
    }

    remember(REMEMBER_KEYS.mode, "empleado");
    finishLogin(getDefaultRoute(loggedIn.role, loggedIn.employeeId));
  };

  // OTP login: request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Error solicitando OTP");
        setOtpLoading(false);
        return;
      }

      remember(REMEMBER_KEYS.mode, "oficina");
      remember(REMEMBER_KEYS.phone, phone);

      // Dispositivo de confianza: el servidor ya ha creado la sesión, no hay
      // código que pedir.
      if (data.trustedDevice) {
        finishLogin(getDefaultRoute(data.user.role, null));
        return;
      }

      // OTP enviado correctamente
      setOtpExpiresIn(data.expiresIn);
      setOtpStep("code");

      // Countdown timer
      if (data.expiresIn) {
        let remaining = data.expiresIn;
        const timer = setInterval(() => {
          remaining--;
          setOtpExpiresIn(remaining);
          if (remaining <= 0) clearInterval(timer);
        }, 1000);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  // OTP login: verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode, trustDevice }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "OTP inválido");
        setOtpLoading(false);
        return;
      }

      // Si es nuevo usuario, redirigir a registro
      if (data.isNewUser) {
        // TODO: implementar página de registro
        router.push(`/auth/complete-profile?phone=${encodeURIComponent(phone)}`);
        return;
      }

      // Login exitoso - la cookie se estableció automáticamente
      finishLogin(getDefaultRoute(data.user.role, null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Admin: paso 1 — usuario + contraseña → envía código SMS
  const handleAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminUser, password: adminPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }

      remember(REMEMBER_KEYS.mode, "admin");
      remember(REMEMBER_KEYS.adminUser, adminUser);

      if (data.requiresOtp) {
        setAdminPhoneHint(data.phoneHint || "");
        setAdminExpiresIn(data.expiresIn ?? null);
        setAdminStep("code");

        if (data.expiresIn) {
          let remaining = data.expiresIn;
          const timer = setInterval(() => {
            remaining--;
            setAdminExpiresIn(remaining);
            if (remaining <= 0) clearInterval(timer);
          }, 1000);
        }
        return;
      }

      // Dispositivo de confianza (o dev sin 2FA): sesión creada directamente.
      if (data.role) {
        finishLogin(getDefaultRoute(data.role, data.employeeId ?? null));
        return;
      }

      setError("Respuesta inesperada del servidor");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Admin: paso 2 — código SMS → sesión
  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/login/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          code: adminCode,
          trustDevice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      finishLogin(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  const formHandler =
    mode === "empleado"
      ? handleEmployeeSubmit
      : mode === "oficina"
        ? otpStep === "phone"
          ? handleRequestOtp
          : handleVerifyOtp
        : adminStep === "creds"
          ? handleAdminCreds
          : handleAdminVerify;

  const submitLabel = otpLoading
    ? "Verificando..."
    : mode === "empleado"
      ? "Entrar"
      : mode === "oficina"
        ? otpStep === "phone"
          ? "Enviar código"
          : "Verificar"
        : adminStep === "creds"
          ? "Continuar"
          : "Verificar";

  const trustDeviceCheckbox = (
    <label className={checkboxRowClass}>
      <input
        type="checkbox"
        name="trust-device"
        checked={trustDevice}
        onChange={(e) => setTrustDevice(e.target.checked)}
        className={checkboxClass}
      />
      <span>
        Recordar este dispositivo 30 días
        <span className="block text-xs text-gray-500">
          No te pediremos el código SMS en este navegador.
        </span>
      </span>
    </label>
  );

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-karuma-600 text-lg font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-bold text-gray-900">Karuma ERP</h1>
          <p className="mt-1 text-sm text-gray-500">Elige cómo quieres entrar</p>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1">
          {(
            [
              { id: "empleado" as Mode, label: "Empleado" },
              { id: "oficina" as Mode, label: "Oficina" },
              { id: "admin" as Mode, label: "Admin" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setError("");
              }}
              className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={formHandler} className="space-y-4">
          {mode === "empleado" ? (
            <>
              <label className="block space-y-1.5" htmlFor="pin">
                <span className="text-sm font-medium text-gray-700">PIN de empleado</span>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                  placeholder="••••"
                  // `section-empleado` mantiene el PIN en un llavero aparte del
                  // de la contraseña de admin, para que no se autorrellenen
                  // el uno con el otro.
                  autoComplete="section-empleado current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Entra con tu PIN para fichar y ver tu horario.
              </p>
            </>
          ) : mode === "oficina" ? (
            otpStep === "phone" ? (
              <>
                <label className="block space-y-1.5" htmlFor="phone">
                  <span className="text-sm font-medium text-gray-700">Número de teléfono</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="+34 600 123 456"
                    autoComplete="tel username"
                    required
                  />
                </label>
                {trustDeviceCheckbox}
                <p className="text-center text-xs text-gray-500">
                  Recibirás un código de 6 dígitos por SMS.
                </p>
              </>
            ) : (
              <>
                <label className="block space-y-1.5" htmlFor="otp-code">
                  <span className="text-sm font-medium text-gray-700">Código de verificación</span>
                  <input
                    id="otp-code"
                    name="otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} text-center text-3xl tracking-[0.3em] font-mono`}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                {trustDeviceCheckbox}
                <p className="text-center text-xs text-gray-500">
                  {otpExpiresIn ? `Válido por ${otpExpiresIn}s` : "Código expirado, solicita uno nuevo"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("phone");
                    setOtpCode("");
                    setOtpExpiresIn(null);
                  }}
                  className="w-full text-center text-xs text-karuma-600 hover:text-karuma-700 underline"
                >
                  ← Cambiar número
                </button>
              </>
            )
          ) : adminStep === "creds" ? (
            <>
              <label className="block space-y-1.5" htmlFor="admin-username">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5" htmlFor="admin-password">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  required
                />
              </label>
              {trustDeviceCheckbox}
              <p className="text-center text-xs text-gray-500">
                Tras la contraseña recibirás un código SMS de verificación.
              </p>
            </>
          ) : (
            <>
              <label className="block space-y-1.5" htmlFor="admin-code">
                <span className="text-sm font-medium text-gray-700">Código SMS</span>
                <input
                  id="admin-code"
                  name="admin-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} text-center text-3xl tracking-[0.3em] font-mono`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              {trustDeviceCheckbox}
              <p className="text-center text-xs text-gray-500">
                Código enviado a {adminPhoneHint || "tu teléfono"}.
                {adminExpiresIn ? ` Válido por ${adminExpiresIn}s.` : " Código expirado, vuelve a empezar."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAdminStep("creds");
                  setAdminCode("");
                  setAdminExpiresIn(null);
                  setError("");
                }}
                className="w-full text-center text-xs text-karuma-600 hover:text-karuma-700 underline"
              >
                ← Volver
              </button>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || otpLoading}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
