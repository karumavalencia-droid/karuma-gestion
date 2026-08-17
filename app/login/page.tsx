"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type Mode = "empleado" | "oficina" | "admin";
type OtpStep = "phone" | "code";
type AdminStep = "creds" | "code";

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
  const [officeUser, setOfficeUser] = useState("");
  const [officePass, setOfficePass] = useState("");

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  // Employee PIN login (unchanged)
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

    router.push(getDefaultRoute(loggedIn.role, loggedIn.employeeId));
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
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login/oficina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: officeUser, password: officePass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }
      if (!data.role) {
        setError("Respuesta inesperada del servidor");
        return;
      }
      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
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
        body: JSON.stringify({ phone, code: otpCode }),
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
      router.push(getDefaultRoute(data.user.role, null));
    } catch (err) {
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

      // Sin 2FA configurado (solo desarrollo): sesión creada directamente.
      if (data.role) {
        window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
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
        body: JSON.stringify({ username: adminUser, password: adminPass, code: adminCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      // Recarga completa para que AuthProvider lea la nueva sesión.
      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
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
        ? handleOfficeSubmit
        : adminStep === "creds"
          ? handleAdminCreds
          : handleAdminVerify;

  const submitLabel = otpLoading
    ? "Verificando..."
    : mode === "empleado"
      ? "Entrar"
      : mode === "oficina"
        ? "Entrar en Oficina"
        : adminStep === "creds"
          ? "Continuar"
          : "Verificar";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#10151c] p-4 sm:p-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-700 bg-[#19212b] text-white shadow-2xl lg:grid lg:grid-cols-[.8fr_1.2fr]">
        <div className="hidden flex-col justify-between bg-[#263441] p-10 lg:flex">
          <div><div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e05a3f] text-xl font-bold">K</div><p className="text-xs uppercase tracking-[0.25em] text-slate-400">Karuma ERP</p><h2 className="mt-5 text-4xl font-semibold leading-tight">Todo lo que necesitas para que el servicio fluya.</h2></div>
          <p className="text-sm leading-6 text-slate-400">Acceso seguro para el equipo Karuma.<br />Tu rol determina las herramientas disponibles.</p>
        </div>
        <div className="p-6 sm:p-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e05a3f] text-lg font-bold text-white lg:hidden">
            K
          </div>
          <h1 className="text-xl font-bold text-white">Acceso interno</h1>
          <p className="mt-1 text-sm text-slate-400">Elige tu espacio de trabajo</p>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl bg-[#10151c] p-1">
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
                  ? "bg-[#e05a3f] text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={formHandler} className="space-y-4">
          {mode === "empleado" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">PIN de empleado</span>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-center text-2xl tracking-[0.5em] text-white`}
                  placeholder="••••"
                  autoComplete="off"
                  required
                />
              </label>
              <p className="text-center text-xs text-slate-400">
                Entra con tu PIN para fichar y ver tu horario.
              </p>
            </>
          ) : mode === "oficina" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">Cuenta de Oficina</span>
                <input
                  type="text"
                  value={officeUser}
                  onChange={(e) => setOfficeUser(e.target.value)}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-white`}
                  placeholder="oficina"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">Contraseña</span>
                <input
                  type="password"
                  value={officePass}
                  onChange={(e) => setOfficePass(e.target.value)}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-white`}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-slate-400">
                Acceso operativo para reservas, inventario y gestión diaria.
              </p>
            </>
          ) : adminStep === "creds" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">Usuario</span>
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-white`}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">Contraseña</span>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-white`}
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-slate-400">
                Tras la contraseña recibirás un código SMS de verificación.
              </p>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-200">Código SMS</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} border-slate-600 bg-[#10151c] text-center text-3xl tracking-[0.3em] font-mono text-white`}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <p className="text-center text-xs text-slate-400">
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
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#e05a3f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#c94731] disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}
