"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDefaultRoute } from "@/lib/auth/permissions";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type Mode = "empleado" | "oficina" | "admin";
type EmployeeStep = "password" | "pin" | "reset-email" | "reset-code";
type AdminStep = "creds" | "code";
/** Por dónde le ha llegado el código al admin. */
type Canal = "email" | "sms";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [mode, setMode] = useState<Mode>("empleado");
  const [pin, setPin] = useState("");
  const [employeeStep, setEmployeeStep] = useState<EmployeeStep>("password");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetVerificationId, setResetVerificationId] = useState("");
  const [resetEmailHint, setResetEmailHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [officeUser, setOfficeUser] = useState("oficina");
  const [officePass, setOfficePass] = useState("");

  const [adminStep, setAdminStep] = useState<AdminStep>("creds");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [adminChannel, setAdminChannel] = useState<Canal>("email");
  const [adminDestHint, setAdminDestHint] = useState("");
  const [adminExpiresIn, setAdminExpiresIn] = useState<number | null>(null);

  useEffect(() => {
    if (ready && user) {
      router.replace(getDefaultRoute(user.role, user.employeeId));
    }
  }, [ready, user, router]);

  const handleEmployeePinSubmit = async (e: React.FormEvent) => {
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

  const handleEmployeePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: employeeEmail, password: employeePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Correo o contraseña incorrectos");
      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión");
    } finally { setSubmitting(false); }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: employeeEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el código");
      setResetVerificationId(data.verificationId);
      setResetEmailHint(data.emailHint || employeeEmail);
      setEmployeeStep("reset-code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión");
    } finally { setSubmitting(false); }
  };

  const handleResetComplete = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (resetPassword !== resetPasswordConfirm) return setError("Las contraseñas no coinciden.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: employeeEmail, verificationId: resetVerificationId,
          code: resetCode, password: resetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");
      window.location.assign(getDefaultRoute(data.role || "waiter", data.employeeId ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de conexión");
    } finally { setSubmitting(false); }
  };

  const handleOfficeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: officeUser, password: officePass }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Usuario o contraseña incorrectos");
        return;
      }

      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

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
        setAdminChannel(data.channel === "sms" ? "sms" : "email");
        setAdminDestHint(data.destinationHint || data.phoneHint || "");
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

      if (data.role) {
        window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
        return;
      }

      setError("Respuesta inesperada del servidor");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass,
          code: adminCode,
          channel: adminChannel,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      window.location.assign(getDefaultRoute(data.role, data.employeeId ?? null));
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const formHandler =
    mode === "empleado"
      ? employeeStep === "pin"
        ? handleEmployeePinSubmit
        : employeeStep === "reset-email"
          ? handleResetRequest
          : employeeStep === "reset-code"
            ? handleResetComplete
            : handleEmployeePasswordSubmit
      : mode === "oficina"
        ? handleOfficeSubmit
        : adminStep === "creds"
          ? handleAdminCreds
          : handleAdminVerify;

  const submitLabel = submitting
    ? "Verificando..."
    : mode === "empleado"
      ? employeeStep === "pin"
        ? "Entrar con PIN"
        : employeeStep === "reset-email"
          ? "Enviar código"
          : employeeStep === "reset-code"
            ? "Guardar contraseña"
            : "Entrar"
      : mode === "oficina"
        ? "Entrar a Oficina"
        : adminStep === "creds"
          ? "Continuar"
          : "Verificar";

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
          {[
            { id: "empleado" as Mode, label: "Empleado" },
            { id: "oficina" as Mode, label: "Oficina" },
            { id: "admin" as Mode, label: "Admin" },
          ].map((t) => (
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
              {employeeStep === "pin" ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">PIN de empleado</span>
                    <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8}
                      value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                      placeholder="••••" autoComplete="off" required />
                  </label>
                  <p className="text-center text-xs text-gray-500">
                    Solo para activar la cuenta por primera vez. Después, el PIN dejará de funcionar.
                  </p>
                  <button type="button" onClick={() => { setEmployeeStep("password"); setError(""); }}
                    className="w-full text-center text-xs text-karuma-600 underline">Ya tengo contraseña</button>
                </>
              ) : employeeStep === "reset-code" ? (
                <>
                  <p className="text-center text-sm text-gray-600">Código enviado a {resetEmailHint}.</p>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Código de 6 cifras</span>
                    <input value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                      className={`${inputClass} text-center text-2xl tracking-[0.35em]`} inputMode="numeric"
                      autoComplete="one-time-code" maxLength={6} required />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Nueva contraseña</span>
                    <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                      className={inputClass} autoComplete="new-password" minLength={8} required />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Repite la contraseña</span>
                    <input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      className={inputClass} autoComplete="new-password" minLength={8} required />
                  </label>
                  <p className="text-center text-xs text-gray-500">Mínimo 8 caracteres, con una letra y un número.</p>
                </>
              ) : (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-gray-700">Correo personal</span>
                    <input type="email" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)}
                      className={inputClass} autoComplete="username" required />
                  </label>
                  {employeeStep === "password" && (
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-gray-700">Contraseña</span>
                      <input type="password" value={employeePassword} onChange={(e) => setEmployeePassword(e.target.value)}
                        className={inputClass} autoComplete="current-password" required />
                    </label>
                  )}
                  <p className="text-center text-xs text-gray-500">
                    {employeeStep === "reset-email"
                      ? "Te enviaremos un código para crear una contraseña nueva."
                      : "Tu nómina solo se abre con tu cuenta personal."}
                  </p>
                  {employeeStep === "password" && (
                    <div className="flex justify-between gap-3 text-xs">
                      <button type="button" onClick={() => { setEmployeeStep("pin"); setError(""); }}
                        className="text-karuma-600 underline">Primera vez: usar PIN</button>
                      <button type="button" onClick={() => { setEmployeeStep("reset-email"); setError(""); }}
                        className="text-karuma-600 underline">Olvidé mi contraseña</button>
                    </div>
                  )}
                  {employeeStep === "reset-email" && (
                    <button type="button" onClick={() => { setEmployeeStep("password"); setError(""); }}
                      className="w-full text-center text-xs text-karuma-600 underline">← Volver al login</button>
                  )}
                </>
              )}
            </>
          ) : mode === "oficina" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  type="text"
                  value={officeUser}
                  onChange={(e) => setOfficeUser(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <input
                  type="password"
                  value={officePass}
                  onChange={(e) => setOfficePass(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Acceso de oficina para la gestión diaria. Permisos limitados frente a Admin.
              </p>
            </>
          ) : adminStep === "creds" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Usuario</span>
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  required
                />
              </label>
              <p className="text-center text-xs text-gray-500">
                Tras la contraseña recibirás un código de verificación por correo.
              </p>
            </>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">
                  {adminChannel === "sms" ? "Código SMS" : "Código por correo"}
                </span>
                <input
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
              <p className="text-center text-xs text-gray-500">
                Código enviado a{" "}
                {adminDestHint || (adminChannel === "sms" ? "tu teléfono" : "tu correo")}.
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
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
